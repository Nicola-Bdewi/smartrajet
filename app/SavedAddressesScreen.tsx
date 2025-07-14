import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    ActivityIndicator,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert, // Used for user feedback
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import Constants from 'expo-constants';
import {
    format,
    parseISO,
    differenceInDays,
    startOfDay, // For normalizing dates to the beginning of the day
    endOfDay,   // For normalizing dates to the end of the day
    isValid,    // To check if a date object is valid
} from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

// --- Interfaces ---
interface Entrave {
    _id: number;
    id: string;
    permit_permit_id: string;
    boroughid: string;
    permitcategory: string;
    currentstatus: string;
    duration_start_date: string; // Expected format: "YYYY-MM-DD" (e.g., "2025-07-15")
    duration_end_date: string;   // Expected format: "YYYY-MM-DD"
    reason_category: string;
    occupancy_name: string;
    organizationname: string;
}

// --- Custom Hooks ---

/**
 * Debounces a value, returning the value only after a specified delay.
 * Useful for delaying reactions to user input (like search text).
 */
function useDebouncedValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Fetches construction data from the configured API URL.
 */
function useConstructionData() {
    const [entraves, setEntraves] = useState<Entrave[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Access ENTRAVES_URL from your app.config.js or app.json's "extra" section
    const { ENTRAVES_URL } = Constants.expoConfig?.extra || {};

    useEffect(() => {
        if (!ENTRAVES_URL) {
            console.warn('ENTRAVES_URL is missing in app.config.js "extra" section.');
            setError('Configuration Error: API URL is not defined.');
            setLoading(false);
            return;
        }

        const fetchEntraves = async () => {
            setLoading(true);
            setError(null); // Clear any previous errors

            try {
                const res = await fetch(ENTRAVES_URL);
                if (!res.ok) { // Check for HTTP errors (e.g., 404, 500)
                    throw new Error(`HTTP error! Status: ${res.status}`);
                }
                const json = await res.json();
                // Basic validation of the API response structure
                if (json.result && Array.isArray(json.result.records)) {
                    setEntraves(json.result.records as Entrave[]);
                } else {
                    throw new Error('Invalid data structure received from API.');
                }
            } catch (err: any) {
                console.error('Error loading entraves:', err);
                setError(`Failed to load data: ${err.message || 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };

        fetchEntraves();
        // Depend on ENTRAVES_URL to refetch if the URL ever changes (unlikely in production)
    }, [ENTRAVES_URL]);

    return { entraves, loading, error };
}

// --- Helper Function for Robust Date Parsing ---
/**
 * Parses a "YYYY-MM-DD" string into a Date object, treating it as a local date
 * to avoid timezone conversion issues that parseISO can sometimes introduce
 * when no time or timezone information is present in the string.
 * This ensures consistency with dates picked from DateTimePickerModal.
 */
const parseYYYYMMDDAsLocalDate = (dateString: string): Date | null => {
    if (!dateString || typeof dateString !== 'string') {
        return null;
    }
    const parts = dateString.split('-'); // e.g., ["2025", "07", "15"]
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed (January is 0)
        const day = parseInt(parts[2], 10);

        // Create a new Date object directly using the local time constructor.
        // This sets the time to 00:00:00 of that day in the local timezone.
        const date = new Date(year, month, day);

        // Basic validation: Check if the constructed date matches the input parts
        // to catch cases like new Date(2025, 1, 30) where Feb only has 28 days
        if (isValid(date) && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            return date;
        }
    }
    // Fallback for unexpected formats or if manual parsing fails
    const fallbackDate = parseISO(dateString);
    return isValid(fallbackDate) ? fallbackDate : null;
};


// --- Main Construction Analysis Screen Component ---
export default function ConstructionAnalysisScreen() {
    const { entraves, loading, error } = useConstructionData();

    // State for Borough Dropdown
    const [boroughOpen, setBoroughOpen] = useState(false);
    const [boroughValue, setBoroughValue] = useState<string | null>(null);
    const [boroughItems, setBoroughItems] = useState<{ label: string; value: string }[]>([]);

    // State for Search Text Input
    const [searchText, setSearchText] = useState('');
    const debouncedSearchText = useDebouncedValue(searchText, 300); // Debounce search input for performance

    // State for Date Pickers
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
    const [isEndDatePickerVisible, setEndDatePickerVisible] = useState(false);

    // State for Filtered Results and Filter Status
    const [filteredEntraves, setFilteredEntraves] = useState<Entrave[]>([]);
    const [hasFiltered, setHasFiltered] = useState(false); // Indicates if filters have been applied at least once

    // Effect to populate Borough Dropdown items once data is loaded
    useEffect(() => {
        if (!loading && entraves.length > 0) {
            const boroughSet = new Set<string>();
            entraves.forEach((e) => {
                if (e.boroughid) boroughSet.add(e.boroughid.trim());
            });
            const boroughList = Array.from(boroughSet)
                .sort()
                .map((b) => ({ label: b, value: b }));
            setBoroughItems(boroughList);
        }
    }, [loading, entraves]);

    /**
     * Applies all selected filters to the entraves data.
     */
    const applyFilters = useCallback(() => {
        // User feedback if no filters are selected
        if (!boroughValue && !debouncedSearchText.trim() && !startDate && !endDate) {
            Alert.alert(
                'Aucun filtre sélectionné',
                'Veuillez sélectionner au moins un critère de filtre pour lancer la recherche.',
                [{ text: 'OK' }]
            );
            return;
        }

        let currentResults = entraves; // Start with the full, unfiltered dataset

        // --- 1. Filter by Borough ---
        if (boroughValue) {
            currentResults = currentResults.filter((e) => e.boroughid?.trim() === boroughValue);
        }

        // --- 2. Filter by Search Text (Occupancy Name or Organization Name) ---
        if (debouncedSearchText.trim()) {
            const searchLower = debouncedSearchText.toLowerCase();
            currentResults = currentResults.filter(
                (e) =>
                    e.occupancy_name?.toLowerCase().includes(searchLower) ||
                    e.organizationname?.toLowerCase().includes(searchLower)
            );
        }

        // --- 3. Filter by Date Range ---
        if (startDate || endDate) {
            const filterStartDate = startDate ? startOfDay(startDate) : null;
            const filterEndDate = endDate ? startOfDay(endDate) : null; // also startOfDay to match exact day (ignore time)

            currentResults = currentResults.filter((entrave) => {
                const constructionStartDate = startOfDay(parseYYYYMMDDAsLocalDate(entrave.duration_start_date) || new Date(0));
                const constructionEndDate = startOfDay(parseYYYYMMDDAsLocalDate(entrave.duration_end_date) || new Date(0));

                if (!isValid(constructionStartDate) || !isValid(constructionEndDate)) {
                    return false;
                }

                // Exact match for startDate if provided
                if (filterStartDate && constructionStartDate.getTime() !== filterStartDate.getTime()) {
                    return false;
                }

                // Exact match for endDate if provided
                if (filterEndDate && constructionEndDate.getTime() !== filterEndDate.getTime()) {
                    return false;
                }

                return true;
            });
        }


        setFilteredEntraves(currentResults);
        setHasFiltered(true); // Mark that filters have been applied
    }, [entraves, boroughValue, debouncedSearchText, startDate, endDate]); // Dependencies for useCallback

    /**
     * Clears all filter selections and resets the displayed results.
     */
    const clearFilters = useCallback(() => {
        setBoroughValue(null);
        setSearchText('');
        setStartDate(null);
        setEndDate(null);
        setFilteredEntraves([]); // Clear filtered results display
        setHasFiltered(false); // Reset filter status
    }, []);

    // --- Statistics Calculations (memoized for performance) ---

    // Total number of filtered entraves
    const totalEntraves = filteredEntraves.length;

    // Average duration of filtered entraves
    const averageDuration = useCallback(() => {
        if (totalEntraves === 0) return 0;
        const totalDays = filteredEntraves.reduce((acc, cur) => {
            const start = parseYYYYMMDDAsLocalDate(cur.duration_start_date);
            const end = parseYYYYMMDDAsLocalDate(cur.duration_end_date);
            if (start && end && isValid(start) && isValid(end)) {
                return acc + differenceInDays(end, start);
            }
            return acc; // Skip entraves with invalid dates in duration calculation
        }, 0);
        return (totalDays / totalEntraves).toFixed(1);
    }, [filteredEntraves, totalEntraves]);

    // Top 5 boroughs by number of entraves in the filtered results
    const topBoroughs = useCallback(() => {
        const boroughCounts: Record<string, number> = {};
        filteredEntraves.forEach((e) => {
            const b = e.boroughid?.trim() || 'Inconnu'; // Handle potentially missing boroughid
            boroughCounts[b] = (boroughCounts[b] || 0) + 1;
        });
        return Object.entries(boroughCounts)
            .sort(([, a], [, b]) => b - a) // Sort descending by count
            .slice(0, 5); // Take top 5
    }, [filteredEntraves]);

    // --- Conditional Rendering for Loading/Error States ---
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#1976D2" />
                <Text style={styles.loadingText}>Chargement des données...</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>Erreur: {error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={useConstructionData}>
                    <Text style={styles.buttonText}>Réessayer</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // --- Main Component Render ---
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardAvoidingView}
            >
                <Text style={styles.title}>Filtrer les travaux de construction</Text>

                {/* Borough Dropdown Picker */}
                <DropDownPicker
                    open={boroughOpen}
                    value={boroughValue}
                    items={boroughItems}
                    setOpen={setBoroughOpen}
                    setValue={setBoroughValue}
                    setItems={setBoroughItems}
                    placeholder="Sélectionnez un arrondissement"
                    searchable
                    searchPlaceholder="Chercher un arrondissement..."
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    listMode="MODAL" // Using modal for better user experience on mobile for large lists
                    modalTitle="Choisissez un arrondissement"
                    zIndex={3000} // Ensures dropdown appears above other content
                    zIndexInverse={1000}
                />

                {/* Search Text Input */}
                <TextInput
                    style={styles.input}
                    placeholder="Rechercher par nom d'occupation ou organisation"
                    value={searchText}
                    onChangeText={setSearchText}
                    returnKeyType="search"
                    blurOnSubmit
                />

                {/* Date Picker Buttons */}
                <View style={styles.dateRow}>
                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setStartDatePickerVisible(true)}
                    >
                        <Text style={styles.datePickerText}>
                            {startDate ? `Début: ${format(startDate, 'dd/MM/yyyy')}` : 'Date début'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setEndDatePickerVisible(true)}
                    >
                        <Text style={styles.datePickerText}>
                            {endDate ? `Fin: ${format(endDate, 'dd/MM/yyyy')}` : 'Date fin'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Start Date Picker Modal */}
                <DateTimePickerModal
                    isVisible={isStartDatePickerVisible}
                    mode="date"
                    onConfirm={(date) => {
                        setStartDate(date);
                        setStartDatePickerVisible(false);
                    }}
                    onCancel={() => setStartDatePickerVisible(false)}
                    // Prevents selecting a start date after the currently selected end date
                    maximumDate={endDate || undefined}
                />

                {/* End Date Picker Modal */}
                <DateTimePickerModal
                    isVisible={isEndDatePickerVisible}
                    mode="date"
                    onConfirm={(date) => {
                        setEndDate(date);
                        setEndDatePickerVisible(false);
                    }}
                    onCancel={() => setEndDatePickerVisible(false)}
                    // Prevents selecting an end date before the currently selected start date
                    minimumDate={startDate || undefined}
                    // Typically, you wouldn't pick an end date beyond today for past/current events
                    maximumDate={new Date()}
                />

                {/* Action Buttons: Apply Filters and Clear Filters */}
                <View style={styles.buttonsRow}>
                    <TouchableOpacity style={styles.button} onPress={applyFilters}>
                        <Text style={styles.buttonText}>Appliquer les filtres</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, styles.clearButton]}
                        onPress={clearFilters}
                    >
                        <Text style={[styles.buttonText, { color: '#1976D2' }]}>Réinitialiser</Text>
                    </TouchableOpacity>
                </View>

                {/* Filtered Results Display Area */}
                {hasFiltered ? (
                    <FlatList
                        ListHeaderComponent={
                            <>
                                <Text style={styles.statsTitle}>Statistiques des résultats</Text>

                                {totalEntraves === 0 ? (
                                    <Text style={styles.noResultsText}>
                                        Aucun résultat ne correspond aux critères sélectionnés.
                                    </Text>
                                ) : (
                                    <>
                                        <View style={styles.statBox}>
                                            <Text style={styles.statLabel}>Nombre total de travaux actifs:</Text>
                                            <Text style={styles.statValue}>{totalEntraves}</Text>
                                        </View>

                                        <View style={styles.statBox}>
                                            <Text style={styles.statLabel}>Durée moyenne (en jours):</Text>
                                            <Text style={styles.statValue}>{averageDuration()}</Text>
                                        </View>

                                        <View style={styles.statBox}>
                                            <Text style={styles.statLabel}>Top 5 des arrondissements:</Text>
                                            {topBoroughs().map(([borough, count]) => (
                                                <Text key={borough} style={styles.topBoroughItem}>{borough}: {count}</Text>
                                            ))}
                                        </View>

                                        <Text style={styles.listTitle}>Liste des travaux filtrés:</Text>
                                    </>
                                )}
                            </>
                        }
                        data={filteredEntraves}
                        // Ensure keyExtractor returns a unique string
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.entraveItem}>
                                <Text style={styles.entraveTitle}>
                                    {item.occupancy_name || 'N/A'} - {item.organizationname || 'N/A'}
                                </Text>
                                <Text>Arrondissement: {item.boroughid || 'N/A'}</Text>
                                <Text>
                                    {/* Format dates for display, using the same parsing logic */}
                                    {parseYYYYMMDDAsLocalDate(item.duration_start_date) ? format(parseYYYYMMDDAsLocalDate(item.duration_start_date)!, 'dd/MM/yyyy') : 'Date début invalide'} -
                                    {parseYYYYMMDDAsLocalDate(item.duration_end_date) ? format(parseYYYYMMDDAsLocalDate(item.duration_end_date)!, 'dd/MM/yyyy') : 'Date fin invalide'}
                                </Text>
                                <Text>Statut: {item.currentstatus || 'N/A'}</Text>
                                <Text>Catégorie: {item.permitcategory || 'N/A'}</Text>
                            </View>
                        )}
                        // Center content if no results
                        contentContainerStyle={totalEntraves === 0 ? { flexGrow: 1, justifyContent: 'center' } : {}}
                    />
                ) : (
                    <Text style={styles.promptText}>
                        Veuillez appliquer des filtres pour voir les résultats.
                    </Text>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5', // Light grey background for a modern look
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    title: {
        marginTop: Platform.OS === 'ios' ? 0 : 20, // Adjust spacing for iOS SafeArea
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1976D2', // Deep blue color
        marginBottom: 20,
    },
    dropdown: {
        marginBottom: 16,
        borderColor: '#ccc',
        borderRadius: 8,
    },
    dropdownContainer: {
        borderColor: '#ccc',
        borderRadius: 8,
        zIndex: 2000, // Ensures the dropdown list is visually above other elements
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 16,
        backgroundColor: '#fff', // White background for input
        fontSize: 16,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    datePickerButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 4,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    datePickerText: {
        color: '#555',
        fontSize: 16,
    },
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    button: {
        flex: 1,
        backgroundColor: '#1976D2', // Primary blue
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
        elevation: 2, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    clearButton: {
        backgroundColor: '#e0e0e0', // Light grey for clear button
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    statsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#1976D2',
        textAlign: 'center',
    },
    statBox: {
        marginBottom: 10,
        backgroundColor: '#eaf4fd', // Very light blue for stat boxes
        padding: 15,
        borderRadius: 8,
        borderLeftWidth: 5, // Left border as an accent
        borderLeftColor: '#1976D2',
    },
    statLabel: {
        fontWeight: 'bold',
        fontSize: 15,
        marginBottom: 5,
        color: '#333',
    },
    statValue: {
        fontSize: 18,
        color: '#0d47a1', // Darker blue for emphasis
        fontWeight: '600',
    },
    topBoroughItem: {
        fontSize: 15,
        paddingVertical: 2,
        color: '#444',
    },
    listTitle: {
        fontWeight: 'bold',
        fontSize: 18,
        marginTop: 25,
        marginBottom: 15,
        textAlign: 'center',
        color: '#1976D2',
    },
    entraveItem: {
        backgroundColor: '#ffffff', // White background for each list item
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#42A5F5', // Lighter blue accent
        elevation: 1, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    entraveTitle: {
        fontWeight: 'bold',
        fontSize: 17,
        marginBottom: 5,
        color: '#333',
    },
    noResultsText: {
        textAlign: 'center',
        marginTop: 30,
        color: '#777',
        fontSize: 16,
        paddingHorizontal: 20,
    },
    promptText: {
        marginTop: 50,
        textAlign: 'center',
        color: '#777',
        fontSize: 16,
        paddingHorizontal: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
    errorText: {
        marginTop: 20,
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        paddingHorizontal: 20,
        fontWeight: 'bold',
    },
    retryButton: {
        marginTop: 20,
        backgroundColor: '#1976D2',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        alignSelf: 'center',
    },
});
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
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import Constants from 'expo-constants';
import { format, parseISO, differenceInDays, getDay, isWithinInterval, subMonths } from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface Entrave {
    _id: number;
    id: string;
    permit_permit_id: string;
    boroughid: string;
    permitcategory: string;
    currentstatus: string;
    duration_start_date: string;
    duration_end_date: string;
    reason_category: string;
    occupancy_name: string;
    organizationname: string;
}

function useConstructionData() {
    const [entraves, setEntraves] = useState<Entrave[]>([]);
    const [loading, setLoading] = useState(true);
    const { ENTRAVES_URL } = Constants.expoConfig?.extra || {};

    useEffect(() => {
        if (!ENTRAVES_URL) {
            console.warn('ENTRAVES_URL missing in env');
            setLoading(false);
            return;
        }
        (async () => {
            try {
                const res = await fetch(ENTRAVES_URL);
                const json = await res.json();
                setEntraves(json.result.records as Entrave[]);
            } catch (err) {
                console.warn('Error loading entraves', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [ENTRAVES_URL]);

    return { entraves, loading };
}

const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function ConstructionAnalysisScreen() {
    const { entraves, loading } = useConstructionData();

    // Filters
    const [boroughOpen, setBoroughOpen] = useState(false);
    const [boroughValue, setBoroughValue] = useState<string | null>(null);
    const [boroughItems, setBoroughItems] = useState<{ label: string; value: string }[]>([]);

    const [searchText, setSearchText] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    // Date picker visibility
    const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
    const [isEndDatePickerVisible, setEndDatePickerVisible] = useState(false);

    // Filter results & flag
    const [filteredEntraves, setFilteredEntraves] = useState<Entrave[]>([]);
    const [hasFiltered, setHasFiltered] = useState(false);

    // Setup borough items once data loaded
    useEffect(() => {
        if (!loading && entraves.length > 0) {
            const boroughSet = new Set<string>();
            entraves.forEach((e) => {
                if (e.boroughid) {
                    boroughSet.add(e.boroughid.trim());
                }
            });
            const boroughList = Array.from(boroughSet)
                .sort()
                .map((b) => ({ label: b, value: b }));
            setBoroughItems(boroughList);
        }
    }, [loading, entraves]);

    const applyFilters = () => {
        if (!boroughValue && !searchText.trim() && !startDate && !endDate) {
            alert('Veuillez sélectionner au moins un filtre.');
            return;
        }

        let results = entraves;

        if (boroughValue) {
            results = results.filter((e) => e.boroughid.trim() === boroughValue);
        }

        if (searchText.trim()) {
            const searchLower = searchText.toLowerCase();
            results = results.filter(
                (e) =>
                    e.occupancy_name.toLowerCase().includes(searchLower) ||
                    e.organizationname.toLowerCase().includes(searchLower)
            );
        }

        if (startDate) {
            results = results.filter(
                (e) => new Date(e.duration_end_date) >= startDate
            );
        }

        if (endDate) {
            results = results.filter(
                (e) => new Date(e.duration_start_date) <= endDate
            );
        }

        setFilteredEntraves(results);
        setHasFiltered(true);
    };

    const clearFilters = () => {
        setBoroughValue(null);
        setSearchText('');
        setStartDate(null);
        setEndDate(null);
        setFilteredEntraves([]);
        setHasFiltered(false);
    };

    // Analysis computations

    const totalEntraves = filteredEntraves.length;

    // Average duration days
    const averageDuration =
        totalEntraves === 0
            ? 0
            : (
                filteredEntraves.reduce((acc, cur) => {
                    const start = new Date(cur.duration_start_date);
                    const end = new Date(cur.duration_end_date);
                    return acc + differenceInDays(end, start);
                }, 0) / totalEntraves
            ).toFixed(1);

    // Top 5 boroughs by count
    const boroughCounts: Record<string, number> = {};
    filteredEntraves.forEach((e) => {
        const b = e.boroughid.trim() || 'Inconnu';
        boroughCounts[b] = (boroughCounts[b] || 0) + 1;
    });
    const topBoroughs = Object.entries(boroughCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    // Longest entrave(s)
    let maxDuration = 0;
    let longestEntraves: Entrave[] = [];
    filteredEntraves.forEach((e) => {
        const start = new Date(e.duration_start_date);
        const end = new Date(e.duration_end_date);
        const dur = differenceInDays(end, start);
        if (dur > maxDuration) {
            maxDuration = dur;
            longestEntraves = [e];
        } else if (dur === maxDuration) {
            longestEntraves.push(e);
        }
    });

    // Most frequent occupancy name
    const occupancyCounts: Record<string, number> = {};
    filteredEntraves.forEach((e) => {
        const occ = e.occupancy_name.trim() || 'Inconnu';
        occupancyCounts[occ] = (occupancyCounts[occ] || 0) + 1;
    });
    const maxOccCount = Math.max(...Object.values(occupancyCounts), 0);
    const mostFrequentOccupancies = Object.entries(occupancyCounts)
        .filter(([, count]) => count === maxOccCount)
        .map(([name]) => name);

    // Entraves active today (today between start and end)
    const today = new Date();
    const activeEntravesCount = filteredEntraves.filter((e) =>
        isWithinInterval(today, {
            start: new Date(e.duration_start_date),
            end: new Date(e.duration_end_date),
        })
    ).length;
    const activePercentage =
        totalEntraves === 0 ? 0 : ((activeEntravesCount / totalEntraves) * 100).toFixed(1);

    // Entrave count per month for last 6 months (by start date)
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
        const d = subMonths(today, i);
        return format(d, 'yyyy-MM');
    }).reverse();

    const monthCounts: Record<string, number> = {};
    filteredEntraves.forEach((e) => {
        try {
            const month = format(new Date(e.duration_start_date), 'yyyy-MM');
            monthCounts[month] = (monthCounts[month] || 0) + 1;
        } catch {
            // ignore invalid dates
        }
    });

    // Entrave counts per weekday (start date)
    const weekdayCounts: Record<string, number> = {};
    filteredEntraves.forEach((e) => {
        try {
            const dayIndex = getDay(new Date(e.duration_start_date));
            const dayName = dayNames[dayIndex];
            weekdayCounts[dayName] = (weekdayCounts[dayName] || 0) + 1;
        } catch {}
    });

    // Sort weekdays descending by count
    const sortedWeekdays = Object.entries(weekdayCounts).sort(([, a], [, b]) => b - a);

    // Render filters + analysis + list as FlatList
    // ListHeaderComponent contains filters + analysis summary

    const renderHeader = () => (
        <View>
            <Text style={styles.title}>Filtres</Text>
            <View style={{ padding: 16 }}>
            <DropDownPicker
                open={boroughOpen}
                value={boroughValue}
                items={boroughItems}
                setOpen={setBoroughOpen}
                setValue={setBoroughValue}
                setItems={setBoroughItems}
                placeholder="Sélectionnez un arrondissement"
                style={styles.dropdown}
                containerStyle={{ marginHorizontal: 15 }}
                searchable={true}
                searchPlaceholder="Rechercher un arrondissement..."
            />
            </View>

            <TextInput
                style={styles.input}
                placeholder="Recherche par nom d'occupation ou organisation"
                value={searchText}
                onChangeText={setSearchText}
            />

            <View style={styles.dateRow}>
                <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setStartDatePickerVisible(true)}
                >
                    <Text style={styles.datePickerText}>
                        {startDate ? format(startDate, 'dd/MM/yyyy') : 'Date de début'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setEndDatePickerVisible(true)}
                >
                    <Text style={styles.datePickerText}>
                        {endDate ? format(endDate, 'dd/MM/yyyy') : 'Date de fin'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.buttonsRow}>
                <TouchableOpacity style={styles.button} onPress={applyFilters}>
                    <Text style={styles.buttonText}>Appliquer les filtres</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.clearButton]}
                    onPress={clearFilters}
                >
                    <Text style={[styles.buttonText, { color: '#333' }]}>Effacer</Text>
                </TouchableOpacity>
            </View>

            {hasFiltered && (
                <>
                    <Text style={styles.statsTitle}>Analyse des travaux filtrés</Text>

                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Nombre total de travaux filtrés:</Text>
                        <Text style={styles.statValue}>{totalEntraves}</Text>
                        <Text style={styles.statExplanation}>
                            Nombre d'entraves correspondant aux critères choisis.
                        </Text>
                    </View>

                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Durée moyenne des travaux (en jours):</Text>
                        <Text style={styles.statValue}>{averageDuration}</Text>
                        <Text style={styles.statExplanation}>
                            Durée moyenne entre début et fin des travaux.
                        </Text>
                    </View>

                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Top 5 des arrondissements les plus affectés:</Text>
                        {topBoroughs.map(([borough, count]) => (
                            <Text key={borough} style={styles.statValue}>
                                {borough}: {count}
                            </Text>
                        ))}
                        <Text style={styles.statExplanation}>
                            Arrondissements avec le plus grand nombre de travaux filtrés.
                        </Text>
                    </View>

                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Entrave(s) la plus longue (en jours):</Text>
                        <Text style={styles.statValue}>{maxDuration}</Text>
                        {longestEntraves.map((e) => (
                            <Text key={e.id} style={styles.statValue}>
                                {e.occupancy_name} ({format(new Date(e.duration_start_date), 'dd/MM/yyyy')} -{' '}
                                {format(new Date(e.duration_end_date), 'dd/MM/yyyy')})
                            </Text>
                        ))}
                        <Text style={styles.statExplanation}>
                            Travaux avec la plus longue durée entre début et fin.
                        </Text>
                    </View>

                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Occupation la plus fréquente:</Text>
                        {mostFrequentOccupancies.map((name) => (
                            <Text key={name} style={styles.statValue}>
                                {name} ({occupancyCounts[name]} fois)
                            </Text>
                        ))}
                        <Text style={styles.statExplanation}>
                            Nom d'occupation apparaissant le plus dans les travaux filtrés.
                        </Text>
                    </View>

                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Pourcentage de travaux actifs aujourd'hui:</Text>
                        <Text style={styles.statValue}>{activePercentage} %</Text>
                        <Text style={styles.statExplanation}>
                            Travaux dont la date actuelle est comprise entre début et fin.
                        </Text>
                    </View>

                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Travaux démarrés par mois (6 derniers mois):</Text>
                        {last6Months.map((month) => (
                            <Text key={month} style={styles.statValue}>
                                {month}: {monthCounts[month] || 0}
                            </Text>
                        ))}
                        <Text style={styles.statExplanation}>
                            Nombre de travaux démarrés chaque mois.
                        </Text>
                    </View>

                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Répartition des travaux par jour de la semaine (démarrage):</Text>
                        {sortedWeekdays.length === 0 ? (
                            <Text style={styles.statValue}>Données non disponibles</Text>
                        ) : (
                            sortedWeekdays.map(([day, count]) => (
                                <Text key={day} style={styles.statValue}>
                                    {day}: {count}
                                </Text>
                            ))
                        )}
                        <Text style={styles.statExplanation}>
                            Jours où le plus de travaux ont commencé.
                        </Text>
                    </View>
                </>
            )}
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" style={{ marginTop: 50 }} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <FlatList
                    data={filteredEntraves}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.entraveItem}>
                            <Text style={styles.entraveTitle}>
                                {item.occupancy_name} — {item.organizationname}
                            </Text>
                            <Text style={styles.entraveDetails}>Arrondissement: {item.boroughid}</Text>
                            <Text style={styles.entraveDetails}>
                                Dates: {format(new Date(item.duration_start_date), 'dd/MM/yyyy')} -{' '}
                                {format(new Date(item.duration_end_date), 'dd/MM/yyyy')}
                            </Text>
                            <Text style={styles.entraveDetails}>Raison: {item.reason_category}</Text>
                        </View>
                    )}
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    ListEmptyComponent={
                        hasFiltered ? (
                            <Text style={styles.noResultsText}>Aucun travail trouvé avec ces filtres.</Text>
                        ) : (
                            <Text style={styles.noResultsText}>
                                Utilisez les filtres ci-dessus pour rechercher des travaux.
                            </Text>
                        )
                    }
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', padding: 15, textAlign: 'center' },
    dropdown: { marginBottom: 15 },
    input: {
        marginHorizontal: 15,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        marginBottom: 15,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
        paddingHorizontal: 15,
    },
    datePickerButton: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#aaa',
        borderRadius: 6,
        minWidth: 140,
        alignItems: 'center',
    },
    datePickerText: { fontSize: 14 },
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 25,
        paddingHorizontal: 15,
    },
    button: {
        backgroundColor: '#1976D2',
        padding: 14,
        borderRadius: 6,
        flex: 1,
        marginHorizontal: 5,
    },
    clearButton: { backgroundColor: '#e0e0e0' },
    buttonText: { color: 'white', textAlign: 'center', fontWeight: '600' },
    statsTitle: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 15, marginBottom: 10 },
    statBox: {
        marginHorizontal: 15,
        marginBottom: 15,
        padding: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    statLabel: { fontWeight: 'bold', fontSize: 16, marginBottom: 6 },
    statValue: { fontSize: 15, marginLeft: 10 },
    statExplanation: { fontSize: 12, color: '#555', marginTop: 3 },
    noResultsText: { textAlign: 'center', marginVertical: 40, fontSize: 16, color: '#777' },
    entraveItem: {
        backgroundColor: '#e3f2fd',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 15,
    },
    entraveTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
    entraveDetails: { fontSize: 14, color: '#333' },
});

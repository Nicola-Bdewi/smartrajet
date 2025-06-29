import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    FlatList,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Button
} from 'react-native';
import Slider from '@react-native-community/slider';
import { WebView } from 'react-native-webview';
import { saveAddress } from '@/services/addressService';
import { useConstructionData } from '@/utils/useConstructionData';
import { useAutocomplete } from '@/utils/useAutocomplete';
import { useHtmlBuilder } from '@/utils/useHtmlBuilder';
import {useRouter} from 'expo-router';
import {
    requestPermissions,
    configureNotificationHandler
} from '@/utils/notifications';
import { registerBackgroundTask } from '@/utils/backgroundTasks';
import { styles } from '@/styles/styles';
import {initDb} from "@/utils/db";

export default function MapScreen() {
    const { entraves, impacts } = useConstructionData();
    const [fromQuery, setFromQuery] = useState('');
    const [toQuery, setToQuery] = useState('');
    const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);
    const [fromCoord, setFromCoord] = useState<[number, number] | null>(null);
    const [toCoord, setToCoord] = useState<[number, number] | null>(null);
    const [distanceThreshold, setDistanceThreshold] = useState(100); // meters
    const router = useRouter();

    const suggestions = useAutocomplete(
        activeInput === 'from' ? fromQuery : toQuery,
        activeInput !== null
    );

    const { html, loadingHtml } = useHtmlBuilder({
        entraves,
        impacts,
        fromCoord,
        toCoord,
        distanceThreshold,
    });

    useEffect(() => {
        configureNotificationHandler();
        requestPermissions();
        registerBackgroundTask();
        initDb();
    }, []);

    type RootStackParamList = {
        Map: undefined;
        SavedAddresses: undefined;
    };
    return (
        <View style={{ flex: 1 }}>
            <View style={styles.searchContainer}>
                <TextInput
                    placeholder="From address"
                    value={fromQuery}
                    onChangeText={t => {
                        setFromQuery(t);
                        setActiveInput('from');
                        setFromCoord(null);
                    }}
                    style={styles.input}
                />
                {toCoord && (
                    <Button
                        title="Save this To"
                        onPress={() => saveAddress(toQuery, toCoord)}
                    />
                )}
                <TextInput
                    placeholder="To address"
                    value={toQuery}
                    onChangeText={t => {
                        setToQuery(t);
                        setActiveInput('to');
                        setToCoord(null);
                    }}
                    style={styles.input}
                />
                {fromCoord && (
                    <Button
                        title="Save this From"
                        onPress={() => saveAddress(fromQuery, fromCoord)}
                    />
                )}
                <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
                    <Text>Rayon d'affichage des entraves : {distanceThreshold} m</Text>
                    <Slider
                        minimumValue={50}
                        maximumValue={500}
                        step={10}
                        value={distanceThreshold}
                        onValueChange={setDistanceThreshold}
                    />
                </View>
                {suggestions.length > 0 && (
                    <FlatList
                        data={suggestions}
                        keyExtractor={item => item.properties.id}
                        style={styles.suggestionsList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => {
                                    if (activeInput === 'from') {
                                        setFromQuery(item.properties.label);
                                        setFromCoord(item.geometry.coordinates);
                                    } else {
                                        setToQuery(item.properties.label);
                                        setToCoord(item.geometry.coordinates);
                                    }
                                    setActiveInput(null);
                                }}
                            >
                                <Text style={styles.suggestion}>{item.properties.label}</Text>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>

            {loadingHtml ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" />
            ) : (
                <WebView originWhitelist={['*']} source={{ html }} style={{ flex: 1 }} />
            )}
            {/* Button to navigate to saved-addresses management */}
            <Button
                title="Manage Saved Addresses"
                onPress={() => router.push('/SavedAddressesScreen')}
            />
        </View>
    );
}

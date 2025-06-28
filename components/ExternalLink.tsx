import React, { useEffect, useState } from 'react';
import {
    View,
    TextInput,
    FlatList,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import debounce from 'lodash.debounce';

const ENTRAVES_URL = `https://donnees.montreal.ca/api/3/action/datastore_search_sql?sql=SELECT * FROM "cc41b532-f12d-40fb-9f55-eb58c9a2b12b"`;
const IMPACTS_URL = `https://donnees.montreal.ca/api/3/action/datastore_search_sql?sql=SELECT * FROM "a2bc8014-488c-495d-941b-e7ae1999d1bd"`;
const ORS_KEY = '5b3ce3597851110001cf6248f0026a659ea4487181781678091e0f14';
interface Suggestion {
    properties: {
        id: string;
        label: string;
        [key: string]: any;
    };
    geometry: {
        coordinates: [number, number];
    };
}

export default function MapScreen() {
    const [html, setHtml] = useState('');

    const [fromQuery, setFromQuery] = useState('');
    const [toQuery, setToQuery] = useState('');
    const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

    const fetchSuggestions = debounce(async (text: string) => {
        if (!text) return;
        const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${ORS_KEY}&text=${encodeURIComponent(
            text
        )}&boundary.country=CA`;

        const res = await fetch(url);
        const data = await res.json();
        setSuggestions(data.features || []);
    }, 300);

    useEffect(() => {
        if (activeInput === 'from') fetchSuggestions(fromQuery);
        if (activeInput === 'to') fetchSuggestions(toQuery);
    }, [fromQuery, toQuery]);

    useEffect(() => {
        async function fetchAndBuildHTML() {
            const [entravesRes, impactsRes] = await Promise.all([
                fetch(ENTRAVES_URL).then((r) => r.json()),
                fetch(IMPACTS_URL).then((r) => r.json()),
            ]);

            const entraves = entravesRes.result.records;
            const impacts = impactsRes.result.records;

            const impactMap = new Map();
            impacts.forEach((i: any) => i.id_request && impactMap.set(i.id_request, i));

            const enriched = entraves
                .map((e: any) => {
                    const impact = impactMap.get(e.id);
                    return impact && e.latitude && e.longitude ? { ...e, impact } : null;
                })
                .filter(Boolean);

            const markersJS = enriched
                .map((e: any) => {
                    const { latitude, longitude, reason_category, impact } = e;
                    const popup = `
            <strong>${reason_category}</strong><br/>
            Impact: ${impact.streetimpacttype}<br/>
            Street: ${impact.name}
          `;
                    return `L.marker([${latitude}, ${longitude}])
            .bindPopup(\`${popup}\`)
            .addTo(map);`;
                })
                .join('\n');

            const finalHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <style> #map { height: 100vh; } </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([45.5017, -73.5673], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    ${markersJS}
  </script>
</body>
</html>
      `;

            setHtml(finalHTML);
        }

        fetchAndBuildHTML();
    }, []);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.searchContainer}>
                <TextInput
                    placeholder="From address"
                    value={fromQuery}
                    onChangeText={(text) => {
                        setFromQuery(text);
                        setActiveInput('from');
                    }}
                    style={styles.input}
                />
                <TextInput
                    placeholder="To address"
                    value={toQuery}
                    onChangeText={(text) => {
                        setToQuery(text);
                        setActiveInput('to');
                    }}
                    style={styles.input}
                />

                {suggestions.length > 0 && (
                    <FlatList
                        data={suggestions}
                        keyExtractor={(item) => item.properties.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => {
                                    if (activeInput === 'from') {
                                        setFromQuery(item.properties.label);
                                    } else if (activeInput === 'to') {
                                        setToQuery(item.properties.label);
                                    }
                                    setSuggestions([]);
                                    setActiveInput(null);
                                }}
                            >
                                <Text style={styles.suggestion}>{item.properties.label}</Text>
                            </TouchableOpacity>
                        )}
                        style={styles.suggestionsList}
                    />
                )}
            </View>

            {html && <WebView originWhitelist={['*']} source={{ html }} style={{ flex: 1 }} />}
        </View>
    );
}

const styles = StyleSheet.create({
    searchContainer: {
        position: 'absolute',
        top: 40,
        left: 10,
        right: 10,
        zIndex: 10,
    },
    input: {
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 8,
        marginBottom: 5,
        elevation: 2,
    },
    suggestionsList: {
        backgroundColor: '#fff',
        borderRadius: 8,
        maxHeight: Dimensions.get('window').height * 0.3,
    },
    suggestion: {
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
});

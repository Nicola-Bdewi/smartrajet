import React, { useState, useEffect } from 'react';
import {
    View,
    TextInput,
    FlatList,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { WebView } from 'react-native-webview';
import { useConstructionData } from '@/utils/useConstructionData';
import { useAutocomplete } from '@/utils/useAutocomplete';
import { useHtmlBuilder } from '@/utils/useHtmlBuilder';
import { useRouter } from 'expo-router';
import {
    requestPermissions,
    configureNotificationHandler,
} from '@/utils/notifications';
import { registerBackgroundTask } from '@/utils/backgroundTasks';
import { styles } from '@/styles/styles';
import { initDb } from '@/utils/db';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Provider as PaperProvider } from 'react-native-paper';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';

export default function MapScreen() {
    const { entraves, impacts } = useConstructionData();
    const [fromQuery, setFromQuery] = useState('');
    const [toQuery, setToQuery] = useState('');
    const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);
    const [fromCoord, setFromCoord] = useState<[number, number] | null>(null);
    const [toCoord, setToCoord] = useState<[number, number] | null>(null);
    const [distanceThreshold, setDistanceThreshold] = useState(100);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [visible, setVisible] = useState(false);

    const opacity = useSharedValue(0);
    const translateY = useSharedValue(-20);

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

    const screenHeight = Dimensions.get('window').height;

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    const toggle = () => {
        const toVisible = !visible;
        setVisible(toVisible);
        opacity.value = withTiming(toVisible ? 1 : 0, { duration: 300 });
        translateY.value = withTiming(toVisible ? 0 : -20, { duration: 300 });
    };

    return (
        <PaperProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                <View style={styles.floatingButton}>
                    <Button
                        mode="contained"
                        onPress={toggle}
                        buttonColor="#1976D2"
                        textColor="#ffffff"
                    >
                        {visible ? 'Hide' : 'Show'}
                    </Button>
                </View>

                {loadingHtml ? (
                    <ActivityIndicator style={{ flex: 1 }} size="large" color="#00ff00" />
                ) : (
                    <WebView originWhitelist={['*']} source={{ html }} style={{ flex: 1 }} />
                )}

                <View style={[styles.floatingBtnContainer, { bottom: insets.bottom + 10 }]}>
                    <Button
                        buttonColor="#1976D2"
                        textColor="white"
                        mode="contained"
                        onPress={() => router.push('/SavedAddressesScreen')}
                    >
                        Explorer les chantiers
                    </Button>
                </View>

                {/* Overlay with pointerEvents logic */}
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            width: '100%',
                            height: screenHeight * 0.8,
                            top: screenHeight * 0.03,
                        },
                        animatedStyle,
                    ]}
                    // box-none lets touches pass through the Animated.View itself but children can capture touches
                    pointerEvents={visible ? 'box-none' : 'none'}
                >
                    {/* Interactive container: this catches touches */}
                    <View style={styles.searchContainer} pointerEvents="auto">
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
                        <View style={styles.sliderContainer}>
                            <Text>Rayon d'affichage des entraves : {distanceThreshold} m</Text>
                            <Slider
                                minimumValue={50}
                                maximumValue={600}
                                step={5}
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
                </Animated.View>
            </SafeAreaView>
        </PaperProvider>
    );
}

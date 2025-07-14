// File: src/utils/useAutocomplete.ts
import { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash.debounce';
import Constants from 'expo-constants';
import { Suggestion } from '@/constants/types'; // Assuming your types are here

// Use OPENROUTESERVICE_API consistently
const { OPENROUTESERVICE_API } = Constants.expoConfig?.extra ?? {};

export function useAutocomplete(query: string, active: boolean) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

    const MONTREAL_LAT = 45.5017;
    const MONTREAL_LON = -73.5673;
    const MONTREAL_RADIUS_KM = 50;

    const debouncedFetch = useCallback(
        debounce(async (text: string) => {
            if (!text.trim()) {
                setSuggestions([]);
                return;
            }

            // Provide a clear error if the API key isn't loaded
            if (!OPENROUTESERVICE_API) {
                console.error('OpenRouteService API Key (OPENROUTESERVICE_API) is not configured for Autocomplete.');
                setSuggestions([]);
                return;
            }

            const url = new URL(
                'https://api.openrouteservice.org/geocode/autocomplete'
            );
            url.searchParams.set('api_key', OPENROUTESERVICE_API); // Use the consistent key
            url.searchParams.set('text', text);
            url.searchParams.set('boundary.country', 'CA');
            url.searchParams.set('boundary.circle.lat', MONTREAL_LAT.toString());
            url.searchParams.set('boundary.circle.lon', MONTREAL_LON.toString());
            url.searchParams.set('boundary.circle.radius', MONTREAL_RADIUS_KM.toString());

            // Debugging logs
            console.log('Autocomplete API Request URL:', url.toString());
            console.log('Autocomplete OPENROUTESERVICE_API available:', !!OPENROUTESERVICE_API);

            try {
                const res = await fetch(url.toString());
                const responseText = await res.text();

                console.log('Autocomplete API Response Status:', res.status);
                console.log('Autocomplete API Raw Response Body (first 500 chars):', responseText.substring(0, 500));

                if (!res.ok) {
                    console.error(`Autocomplete HTTP error! Status: ${res.status}. Response: ${responseText}`);
                    setSuggestions([]);
                    return;
                }

                // If status is OK, attempt JSON parsing
                const { features = [] } = JSON.parse(responseText);
                setSuggestions(features);
            } catch (error) {
                console.error('Error during autocomplete API call or JSON parsing:', error);
                setSuggestions([]);
            }
        }, 300),
        [OPENROUTESERVICE_API] // Recreate if key changes (unlikely, but good practice)
    );

    useEffect(() => {
        if (!active || !query) {
            setSuggestions([]);
            return;
        }

        debouncedFetch(query);

        return () => {
            debouncedFetch.cancel();
        };
    }, [query, active, debouncedFetch]);

    return suggestions;
}
import { useEffect, useState } from 'react';
import debounce from 'lodash.debounce';
import { Suggestion } from '@/constants/types';

const ORS_KEY = '5b3ce3597851110001cf6248f0026a659ea4487181781678091e0f14';

export function useAutocomplete(query: string, active: boolean) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

    const fetchSuggestions = debounce(async (text: string) => {
        if (!text) return setSuggestions([]);
        const url =
            `https://api.openrouteservice.org/geocode/autocomplete?api_key=${ORS_KEY}` +
            `&text=${encodeURIComponent(text)}&boundary.country=CA`;
        const res = await fetch(url);
        const data = await res.json();
        setSuggestions(data.features || []);
    }, 300);

    useEffect(() => {
        if (active) fetchSuggestions(query);
    }, [query, active]);

    return suggestions;
}

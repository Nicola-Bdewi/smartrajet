import { useState, useEffect } from 'react'
import debounce from 'lodash.debounce'
import Constants from 'expo-constants'
import { Suggestion } from '@/constants/types'

const { ORS_KEY } = Constants.expoConfig?.extra ?? {}

export function useAutocomplete(query: string, active: boolean) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([])

    // 1️⃣ Create your debounced fetch once
    const debouncedFetch = debounce(async (text: string) => {
        if (!text.trim()) {
            setSuggestions([])
            return
        }
        const url = new URL(
            'https://api.openrouteservice.org/geocode/autocomplete'
        )
        url.searchParams.set('api_key', ORS_KEY)
        url.searchParams.set('text', text)
        url.searchParams.set('boundary.country', 'CA')

        const res = await fetch(url.toString())
        const { features = [] } = await res.json()
        setSuggestions(features)
    }, 300)

    // 2️⃣ useEffect watches `query` & `active`
    useEffect(() => {
        // if the input is inactive or empty, clear immediately
        if (!active || !query) {
            setSuggestions([])
            return
        }

        // otherwise, kick off the debounced fetch
        debouncedFetch(query)

        // 3️⃣ cleanup runs when deps change or on unmount
        return () => {
            debouncedFetch.cancel()
        }
    }, [query, active])   // ← only re-run when query or active flips

    return suggestions
}

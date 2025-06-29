import { useEffect, useState } from 'react';
import Constants from 'expo-constants';

export function useConstructionData() {
    const [entraves, setEntraves] = useState<any[]>([]);
    const [impacts, setImpacts] = useState<any[]>([]);
    const { IMPACTS_URL, ENTRAVES_URL, ORS_KEY } = Constants.expoConfig?.extra || {};

    if (!ENTRAVES_URL || !IMPACTS_URL) {
        throw new Error("Required environment variable ENTRAVES_URL or IMPACTS_URL or both is (are) missing.");
    }

    useEffect(() => {
        (async () => {
            try {
                const [eRes, iRes] = await Promise.all([
                    fetch(ENTRAVES_URL).then(r => r.json()),
                    fetch(IMPACTS_URL).then(r => r.json()),
                ]);
                setEntraves(eRes.result.records);
                setImpacts(iRes.result.records);
            } catch (err) {
                console.warn('Data load error', err);
            }
        })();
    }, []);

    return { entraves, impacts };
}

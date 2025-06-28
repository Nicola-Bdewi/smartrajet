import { useEffect, useState } from 'react';

const ENTRAVES_URL =process.env.ENTRAVES_URL;
const IMPACTS_URL =process.env.IMPACTS_URL;
export function useConstructionData() {
    const [entraves, setEntraves] = useState<any[]>([]);
    const [impacts, setImpacts] = useState<any[]>([]);

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

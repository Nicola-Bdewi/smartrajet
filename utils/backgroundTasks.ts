import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as BackgroundTask from 'expo-background-task';
import * as turf from '@turf/turf';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from "expo-constants";

const { IMPACTS_URL, ENTRAVES_URL, ORS_KEY } = Constants.expoConfig?.extra || {};

const DISTANCE_LIMIT = 100;

export async function registerBackgroundTask() {
    if (!ENTRAVES_URL || !IMPACTS_URL) {
        throw new Error("Required environment variable ENTRAVES_URL or IMPACTS_URL or both is (are) missing.");
    }
    await Notifications.requestPermissionsAsync();
    /**
     * Task definition for checking construction zones near saved addresses.
     * Only executes logic if the time is exactly 8 AM.
     */
    TaskManager.defineTask('CHECK_CONSTRUCTIONS', async () => {
        const now = new Date();
        // if (now.getHours() !== 8) {
        //     return BackgroundFetch.BackgroundFetchResult.NoData;
        // }
        try {
            const [eRes, iRes] = await Promise.all([
                fetch(ENTRAVES_URL).then(r => r.json()),
                fetch(IMPACTS_URL).then(r => r.json()),
            ]);
            const impactMap = new Map<string, any>(
                iRes.result.records.map((i: any) => [i.id_request as string, i])
            );
            const constructions = eRes.result.records
                .map((e: any) => {
                    const imp = impactMap.get(e.id);
                    if (!imp || !e.latitude || !e.longitude) return null;
                    return {
                        lat: +e.latitude,
                        lon: +e.longitude,
                        reason: e.reason_category,
                        startDate: new Date(e.duration_start_date),
                    };
                })
                .filter((c: any) => c && c.startDate > new Date());

            const savedJson = await AsyncStorage.getItem('SAVED_ADDRS');
            const saved = savedJson ? JSON.parse(savedJson) : [];

            for (let addr of saved) {
                const pt = turf.point([addr.coords[0], addr.coords[1]]);
                const near = constructions.find((c: any) => {
                    const dist = turf.distance(pt, turf.point([c.lon, c.lat]), {
                        units: 'meters',
                    });
                    return dist <= DISTANCE_LIMIT;
                });
                if (near) {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: `Travaux près de ${addr.label}`,
                            body: `${near.reason} à venir le ${near.startDate.toLocaleDateString()}`,
                        },
                        trigger: null,
                    });
                }
            }

            return BackgroundTask.BackgroundTaskResult.Success;
        } catch (err) {
            console.warn('BG task error', err);
            return BackgroundFetch.BackgroundFetchResult.Failed;
        }
    });

    await BackgroundTask.registerTaskAsync('CHECK_CONSTRUCTIONS', {
        minimumInterval: 60 * 60 * 24
    });
}
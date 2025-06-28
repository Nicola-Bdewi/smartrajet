import * as Notifications from 'expo-notifications';
import { NotificationBehavior } from 'expo-notifications';

export function configureNotificationHandler() {
    Notifications.setNotificationHandler({
        handleNotification: async (): Promise<NotificationBehavior> => ({
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowList: true,
            shouldShowBanner: true,
        }),
    });
}

export async function requestPermissions() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
        console.warn('Notifications not granted!');
    }
}
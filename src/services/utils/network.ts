import { Network } from '@capacitor/network';

export const isOnline = async (): Promise<boolean> => {
    try {
        const status = await Network.getStatus();
        return status.connected;
    } catch (e) {
        // Fallback for browser environment without Capacitor plugin
        return navigator.onLine;
    }
};
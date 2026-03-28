'use client';

import { useState, useEffect } from 'react';

export interface WearableData {
    heartRate: number;
    steps: number;
    sleepHours: number;
    caloriesBurned: number;
    isConnected: boolean;
    lastSync: Date | null;
}

/**
 * Mocks the behavior of connecting to Apple Health, Google Fit, or a Bluetooth Wearable.
 * In a real Next.js capacitor/PWA environment, this would bridge to native SDKs
 * or use the experimental Web Bluetooth API.
 */
export const useWearables = () => {
    const [data, setData] = useState<WearableData>({
        heartRate: 72,
        steps: 8420,
        sleepHours: 7.5,
        caloriesBurned: 640,
        isConnected: false,
        lastSync: null
    });

    const connectDevice = () => {
        // Simulate pairing delay
        setTimeout(() => {
            setData(prev => ({
                ...prev,
                isConnected: true,
                lastSync: new Date()
            }));
            startHeartRateSimulation();
        }, 1500);
    };

    const disconnectDevice = () => {
        setData(prev => ({ ...prev, isConnected: false }));
    };

    const startHeartRateSimulation = () => {
        // Fluctuate heart rate slightly every 3 seconds to mimic live wearable data
        setInterval(() => {
            setData(prev => {
                if (!prev.isConnected) return prev;
                const fluctuation = Math.floor(Math.random() * 5) - 2; // -2 to +2
                const newHR = Math.max(60, Math.min(180, prev.heartRate + fluctuation));
                // Add a few steps randomly
                const newSteps = prev.steps + (Math.random() > 0.7 ? Math.floor(Math.random() * 5) : 0);

                return {
                    ...prev,
                    heartRate: newHR,
                    steps: newSteps,
                    lastSync: new Date()
                };
            });
        }, 3000);
    };

    return {
        wearableData: data,
        connectDevice,
        disconnectDevice
    };
};

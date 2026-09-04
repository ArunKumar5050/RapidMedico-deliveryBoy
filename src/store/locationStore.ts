import { create } from 'zustand';
import { LocationPoint } from '../types';

interface LocationState {
  currentLocation: LocationPoint | null;
  isTrackingActive: boolean;
  isMocked: boolean;
  isGpsWeak: boolean;
  batteryLevel: number;
  queuedPointsCount: number;
  setCurrentLocation: (location: LocationPoint) => void;
  setTrackingActive: (active: boolean) => void;
  setBatteryLevel: (level: number) => void;
  setQueuedPointsCount: (count: number) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  isTrackingActive: false,
  isMocked: false,
  isGpsWeak: false,
  batteryLevel: 100,
  queuedPointsCount: 0,

  setCurrentLocation: (currentLocation) =>
    set({
      currentLocation,
      isMocked: !!currentLocation.isMocked,
      isGpsWeak: currentLocation.accuracy > 50,
    }),

  setTrackingActive: (isTrackingActive) => set({ isTrackingActive }),
  setBatteryLevel: (batteryLevel) => set({ batteryLevel }),
  setQueuedPointsCount: (queuedPointsCount) => set({ queuedPointsCount }),
}));

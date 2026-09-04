import * as Location from 'expo-location';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { LocationPoint } from '../types';
import { useLocationStore } from '../store/locationStore';
import { useAssignmentStore } from '../store/assignmentStore';

let locationSubscription: Location.LocationSubscription | null = null;

const broadcastLocationToFirebase = async (point: LocationPoint, partnerId: string) => {
  // 1. Update local store
  useLocationStore.getState().setCurrentLocation(point);

  const nowIso = new Date().toISOString();

  // 2. Stream live coordinates to Firestore partner document
  if (partnerId) {
    try {
      const partnerRef = doc(db, 'delivery_partners', partnerId);
      await setDoc(
        partnerRef,
        {
          lastKnownLocation: point,
          location: point,
          lat: point.lat,
          lng: point.lng,
          latitude: point.lat,
          longitude: point.lng,
          speed: point.speed,
          heading: point.heading,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[LocationService] Firestore live location stream error:', err);
    }
  }

  // 3. Also stream directly to active order document in customOrders & orders
  const activeAssignment = useAssignmentStore.getState().currentAssignment;
  if (activeAssignment?.orderId) {
    const rawId = activeAssignment.orderId.replace('asgn_', '');
    const orderLocationPayload = {
      riderLat: point.lat,
      riderLng: point.lng,
      deliveryPartnerLocation: point,
      riderLocation: point,
      partnerLocation: point,
      lastRiderLocationUpdate: nowIso,
      updatedAt: nowIso,
    };

    try {
      const orderDocRef = doc(db, 'customOrders', rawId);
      await setDoc(orderDocRef, orderLocationPayload, { merge: true });

      const altRef = doc(db, 'orders', rawId);
      await setDoc(altRef, orderLocationPayload, { merge: true });
    } catch (err) {
      console.warn('[LocationService] Error updating live order location:', err);
    }
  }
};

export const locationService = {
  /**
   * Request foreground location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[LocationService] Permission request error:', e);
      return false;
    }
  },

  /**
   * Get current instantaneous GPS location fix and broadcast
   */
  async getCurrentLocation(partnerId?: string): Promise<LocationPoint | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const point: LocationPoint = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        heading: location.coords.heading ?? 0,
        speed: location.coords.speed ?? 0,
        accuracy: location.coords.accuracy ?? 10,
        timestamp: typeof location.timestamp === 'number' ? location.timestamp : Date.now(),
        isMocked: location.mocked,
      };

      if (partnerId) {
        await broadcastLocationToFirebase(point, partnerId);
      } else {
        useLocationStore.getState().setCurrentLocation(point);
      }
      return point;
    } catch (e) {
      console.warn('[LocationService] getCurrentLocation error:', e);
      return null;
    }
  },

  /**
   * Start live GPS watching and stream location updates to Firestore and locationStore
   */
  async startLiveTracking(partnerId: string): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      // Stop any existing tracking subscription first
      this.stopLiveTracking();

      useLocationStore.getState().setTrackingActive(true);

      // Immediately fetch current position without waiting for watch callback
      this.getCurrentLocation(partnerId).catch(() => {});

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // Fetch every 3 seconds
          distanceInterval: 1, // Or when moved by 1 meter
        },
        async (loc) => {
          const point: LocationPoint = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            heading: loc.coords.heading ?? 0,
            speed: loc.coords.speed ?? 0,
            accuracy: loc.coords.accuracy ?? 10,
            timestamp: typeof loc.timestamp === 'number' ? loc.timestamp : Date.now(),
            isMocked: loc.mocked,
          };

          await broadcastLocationToFirebase(point, partnerId);
        }
      );

      return true;
    } catch (e) {
      console.warn('[LocationService] startLiveTracking error:', e);
      useLocationStore.getState().setTrackingActive(false);
      return false;
    }
  },

  /**
   * Stop watching position and save battery
   */
  stopLiveTracking() {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
    useLocationStore.getState().setTrackingActive(false);
  },
};

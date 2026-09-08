import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeliveryPartner, AvailabilityStatus } from '../types';
import { authService } from '../services/authService';

const SESSION_STORAGE_KEY = '@rapidmedico_delivery_auth_session';

interface AuthState {
  partner: DeliveryPartner | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  availability: AvailabilityStatus;
  setPartner: (partner: DeliveryPartner | null) => void;
  setAvailability: (status: AvailabilityStatus) => void;
  setLoading: (loading: boolean) => void;
  checkPersistedAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  partner: null,
  isAuthenticated: false,
  isLoading: true,
  availability: 'OFFLINE',

  setPartner: (partner) => {
    set({
      partner,
      isAuthenticated: !!partner,
      availability: partner?.availability || 'OFFLINE',
      isLoading: false,
    });
    if (partner) {
      AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(partner)).catch((err) =>
        console.warn('[AuthStore] Failed to save session:', err)
      );
    } else {
      AsyncStorage.removeItem(SESSION_STORAGE_KEY).catch((err) =>
        console.warn('[AuthStore] Failed to clear session:', err)
      );
    }
  },

  setAvailability: (availability) => {
    const current = get().partner;
    if (current) {
      const updated = { ...current, availability };
      set({ availability, partner: updated });
      AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    } else {
      set({ availability });
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  checkPersistedAuth: async () => {
    try {
      const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const partner: DeliveryPartner = JSON.parse(stored);
        set({
          partner,
          isAuthenticated: true,
          availability: partner.availability || 'OFFLINE',
          isLoading: false,
        });
        
        // Background sync to ensure we have the latest name/status
        authService.fetchPartnerFromFirestore(partner.partnerId, 0)
          .then((latestPartner) => {
            if (latestPartner) {
              get().setPartner(latestPartner);
            }
          })
          .catch((e) => console.warn('[AuthStore] Background sync failed:', e));
          
        return;
      }
    } catch (e) {
      console.warn('[AuthStore] Error loading persisted auth session:', e);
    }
    set({ partner: null, isAuthenticated: false, isLoading: false });
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.warn('[AuthStore] Error during logout removal:', e);
    }
    set({
      partner: null,
      isAuthenticated: false,
      availability: 'OFFLINE',
      isLoading: false,
    });
  },
}));

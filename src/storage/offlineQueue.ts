import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationPoint } from '../types';

const LOCATION_QUEUE_KEY = '@rapidmedi_location_queue';
const ACTION_QUEUE_KEY = '@rapidmedi_action_queue';
const MAX_QUEUE_SIZE = 100; // Cap to avoid unbounded memory growth per Section 9.1

export interface QueuedAction {
  actionId: string;
  type: 'updateStatus' | 'verifyPickup' | 'verifyOTP' | 'reportIssue';
  payload: any;
  idempotencyKey: string;
  createdAt: number;
}

export const offlineStorage = {
  async queueLocationPoint(point: LocationPoint): Promise<void> {
    try {
      const existing = await this.getQueuedLocations();
      const updated = [...existing, point].slice(-MAX_QUEUE_SIZE);
      await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to queue location point', e);
    }
  },

  async getQueuedLocations(): Promise<LocationPoint[]> {
    try {
      const json = await AsyncStorage.getItem(LOCATION_QUEUE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      return [];
    }
  },

  async clearQueuedLocations(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LOCATION_QUEUE_KEY);
    } catch (e) {
      console.warn('Failed to clear location queue', e);
    }
  },

  async queueAction(action: Omit<QueuedAction, 'createdAt'>): Promise<void> {
    try {
      const existing = await this.getQueuedActions();
      const updated = [...existing, { ...action, createdAt: Date.now() }];
      await AsyncStorage.setItem(ACTION_QUEUE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to queue offline action', e);
    }
  },

  async getQueuedActions(): Promise<QueuedAction[]> {
    try {
      const json = await AsyncStorage.getItem(ACTION_QUEUE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      return [];
    }
  },

  async removeQueuedAction(actionId: string): Promise<void> {
    try {
      const existing = await this.getQueuedActions();
      const updated = existing.filter((a) => a.actionId !== actionId);
      await AsyncStorage.setItem(ACTION_QUEUE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to remove queued action', e);
    }
  },
};

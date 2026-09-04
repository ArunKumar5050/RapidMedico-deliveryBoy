import { create } from 'zustand';
import { Earnings, DeliveryHistory } from '../types';

interface EarningsState {
  earnings: Earnings | null;
  history: DeliveryHistory[];
  isLoading: boolean;
  setEarnings: (earnings: Earnings) => void;
  setHistory: (history: DeliveryHistory[]) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useEarningsStore = create<EarningsState>((set) => ({
  earnings: null,
  history: [],
  isLoading: false,

  setEarnings: (earnings) => set({ earnings }),
  setHistory: (history) => set({ history }),
  setLoading: (isLoading) => set({ isLoading }),
}));

import { create } from 'zustand';
import { DeliveryAssignment, DeliveryStatus } from '../types';

interface AssignmentState {
  currentAssignment: DeliveryAssignment | null;
  pendingOffer: DeliveryAssignment | null;
  offerTimeRemainingSeconds: number;
  isOfferModalVisible: boolean;
  setPendingOffer: (offer: DeliveryAssignment | null) => void;
  setOfferTimeRemaining: (seconds: number) => void;
  setCurrentAssignment: (assignment: DeliveryAssignment | null) => void;
  updateStatusLocally: (status: DeliveryStatus) => void;
  dismissOfferModal: () => void;
}

export const useAssignmentStore = create<AssignmentState>((set) => ({
  currentAssignment: null,
  pendingOffer: null,
  offerTimeRemainingSeconds: 30,
  isOfferModalVisible: false,

  setPendingOffer: (pendingOffer) =>
    set({
      pendingOffer,
      isOfferModalVisible: !!pendingOffer,
      offerTimeRemainingSeconds: pendingOffer ? 30 : 0,
    }),

  setOfferTimeRemaining: (offerTimeRemainingSeconds) =>
    set({ offerTimeRemainingSeconds }),

  setCurrentAssignment: (currentAssignment) =>
    set({
      currentAssignment,
      pendingOffer: null,
      isOfferModalVisible: false,
    }),

  updateStatusLocally: (status) =>
    set((state) => ({
      currentAssignment: state.currentAssignment
        ? { ...state.currentAssignment, status }
        : null,
    })),

  dismissOfferModal: () =>
    set({
      pendingOffer: null,
      isOfferModalVisible: false,
    }),
}));

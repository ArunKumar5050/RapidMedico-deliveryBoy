import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Earnings, DeliveryHistory, EarningsEntry } from '../types';

export const earningsService = {
  /**
   * Real-time subscription to partner financial analytics & completed delivery earnings
   */
  subscribePartnerEarnings(
    partnerId: string,
    onUpdate: (earnings: Earnings) => void
  ) {
    if (!partnerId) return () => {};

    try {
      const ordersCol = collection(db, 'customOrders');
      // Listen to all orders assigned to this partner
      const q = query(
        ordersCol,
        where('deliveryPartnerId', '==', partnerId)
      );

      return onSnapshot(
        q,
        async (snapshot) => {
          let todayTotal = 0;
          let weekTotal = 0;
          let monthTotal = 0;
          let completedCount = 0;
          const earningsBreakdown: EarningsEntry[] = [];

          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

          const dayOfWeek = now.getDay();
          const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday).getTime();

          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const isDelivered =
              data.status === 'delivered' ||
              data.status === 'completed' ||
              data.storeStatus === 'COMPLETED' ||
              data.isDelivered === true;

            if (isDelivered) {
              completedCount += 1;

              const billAmount = Number(data.billAmount || data.price || data.totalAmount || 250);
              const totalEarned = Number(data.deliveryFee || data.partnerEarnings || Math.max(45, Math.round(billAmount * 0.15)));

              let deliveryTimestamp = Date.now();
              if (data.deliveredAt) {
                deliveryTimestamp = new Date(data.deliveredAt).getTime();
              } else if (data.updatedAt) {
                deliveryTimestamp = new Date(data.updatedAt).getTime();
              } else if (data.createdAt?.toMillis) {
                deliveryTimestamp = data.createdAt.toMillis();
              }

              if (deliveryTimestamp >= startOfToday) {
                todayTotal += totalEarned;
              }
              if (deliveryTimestamp >= startOfWeek) {
                weekTotal += totalEarned;
              }
              if (deliveryTimestamp >= startOfMonth) {
                monthTotal += totalEarned;
              }

              const basePay = Math.round(totalEarned * 0.65);
              const distanceIncentive = Math.round(totalEarned * 0.25);
              const bonus = totalEarned - basePay - distanceIncentive;

              earningsBreakdown.push({
                assignmentId: `asgn_${docSnap.id}`,
                orderId: docSnap.id,
                basePay,
                distanceIncentive,
                bonus,
                amount: totalEarned,
                date: new Date(deliveryTimestamp).toISOString(),
              });
            }
          });

          // Sort breakdown by newest date first
          earningsBreakdown.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          // Also check if delivery_partners document has updated lifetime totals
          try {
            const partnerSnap = await getDoc(doc(db, 'delivery_partners', partnerId));
            if (partnerSnap.exists()) {
              const pData = partnerSnap.data();
              if (pData.todayEarnings && todayTotal === 0) {
                todayTotal = Number(pData.todayEarnings);
              }
              if (pData.totalDeliveries && completedCount === 0) {
                completedCount = Number(pData.totalDeliveries);
              }
            }
          } catch (_) {}

          const result: Earnings = {
            partnerId,
            today: todayTotal,
            thisWeek: weekTotal || todayTotal,
            thisMonth: monthTotal || weekTotal || todayTotal,
            pendingSettlement: weekTotal || todayTotal,
            completedDeliveriesCount: completedCount,
            deliveryEarnings: earningsBreakdown,
            updatedAt: Date.now(),
          };

          onUpdate(result);
        },
        (err) => {
          console.warn('[EarningsService] subscribePartnerEarnings error:', err);
        }
      );
    } catch (e) {
      console.warn('[EarningsService] subscribePartnerEarnings setup error:', e);
      return () => {};
    }
  },

  /**
   * Real-time subscription to completed delivery history records
   */
  subscribeDeliveryHistory(
    partnerId: string,
    onUpdate: (history: DeliveryHistory[]) => void
  ) {
    if (!partnerId) return () => {};

    try {
      const ordersCol = collection(db, 'customOrders');
      const q = query(
        ordersCol,
        where('deliveryPartnerId', '==', partnerId)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const historyList: DeliveryHistory[] = [];

          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const isDelivered =
              data.status === 'delivered' ||
              data.status === 'completed' ||
              data.storeStatus === 'COMPLETED' ||
              data.isDelivered === true;

            const isFailed =
              data.status === 'delivery_failed' ||
              data.deliveryStatus === 'failed' ||
              data.status === 'cancelled';

            if (isDelivered || isFailed) {
              const billAmount = Number(data.billAmount || data.price || data.totalAmount || 250);
              const totalEarned = Number(data.deliveryFee || data.partnerEarnings || Math.max(45, Math.round(billAmount * 0.15)));

              let completedAt = Date.now();
              if (data.deliveredAt) {
                completedAt = new Date(data.deliveredAt).getTime();
              } else if (data.updatedAt) {
                completedAt = new Date(data.updatedAt).getTime();
              } else if (data.createdAt?.toMillis) {
                completedAt = data.createdAt.toMillis();
              }

              const pickupArea =
                data.storeName ||
                data.storeAddress?.split(',')[0] ||
                'Partner Store Hub';

              const deliveryArea =
                data.landmark ||
                data.address?.split(',')[0] ||
                data.deliveryAddress?.split(',')[0] ||
                'Customer Locality';

              historyList.push({
                entryId: `hist_${docSnap.id}`,
                partnerId,
                assignmentId: `asgn_${docSnap.id}`,
                orderId: docSnap.id,
                status: isFailed ? 'failed' : 'completed',
                earnings: isFailed ? 0 : totalEarned,
                completedAt,
                pickupAreaCoarse: pickupArea,
                deliveryAreaCoarse: deliveryArea,
              });
            }
          });

          // Sort latest completed first
          historyList.sort((a, b) => b.completedAt - a.completedAt);
          onUpdate(historyList);
        },
        (err) => {
          console.warn('[EarningsService] subscribeDeliveryHistory error:', err);
        }
      );
    } catch (e) {
      console.warn('[EarningsService] subscribeDeliveryHistory setup error:', e);
      return () => {};
    }
  },

  /**
   * One-time fetch for partner earnings (fallback)
   */
  async getPartnerEarnings(partnerId: string): Promise<Earnings> {
    return new Promise((resolve) => {
      const unsub = earningsService.subscribePartnerEarnings(partnerId, (data) => {
        unsub();
        resolve(data);
      });
    });
  },

  /**
   * One-time fetch for delivery history (fallback)
   */
  async getDeliveryHistory(partnerId: string): Promise<DeliveryHistory[]> {
    return new Promise((resolve) => {
      const unsub = earningsService.subscribeDeliveryHistory(partnerId, (data) => {
        unsub();
        resolve(data);
      });
    });
  },
};

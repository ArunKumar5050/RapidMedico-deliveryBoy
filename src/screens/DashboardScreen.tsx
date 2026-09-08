import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useAssignmentStore } from '../store/assignmentStore';
import { useEarningsStore } from '../store/earningsStore';
import { useThemeStore } from '../store/themeStore';
import { authService } from '../services/authService';
import { earningsService } from '../services/earningsService';
import { assignmentService } from '../services/assignmentService';
import { locationService } from '../services/locationService';
import { useLocationStore } from '../store/locationStore';
import { DeliveryCard } from '../components/DeliveryCard';
import { DeliveryAssignment } from '../types';
import { formatCurrency, getPartnerDisplayName } from '../utils/formatting';
import { LocateFixed, Navigation2, Package, MapPin, Wifi, Activity, XCircle } from 'lucide-react-native';

export const DashboardScreen = ({ navigation }: any) => {
  const { partner, availability, setAvailability } = useAuthStore();
  const {
    currentAssignment,
    setCurrentAssignment,
    pendingOffer,
    setPendingOffer,
  } = useAssignmentStore();
  const { earnings, setEarnings, isLoading, setLoading } = useEarningsStore();
  const { currentLocation, isTrackingActive } = useLocationStore();
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();

  const [availableOrders, setAvailableOrders] = useState<DeliveryAssignment[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const isBusy = availability === 'BUSY' || !!currentAssignment;

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!partner?.partnerId) return;

    // Real-time Firestore subscription to earnings
    const unsubEarnings = earningsService.subscribePartnerEarnings(
      partner.partnerId,
      (liveEarnings) => {
        setEarnings(liveEarnings);
      }
    );

    // Start live location streaming if partner is online
    if (availability === 'ONLINE' && partner?.partnerId) {
      locationService.startLiveTracking(partner.partnerId);
    }

    return () => {
      unsubEarnings();
      locationService.stopLiveTracking();
    };
  }, [availability, partner?.partnerId]);

  // Real-time subscription to Confirmed Customer Orders in database
  useEffect(() => {
    if (availability === 'ONLINE' && partner) {
      const unsub = assignmentService.subscribeConfirmedOrders(
        partner,
        (orders: DeliveryAssignment[]) => {
          setAvailableOrders(orders);

          // If no active assignment and no pending offer, pop the first available order
          if (!currentAssignment && !pendingOffer && orders.length > 0) {
            const firstOffer = orders[0];
            setPendingOffer(firstOffer);
          }
        }
      );

      return () => {
        if (unsub) unsub();
      };
    } else {
      setAvailableOrders([]);
    }
  }, [availability, partner, currentAssignment, pendingOffer]);

  useEffect(() => {
    // Pulse animation for online indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();

    // Radar ripple animation
    Animated.loop(
      Animated.timing(radarAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();

    // Slide up animation for lists
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      })
    ]).start();
  }, []);

  const radarScale1 = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2.5]
  });
  const radarOpacity1 = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  });

  const radarScale2 = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2.5] // We will offset this via delay in a real app, but for now we use same
  });

  const handleToggleOnline = async (value: boolean) => {
    if (isBusy) return;
    const targetStatus = value ? 'ONLINE' : 'OFFLINE';
    const res = await authService.updateAvailability(targetStatus);
    setAvailability(res.availability);

    if (res.availability === 'ONLINE' && partner?.partnerId) {
      locationService.startLiveTracking(partner.partnerId);
    } else {
      locationService.stopLiveTracking();
    }
  };

  const handleAcceptDirectOrder = async (order: DeliveryAssignment) => {
    setAcceptingId(order.orderId);
    try {
      const res = await assignmentService.acceptAssignment(
        order.assignmentId,
        order.orderId,
        partner
      );
      if (res.success) {
        setCurrentAssignment({
          ...order,
          storePickupOtp: res.storePickupOtp || order.storePickupOtp,
          status: 'en_route_pickup',
        });
        navigation.navigate('ActiveDelivery');
      } else {
        Alert.alert('Order Unavailable', 'This order has already been assigned or fulfilled.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to accept order.');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleRefresh = async () => {
    if (!partner) return;
    setLoading(true);
    try {
      // Sync earnings
      const data = await earningsService.getPartnerEarnings(partner.partnerId);
      setEarnings(data);
      
      // Sync profile to get latest name/status
      const latestPartner = await authService.fetchPartnerFromFirestore(partner.partnerId, 0);
      if (latestPartner) {
        useAuthStore.getState().setPartner(latestPartner);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseActiveOrder = () => {
    if (!currentAssignment) return;
    Alert.alert(
      'Close Active Order',
      `Are you sure you want to close and cancel active order #${currentAssignment.orderId.substring(0, 8)}?`,
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Yes, Close Order',
          style: 'destructive',
          onPress: async () => {
            try {
              await assignmentService.closeActiveOrder(
                currentAssignment.orderId,
                partner?.partnerId
              );
              setCurrentAssignment(null);
              Alert.alert('Order Closed', 'The active order has been successfully closed and released.');
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to close order.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* TopAppBar */}
      <View style={[styles.header, { backgroundColor: theme.bg, paddingTop: insets.top + 16 }]}>
        <View style={styles.headerProfileInfo}>
          <View style={[styles.profileImageContainer, { borderColor: theme.cardBorder }]}>
            <Image 
              source={{ uri: partner?.profilePhotoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(getPartnerDisplayName(partner)) }} 
              style={styles.profileImage}
            />
          </View>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>Hello,</Text>
            <Text style={[styles.partnerName, { color: theme.primary }]}>{getPartnerDisplayName(partner)}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.sensorButton, { backgroundColor: theme.cardBg }]}>
          <Wifi size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 80, paddingHorizontal: 16, paddingTop: 16 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Online/Offline Toggle & GPS */}
        <View style={[styles.toggleCard, { backgroundColor: theme.cardBg, borderColor: 'rgba(255,255,255,0.1)' }]}>
          <View style={styles.toggleLeft}>
            <TouchableOpacity 
              style={[
                styles.customSwitch, 
                { backgroundColor: theme.cardBorder, borderColor: availability === 'ONLINE' ? 'rgba(74,225,118,0.3)' : 'rgba(255,255,255,0.1)' },
                isBusy && { opacity: 0.5 }
              ]}
              onPress={() => handleToggleOnline(availability !== 'ONLINE')}
              disabled={isBusy}
            >
               <Animated.View style={[
                 styles.switchThumb,
                 { 
                   backgroundColor: availability === 'ONLINE' ? theme.success : theme.textMuted,
                   transform: [{ translateX: availability === 'ONLINE' ? 24 : 0 }]
                 }
               ]}>
                 <View style={[styles.switchThumbInner, { backgroundColor: availability === 'ONLINE' ? '#003915' : '#000' }]} />
               </Animated.View>
            </TouchableOpacity>
            <View>
              <Text style={[styles.statusText, { color: availability === 'ONLINE' ? theme.success : theme.textMuted }]}>
                {availability === 'ONLINE' ? 'Online' : 'Offline'}
              </Text>
              <View style={styles.statusSubRow}>
                {availability === 'ONLINE' && !isBusy && (
                  <View style={styles.pingDotContainer}>
                    <Animated.View style={[styles.pingDotOuter, { backgroundColor: theme.primary, opacity: pulseAnim }]} />
                    <View style={[styles.pingDotInner, { backgroundColor: theme.primary }]} />
                  </View>
                )}
                <Text style={[styles.statusSubText, { color: theme.textSecondary }]}>
                  {isBusy ? 'Active Delivery in Progress' : (availability === 'ONLINE' ? 'Searching for orders...' : 'Offline')}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.radarContainer}>
            {availability === 'ONLINE' && (
              <>
                <Animated.View style={[styles.radarCircle, { borderColor: 'rgba(173,198,255,0.5)', transform: [{ scale: radarScale1 }], opacity: radarOpacity1 }]} />
              </>
            )}
            <LocateFixed size={24} color={availability === 'ONLINE' ? theme.primary : theme.textMuted} />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View 
            style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: 'rgba(255,255,255,0.1)' }]}
          >
            <View style={[styles.statGlow, { backgroundColor: 'rgba(173,198,255,0.1)' }]} />
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>TODAY'S EARNINGS</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statCurrency, { color: theme.textSecondary }]}>₹</Text>
              <Text style={[styles.statValue, { color: theme.textPrimary }]}>{earnings?.today || 0}</Text>
            </View>
          </View>
          
          <View 
            style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: 'rgba(255,255,255,0.1)' }]}
          >
            <View style={[styles.statGlow, { backgroundColor: 'rgba(79,219,200,0.1)' }]} />
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>THIS WEEK</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statCurrency, { color: theme.textSecondary }]}>₹</Text>
              <Text style={[styles.statValue, { color: theme.textPrimary }]}>{(earnings as any)?.thisWeek || 0}</Text>
            </View>
          </View>
        </View>

        {/* Active Assignment Section */}
        {currentAssignment ? (
          <Animated.View style={[styles.section, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Active Order
                </Text>
                <View style={[styles.liveBadge, { backgroundColor: theme.warningBg }]}>
                  <View style={[styles.liveDot, { backgroundColor: theme.warning }]} />
                  <Text style={[styles.liveBadgeText, { color: theme.warningGlow }]}>IN TRANSIT</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.closeOrderMiniBtn, { backgroundColor: 'rgba(255, 180, 171, 0.15)', borderColor: 'rgba(255, 180, 171, 0.4)' }]}
                onPress={handleCloseActiveOrder}
                activeOpacity={0.7}
              >
                <XCircle size={14} color="#ffb4ab" />
                <Text style={styles.closeOrderMiniBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
            <DeliveryCard
              assignment={currentAssignment}
              onPress={() => navigation.navigate('ActiveDelivery')}
            />
            <TouchableOpacity
              style={[styles.closeOrderBtnFull, { borderColor: 'rgba(255, 180, 171, 0.35)', backgroundColor: 'rgba(255, 180, 171, 0.1)' }]}
              onPress={handleCloseActiveOrder}
              activeOpacity={0.7}
            >
              <XCircle size={18} color="#ffb4ab" />
              <Text style={styles.closeOrderBtnFullText}>Close / Cancel Active Order</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* Available Orders */}
        {!currentAssignment && availability === 'ONLINE' && availableOrders.length > 0 ? (
          <Animated.View style={[styles.section, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sectionHeaderRow}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                    Available Orders
                 </Text>
                 <View style={[styles.liveBadge, { backgroundColor: '#93000a' }]}>
                    <View style={[styles.liveDot, { backgroundColor: theme.danger }]} />
                    <Text style={[styles.liveBadgeText, { color: theme.dangerGlow }]}>LIVE</Text>
                 </View>
               </View>
            </View>
            
            <View style={styles.ordersList}>
              {availableOrders.map((order, index) => (
                <View key={order.orderId} style={[styles.newOrderCard, { backgroundColor: theme.cardBg, borderColor: 'rgba(173,198,255,0.2)' }]}>
                  <View style={[styles.cardGradientBorder, { backgroundColor: theme.primary }]} />
                  
                  <View style={styles.newOrderHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.newOrderStoreName, { color: theme.textPrimary }]}>
                        {order.pharmacy.displayName || order.pharmacy.addressText || 'Pharmacy'}
                      </Text>
                      <View style={styles.newOrderLocationRow}>
                        <MapPin size={14} color={theme.textSecondary} />
                        <Text style={[styles.newOrderLocationText, { color: theme.textSecondary }]} numberOfLines={1}>
                           {order.customer.deliveryAddress}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.newOrderEarnings, { color: theme.success }]}>
                        ₹{order.estimatedEarnings}
                      </Text>
                      <Text style={[styles.newOrderTime, { color: theme.textSecondary }]}>
                        Est. 15 mins
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.orderDetailBox, { backgroundColor: theme.cardBorder }]}>
                    <View style={[styles.medIconBox, { backgroundColor: 'rgba(147,0,10,0.3)' }]}>
                      <Package size={16} color="#ffb4ab" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.medText, { color: theme.textPrimary }]}>Medical Package</Text>
                      <Text style={[styles.medSubText, { color: theme.textSecondary }]}>Order #{order.orderId}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.acceptBtn}
                    onPress={() => handleAcceptDirectOrder(order)}
                    disabled={acceptingId === order.orderId}
                  >
                    <View style={[styles.acceptBtnGradient, { backgroundColor: '#00a74b' }]}>
                      <Text style={[styles.acceptBtnText, { color: '#003111' }]}>
                        {acceptingId === order.orderId ? 'ACCEPTING...' : 'Accept Order'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    zIndex: 50,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  headerProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  greeting: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  partnerName: {
    fontSize: 20,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  sensorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 5,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  customSwitch: {
    width: 56,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  switchThumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  statusSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  pingDotContainer: {
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pingDotOuter: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pingDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusSubText: {
    fontSize: 11,
    fontFamily: 'Inter',
  },
  radarContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCircle: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 2,
  },
  statGlow: {
    position: 'absolute',
    top: -32,
    right: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statCurrency: {
    fontSize: 20,
    fontWeight: '400',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.72,
  },
  section: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ordersList: {
    gap: 16,
  },
  newOrderCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 3,
    overflow: 'hidden',
  },
  cardGradientBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  newOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 4,
  },
  newOrderStoreName: {
    fontSize: 16,
    fontWeight: '600',
  },
  newOrderLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  newOrderLocationText: {
    fontSize: 11,
  },
  newOrderEarnings: {
    fontSize: 20,
    fontWeight: '700',
  },
  newOrderTime: {
    fontSize: 11,
  },
  orderDetailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    marginLeft: 4,
  },
  medIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medText: {
    fontSize: 11,
    fontWeight: '500',
  },
  medSubText: {
    fontSize: 10,
  },
  acceptBtn: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: theme.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 4,
  },
  acceptBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  closeOrderMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  closeOrderMiniBtnText: {
    color: '#ffb4ab',
    fontSize: 12,
    fontWeight: '700',
  },
  closeOrderBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  closeOrderBtnFullText: {
    color: '#ffb4ab',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});


import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAssignmentStore } from '../store/assignmentStore';
import { useAuthStore } from '../store/authStore';
import { assignmentService } from '../services/assignmentService';
import { locationService } from '../services/locationService';
import { openExternalNavigation } from '../maps/externalNav';
import { formatCurrency } from '../utils/formatting';
import {
  Store,
  User,
  Phone,
  MapPin,
  KeyRound,
  Check,
  Navigation,
  Lock,
  ArrowRight,
  ShieldAlert,
  Truck,
  Home,
  CheckCircle2,
  Banknote,
  XCircle,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

export const ActiveDeliveryScreen = ({ navigation }: any) => {
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const { currentAssignment, updateStatusLocally } = useAssignmentStore();
  const { partner } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [dbStorePickupOtp, setDbStorePickupOtp] = useState<string>('');

  // Start live GPS streaming on active screen mount
  useEffect(() => {
    const partnerId = partner?.partnerId || 'partner_self';
    locationService.startLiveTracking(partnerId);
  }, [partner?.partnerId]);

  // Real-time Firestore sync for status & OTP transitions
  useEffect(() => {
    if (!currentAssignment?.orderId) return;

    const rawOrderId = currentAssignment.orderId.replace('asgn_', '');
    const customOrderRef = doc(db, 'customOrders', rawOrderId);
    const standardOrderRef = doc(db, 'orders', rawOrderId);

    const handleSnapshot = (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // 1. Exact Store Pickup OTP from DB
        const fetchedOtp = data.storePickupOtp || currentAssignment.storePickupOtp;

        if (fetchedOtp) {
          setDbStorePickupOtp(String(fetchedOtp));
        }

        // 2. Real-time store verification check
        const isStoreVerified =
          data.storeOtpConfirmed === true ||
          data.storePickupOtpVerified === true ||
          data.storeStatus === 'OUT_OF_DELIVERY' ||
          data.storeStatus === 'PICKED_UP' ||
          data.status === 'delivery boy assigned' ||
          data.deliveryStatus === 'en_route_delivery';

        if (isStoreVerified && currentAssignment.status === 'en_route_pickup') {
          updateStatusLocally('en_route_delivery');
        }
      }
    };

    const unsubscribeCustom = onSnapshot(customOrderRef, handleSnapshot, (err) => {
      console.warn('[ActiveDeliveryScreen] customOrders subscription error:', err);
    });

    const unsubscribeStandard = onSnapshot(standardOrderRef, handleSnapshot, (err) => {
      console.warn('[ActiveDeliveryScreen] orders subscription error:', err);
    });

    return () => {
      unsubscribeCustom();
      unsubscribeStandard();
    };
  }, [currentAssignment?.orderId, currentAssignment?.status, updateStatusLocally]);

  if (!currentAssignment) {
    return (
      <View style={[styles.emptyContainer]}>
        <Text style={[styles.emptyText]}>No active delivery in progress.</Text>
      </View>
    );
  }

  const { status, pharmacy, customer, codAmount } = currentAssignment;
  const isPickupLeg = status === 'en_route_pickup' || status === 'arrived_pickup';

  const pickupOtp =
    dbStorePickupOtp ||
    currentAssignment.storePickupOtp ||
    '----';

  const handleStartNav = () => {
    const dest = isPickupLeg ? pharmacy.location : customer.location;
    const label = isPickupLeg ? pharmacy.displayName || 'Store' : `${customer.fullName || customer.firstName} Address`;
    openExternalNavigation(dest.lat, dest.lng, label);
  };

  const handlePhoneCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert('Phone Number', 'No phone number available.');
      return;
    }
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      Alert.alert('Call Failed', `Could not initiate call to ${phoneNumber}`);
    });
  };

  const handleCloseActiveOrder = () => {
    if (!currentAssignment) return;
    Alert.alert(
      'Close Active Order',
      `Are you sure you want to close and cancel this active delivery order #${currentAssignment.orderId.substring(0, 8)}?`,
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
              Alert.alert('Order Closed', 'The active order has been successfully closed and released.', [
                { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
              ]);
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to close order.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowRight size={24} color="#dee2f5" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <View>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Active Delivery</Text>
              <View style={styles.liveDot} />
            </View>
            <Text style={styles.headerSubtitle}>Order #{currentAssignment.orderId.substring(0, 8)}</Text>
          </View>
        </View>
        <View style={styles.headerRightRow}>
          <TouchableOpacity 
            style={styles.headerCloseBtn}
            onPress={handleCloseActiveOrder}
            activeOpacity={0.7}
          >
            <XCircle size={15} color="#ffb4ab" />
            <Text style={styles.headerCloseBtnText}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportBtn}>
            <Phone size={20} color="#adc6ff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Route Progress Timeline */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle}>Delivery Status</Text>
            <View style={styles.etaBadge}>
              <Text style={styles.etaBadgeText}>{isPickupLeg ? 'En Route to Store' : 'Out for Delivery'}</Text>
            </View>
          </View>

          <View style={styles.timelineTrackContainer}>
            {/* Background Track */}
            <View style={styles.timelineTrackBg} />
            {/* Fill Track */}
            <View style={[styles.timelineTrackFill, { right: isPickupLeg ? '50%' : '10%' }]} />

            <View style={styles.timelineNodes}>
              {/* Store Node */}
              <View style={[styles.nodeWrapper, !isPickupLeg && { opacity: 0.5 }]}>
                <View style={[styles.nodeCircle, isPickupLeg ? styles.nodeActive : styles.nodeCompleted]}>
                  {isPickupLeg ? (
                    <Store size={24} color="#4fdbc8" />
                  ) : (
                    <Check size={24} color="#adc6ff" />
                  )}
                </View>
                <Text style={[styles.nodeLabel, isPickupLeg ? styles.nodeLabelActive : styles.nodeLabelCompleted]}>Store Pickup</Text>
              </View>

              {/* En Route Node */}
              <View style={styles.nodeWrapper}>
                <View style={[styles.nodeCircle, !isPickupLeg ? styles.nodeActive : styles.nodePending]}>
                  <Truck size={24} color={!isPickupLeg ? "#4fdbc8" : theme.textMuted} />
                </View>
                <Text style={[styles.nodeLabel, !isPickupLeg ? styles.nodeLabelActive : styles.nodeLabelPending]}>Delivering</Text>
              </View>

              {/* Customer Node */}
              <View style={styles.nodeWrapper}>
                <View style={[styles.nodeCircle, styles.nodePending]}>
                  <Home size={24} color="#8c909f" />
                </View>
                <Text style={[styles.nodeLabel, styles.nodeLabelPending]}>Drop-off</Text>
              </View>
            </View>
          </View>
        </View>

        {isPickupLeg ? (
          <>
            {/* Store Details Card */}
            <View style={[styles.customerCard, { borderColor: '#adc6ff30' }]}>
              <View style={styles.customerHeader}>
                <View style={styles.customerInfo}>
                  <View style={styles.avatarWrapper}>
                    <Store size={24} color="#adc6ff" />
                  </View>
                  <View>
                    <Text style={styles.customerName}>{pharmacy.displayName || 'Partner Store'}</Text>
                    <Text style={styles.customerTag}>Pharmacy</Text>
                  </View>
                </View>
              </View>

              <View style={styles.addressBox}>
                <MapPin size={20} color="#adc6ff" style={styles.addressIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressText}>{pharmacy.addressText}</Text>
                  <Text style={styles.addressSubText}>Coordinates: {pharmacy.location.lat.toFixed(4)}, {pharmacy.location.lng.toFixed(4)}</Text>
                </View>
              </View>

              {/* Glowing Store Pickup OTP Box */}
              <View style={styles.otpCard}>
                <View style={styles.otpHeaderRow}>
                  <KeyRound size={16} color="#4ae176" />
                  <Text style={styles.otpCardTitle}>STORE PICKUP OTP</Text>
                </View>
                <Text style={styles.otpValueText}>{pickupOtp}</Text>
                <Text style={styles.otpSubText}>
                  Provide this 4-digit OTP to the store to verify & receive the medicine parcel.
                </Text>
              </View>

              <View style={styles.actionRow}>
                {pharmacy.phone && (
                  <TouchableOpacity 
                    style={styles.actionBtnSecondary}
                    onPress={() => handlePhoneCall(pharmacy.phone)}
                  >
                    <Phone size={20} color="#dee2f5" />
                    <Text style={styles.actionBtnTextSecondary}>Call</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.actionBtnPrimary}
                  onPress={handleStartNav}
                >
                  <Navigation size={20} color="#adc6ff" />
                  <Text style={styles.actionBtnTextPrimary}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Privacy Locked Customer Card */}
            <View style={styles.lockedCustomerCard}>
              <View style={styles.lockedHeaderRow}>
                <Lock size={18} color="#ffb4ab" />
                <Text style={styles.lockedHeaderTitle}>Customer Contact Locked</Text>
              </View>
              <Text style={styles.lockedBodyText}>
                Security Policy: Customer phone number and exact address will unlock automatically once the pharmacy staff verifies your pickup OTP.
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Customer Details Card */}
            <View style={styles.customerCard}>
              <View style={styles.customerHeader}>
                <View style={styles.customerInfo}>
                  <View style={styles.avatarWrapper}>
                    <User size={24} color="#dee2f5" />
                  </View>
                  <View>
                    <Text style={styles.customerName}>{customer.fullName || customer.firstName}</Text>
                    <Text style={styles.customerTag}>Customer</Text>
                  </View>
                </View>
                <View style={styles.paymentTag}>
                  <CheckCircle2 size={16} color="#4fdbc8" />
                  <Text style={styles.paymentTagText}>{codAmount ? 'COD' : 'Pre-paid'}</Text>
                </View>
              </View>

              <View style={styles.addressBox}>
                <MapPin size={20} color="#adc6ff" style={styles.addressIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressText}>{customer.deliveryAddress}</Text>
                  {customer.landmark ? (
                    <Text style={styles.addressSubText}>Opposite Metro Pillar 45, Sector 18, Block H, New Delhi</Text>
                  ) : null}
                </View>
              </View>

              {codAmount ? (
                <View style={styles.codAlertBox}>
                  <Text style={styles.codAlertTitle}>Cash on Delivery to Collect:</Text>
                  <Text style={styles.codAlertAmount}>{formatCurrency(codAmount)}</Text>
                </View>
              ) : null}

              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={styles.actionBtnSecondary}
                  onPress={() => handlePhoneCall(customer.phone)}
                >
                  <Phone size={20} color="#dee2f5" />
                  <Text style={styles.actionBtnTextSecondary}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionBtnPrimary}
                  onPress={handleStartNav}
                >
                  <Navigation size={20} color="#adc6ff" />
                  <Text style={styles.actionBtnTextPrimary}>Navigate</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.issueButton}
                onPress={() => navigation.navigate('DeliveryFailure')}
              >
                <ShieldAlert size={16} color="#ffb4ab" />
                <Text style={styles.issueButtonText}>Report Customer Unreachable</Text>
              </TouchableOpacity>
            </View>

            {/* Earnings Preview Removed as per request */}
          </>
        )}

        {/* Prominent Close Active Order Option */}
        <TouchableOpacity
          style={styles.closeActiveDeliveryBtn}
          onPress={handleCloseActiveOrder}
          activeOpacity={0.7}
        >
          <XCircle size={18} color="#ffb4ab" />
          <Text style={styles.closeActiveDeliveryBtnText}>Close / Release This Active Order</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Fixed CTA */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {isPickupLeg ? (
          <TouchableOpacity 
            style={styles.primaryCta}
            onPress={() => navigation.navigate('PharmacyPickup')}
          >
            <Text style={styles.primaryCtaText}>Verify Store OTP</Text>
            <ArrowRight size={24} color="#00285d" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.primaryCta}
            onPress={() => navigation.navigate('OTPVerification')}
          >
            <Text style={styles.primaryCtaText}>Verify Delivery OTP</Text>
            <ArrowRight size={24} color="#00285d" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bg,
  },
  emptyText: {
    fontSize: 16,
    color: theme.textMuted,
    fontFamily: 'Inter',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.bg,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff10',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.primary,
    fontFamily: 'Inter',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.success,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.secondaryAccent,
    fontFamily: 'Inter',
    marginTop: 2,
    fontWeight: '600',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.4)',
    backgroundColor: 'rgba(255, 180, 171, 0.15)',
  },
  headerCloseBtnText: {
    color: '#ffb4ab',
    fontSize: 12,
    fontWeight: '700',
  },
  supportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff10',
  },
  closeActiveDeliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.35)',
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
    marginTop: 16,
    marginBottom: 8,
  },
  closeActiveDeliveryBtnText: {
    color: '#ffb4ab',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  timelineCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffffff10',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  etaBadge: {
    backgroundColor: theme.containerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffffff05',
  },
  etaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  timelineTrackContainer: {
    height: 60,
    justifyContent: 'center',
    position: 'relative',
  },
  timelineTrackBg: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 4,
    backgroundColor: theme.cardBorder,
    borderRadius: 2,
  },
  timelineTrackFill: {
    position: 'absolute',
    left: 24,
    height: 4,
    backgroundColor: theme.primaryGlow,
    borderRadius: 2,
  },
  timelineNodes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  nodeWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  nodeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCompleted: {
    backgroundColor: theme.containerHigh,
    borderWidth: 2,
    borderColor: theme.primary,
  },
  nodeActive: {
    backgroundColor: theme.cardBg,
    borderWidth: 3,
    borderColor: theme.secondaryAccent,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  nodePending: {
    backgroundColor: theme.cardBg,
    borderWidth: 2,
    borderColor: '#424754',
  },
  nodeLabel: {
    fontSize: 11,
    fontFamily: 'Inter',
  },
  nodeLabelCompleted: {
    color: theme.textSecondary,
  },
  nodeLabelActive: {
    color: theme.secondaryAccent,
    fontWeight: '700',
  },
  nodeLabelPending: {
    color: theme.textMuted,
  },
  customerCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#4ae17650',
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.cardBorder,
    borderWidth: 1,
    borderColor: '#ffffff10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  customerTag: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.textSecondary,
    backgroundColor: theme.cardBg,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ffffff05',
  },
  paymentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4fdbc815',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4fdbc830',
  },
  paymentTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.secondaryAccent,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.subtleBox,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffffff05',
    marginBottom: 20,
  },
  addressIcon: {
    marginTop: 2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  addressSubText: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.cardBg,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffffff10',
    gap: 8,
  },
  actionBtnTextSecondary: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.cardBg,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#adc6ff50',
    gap: 8,
  },
  actionBtnTextPrimary: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  earningsCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffffff10',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  earningsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4fdbc815',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
    letterSpacing: 0.5,
  },
  earningsSub: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textPrimary,
    marginTop: 2,
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.secondaryAccent,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.cardBg,
    borderTopWidth: 1,
    borderTopColor: '#ffffff10',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primaryGlow,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryCtaText: {
    color: '#00285d',
    fontSize: 16,
    fontWeight: '700',
  },
  lockedCustomerCard: {
    backgroundColor: '#1C1917',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#78350F',
    gap: 8,
  },
  lockedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockedHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.warningGlow,
  },
  lockedBodyText: {
    fontSize: 12,
    color: '#D6D3D1',
    lineHeight: 18,
  },
  otpCard: {
    backgroundColor: theme.subtleBox,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4ae17650',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  otpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  otpCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.success,
    letterSpacing: 0.8,
  },
  otpValueText: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.textPrimary,
    letterSpacing: 6,
    marginVertical: 4,
  },
  otpSubText: {
    fontSize: 11,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  codAlertBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#93000a20',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93000a50',
    marginBottom: 20,
  },
  codAlertTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.dangerGlow,
  },
  codAlertAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.danger,
  },
  issueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.cardBg,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    gap: 8,
    marginTop: 16,
  },
  issueButtonText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});

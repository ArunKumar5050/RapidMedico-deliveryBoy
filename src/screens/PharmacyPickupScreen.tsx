import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Linking,
  Animated,
  ImageBackground,
} from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAssignmentStore } from '../store/assignmentStore';
import { useAuthStore } from '../store/authStore';
import { assignmentService } from '../services/assignmentService';
import { locationService } from '../services/locationService';
import { ArrowLeft, MapPin, Navigation, Phone, RefreshCcw, XCircle } from 'lucide-react-native';


export const PharmacyPickupScreen = ({ navigation }: any) => {
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const { currentAssignment, updateStatusLocally } = useAssignmentStore();
  const { partner } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [dbStorePickupOtp, setDbStorePickupOtp] = useState<string>('');
  const [isStoreVerified, setIsStoreVerified] = useState(false);

  // Radar pulsing animation for live waiting indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Sonar background animation
  const sonarAnim = useRef(new Animated.Value(0)).current;

  // Start live GPS tracking on pickup screen mount
  useEffect(() => {
    const partnerId = partner?.partnerId || 'partner_self';
    locationService.startLiveTracking(partnerId);
  }, [partner?.partnerId]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const sonarLoop = Animated.loop(
      Animated.timing(sonarAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false, // width/translateX layout properties
      })
    );
    sonarLoop.start();

    return () => {
      pulseLoop.stop();
      sonarLoop.stop();
    };
  }, [pulseAnim, sonarAnim]);

  // Real-time listener on active Firestore order document
  useEffect(() => {
    if (!currentAssignment?.orderId) return;

    const rawOrderId = currentAssignment.orderId.replace('asgn_', '');
    const customOrderRef = doc(db, 'customOrders', rawOrderId);
    const standardOrderRef = doc(db, 'orders', rawOrderId);

    const handleSnapshot = (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // 1. Fetch exact storePickupOtp from database
        const fetchedOtp = data.storePickupOtp || currentAssignment.storePickupOtp;

        if (fetchedOtp) {
          setDbStorePickupOtp(String(fetchedOtp));
        }

        // 2. Real-time detect when Store Owner enters OTP and confirms on their store tablet
        const storeVerified =
          data.storeOtpConfirmed === true ||
          data.storePickupOtpVerified === true ||
          data.storeStatus === 'OUT_OF_DELIVERY' ||
          data.storeStatus === 'PICKED_UP' ||
          data.status === 'delivery boy assigned' ||
          data.deliveryStatus === 'en_route_delivery';

        if (storeVerified && !isStoreVerified) {
          setIsStoreVerified(true);
          updateStatusLocally('en_route_delivery');

          // Auto-redirect to ActiveDeliveryScreen (Customer drop-off navigation)
          Alert.alert(
            'Store Handover Verified! 🎉',
            'Store owner has verified your OTP and handed over the parcel. Customer address and live navigation are now unlocked.',
            [
              {
                text: 'Start Customer Delivery 🚀',
                onPress: () => navigation.replace('ActiveDelivery'),
              },
            ]
          );
        }
      }
    };

    const unsubscribeCustom = onSnapshot(
      customOrderRef,
      handleSnapshot,
      (err) => {
        console.warn('[PharmacyPickupScreen] customOrders subscription error:', err);
      }
    );

    const unsubscribeStandard = onSnapshot(
      standardOrderRef,
      handleSnapshot,
      (err) => {
        console.warn('[PharmacyPickupScreen] orders subscription error:', err);
      }
    );

    return () => {
      unsubscribeCustom();
      unsubscribeStandard();
    };
  }, [currentAssignment?.orderId, isStoreVerified, navigation, updateStatusLocally]);

  if (!currentAssignment) return null;

  // Use real-time fetched OTP from database or fallback to assignment store OTP
  const pickupOtp =
    dbStorePickupOtp ||
    currentAssignment.storePickupOtp ||
    '----';

  const storePhone = currentAssignment.pharmacy.phone;
  const storeLat = currentAssignment.pharmacy.location.lat;
  const storeLng = currentAssignment.pharmacy.location.lng;

  const handleCallStore = () => {
    if (storePhone) {
      Linking.openURL(`tel:${storePhone}`).catch(() => {
        Alert.alert('Call Failed', `Could not open dialer for ${storePhone}`);
      });
    } else {
      Alert.alert('No Phone Number', 'Store phone number is not available.');
    }
  };

  const handleOpenStoreMap = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${storeLat},${storeLng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Maps Error', 'Could not open maps application.');
    });
  };

  const handleCloseActiveOrder = () => {
    if (!currentAssignment) return;
    Alert.alert(
      'Close Active Order',
      `Are you sure you want to close and cancel this active order #${currentAssignment.orderId.substring(0, 8)}?`,
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
              Alert.alert('Order Closed', 'The active order has been closed and released.', [
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
      {/* TopAppBar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
             <ArrowLeft size={24} color="#c2c6d6" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pickup from Store</Text>
        </View>
        <View style={styles.headerRight}>
           <TouchableOpacity
             style={styles.closeHeaderBtn}
             onPress={handleCloseActiveOrder}
             activeOpacity={0.7}
           >
             <XCircle size={14} color={theme.danger} />
             <Text style={styles.closeHeaderBtnText}>Close</Text>
           </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.mainContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
         {/* Map/Header Area */}
         <View style={styles.mapSection}>
            <ImageBackground 
               source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBn9ZMuC5tshwomSuEwJTjBODl04i9Xy9ylZBJg3ydO0f_094-AbJWI14RLs3KkFdIgijQuAigebaD2SD_hnBNSfxPGYFQZ80-NsjE8W3QpiaQOM18rEu0DYEbGBf-2jEwZ4fjdhYzoAmKf1FrQHp9cjQpkYb94O-TTw54CufWAAQwVWZg6Sjsux-sApmNYE_dZeT32cMiC154lX08F4QMU1cX2izgu7v56Iu34nX2xScNctRNrz5W' }}
               style={styles.mapImage}
               imageStyle={{ opacity: 0.8 }}
            >
              <View 
                style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14, 19, 32, 0.5)' }]}
              />
              
              {/* Store Info Overlay */}
              <View style={styles.storeInfoOverlay}>
                 <View style={styles.storeInfoLeft}>
                    <Text style={styles.pickupLabel}>PICKUP LOCATION</Text>
                    <Text style={styles.storeName}>{currentAssignment.pharmacy.displayName || 'Pharmacy'}</Text>
                    <View style={styles.storeDistanceRow}>
                       <MapPin size={16} color="#c2c6d6" />
                       <Text style={styles.storeDistanceText}>1.2 km away • 5 mins</Text>
                    </View>
                 </View>
                 <View style={styles.storeInfoRight}>
                    <TouchableOpacity style={styles.navButton} onPress={handleOpenStoreMap}>
                       <Navigation size={20} color="#00285d" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.callButton} onPress={handleCallStore}>
                       <Phone size={20} color="#dee2f5" />
                    </TouchableOpacity>
                 </View>
              </View>
            </ImageBackground>
         </View>

         {/* Verification Banner */}
         <View style={styles.verificationBannerWrapper}>
            <Animated.View style={[
              styles.verificationBannerBg, 
              { 
                transform: [
                  { 
                    translateX: sonarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-300, 300]
                    }) 
                  }
                ] 
              }
            ]} />
            <View style={styles.verificationBannerContent}>
               <Animated.View style={{ transform: [{ rotate: pulseAnim.interpolate({ inputRange: [1, 1.5], outputRange: ['0deg', '180deg'] }) }] }}>
                 <RefreshCcw size={16} color={theme.primary} />
               </Animated.View>
               <Text style={styles.verificationText}>Waiting for store owner to verify...</Text>
            </View>
         </View>

         {/* HERO: OTP Card */}
         <View style={styles.otpCardWrapper}>
            <View
              style={[styles.otpCard, { backgroundColor: theme.cardBg }]}
            >
              <View style={styles.otpCardInner}>
                 <View style={styles.otpLabelBadge}>
                    <Text style={styles.otpLabelText}>YOUR STORE PICKUP OTP</Text>
                 </View>

                 <View style={styles.otpDigitsContainer}>
                    {pickupOtp.split('').map((digit, idx) => (
                      <Animated.View 
                        key={idx} 
                        style={[
                          styles.otpDigitBox, 
                          { 
                            transform: [
                              { scale: pulseAnim.interpolate({ inputRange: [1, 1.5], outputRange: [1, 1.02] }) }
                            ] 
                          }
                        ]}
                      >
                         <Text style={styles.otpDigitText}>{digit}</Text>
                      </Animated.View>
                    ))}
                 </View>

                 <Text style={styles.otpInstructionText}>
                    Show this code to the pharmacist to confirm pickup and receive the medical package.
                 </Text>
              </View>
            </View>
         </View>
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    backgroundColor: theme.bg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 5,
    zIndex: 50,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.primary,
    fontFamily: 'Inter-Bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.4)',
    backgroundColor: theme.dangerBg,
  },
  closeHeaderBtnText: {
    color: theme.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  radarContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarDot: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 6,
    backgroundColor: theme.success,
  },
  radarDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.success,
  },
  gpsActiveText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.success,
  },
  mainContent: {
    flex: 1,
    padding: 16,
    gap: 20,
  },
  mapSection: {
    width: '100%',
    height: 192,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  storeInfoOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(37, 42, 56, 0.9)',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  storeInfoLeft: {
    flex: 1,
    gap: 4,
  },
  pickupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    letterSpacing: 0.5,
  },
  storeName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  storeDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeDistanceText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  storeInfoRight: {
    flexDirection: 'column',
    gap: 8,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.subtleBox,
    borderWidth: 1,
    borderColor: '#424754',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationBannerWrapper: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(173, 198, 255, 0.3)',
    backgroundColor: 'rgba(77, 142, 255, 0.1)',
    position: 'relative',
  },
  verificationBannerBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -100,
    width: 200,
    backgroundColor: 'rgba(77, 142, 255, 0.3)',
  },
  verificationBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
  },
  otpCardWrapper: {
    flex: 1,
    width: '100%',
    minHeight: 300,
  },
  otpCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpCardInner: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  otpLabelBadge: {
    backgroundColor: theme.subtleBox,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  otpLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    letterSpacing: 1,
  },
  otpDigitsContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    width: '100%',
  },
  otpDigitBox: {
    width: 64,
    height: 80,
    backgroundColor: theme.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(173, 198, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  otpDigitText: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.textPrimary,
    fontFamily: 'Inter-Bold',
  },
  otpInstructionText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 32,
    opacity: 0.7,
  }
});

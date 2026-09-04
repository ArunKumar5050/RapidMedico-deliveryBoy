import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, Vibration, TouchableOpacity, ImageBackground, Animated, Easing, ScrollView } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useAssignmentStore } from '../store/assignmentStore';
import { assignmentService } from '../services/assignmentService';
import { formatCurrency } from '../utils/formatting';
import { BellRing, Navigation, MapPin, Package, Zap } from 'lucide-react-native';

import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const NewDeliveryAlertScreen: React.FC = () => {
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const { partner } = useAuthStore();
  const {
    pendingOffer,
    isOfferModalVisible,
    offerTimeRemainingSeconds,
    setOfferTimeRemaining,
    setCurrentAssignment,
    dismissOfferModal,
  } = useAssignmentStore();
  const insets = useSafeAreaInsets();

  const [rejecting, setRejecting] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // SVG ring animation
  const progress = React.useRef(new Animated.Value(0)).current;
  // Glow animation
  const glow = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isOfferModalVisible) {
      progress.setValue(0);
      return;
    }

    Vibration.vibrate([0, 500, 200, 500]);

    // Animate progress ring to 1 over the total time (e.g. 15s)
    Animated.timing(progress, {
      toValue: 1,
      duration: offerTimeRemainingSeconds * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Pulsing glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();

    const timer = setInterval(() => {
      setOfferTimeRemaining(offerTimeRemainingSeconds - 1);
      if (offerTimeRemainingSeconds <= 1) {
        clearInterval(timer);
        dismissOfferModal();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOfferModalVisible, offerTimeRemainingSeconds]);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, circumference]
  });

  const animatedGlowStyle = {
    transform: [{ scale: glow }],
    opacity: glow.interpolate({
      inputRange: [1, 1.2],
      outputRange: [1, 0.8]
    }),
  };

  if (!isOfferModalVisible || !pendingOffer) return null;

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await assignmentService.acceptAssignment(
        pendingOffer.assignmentId,
        pendingOffer.orderId,
        partner
      );
      if (res.success) {
        setCurrentAssignment({
          ...pendingOffer,
          storePickupOtp: res.storePickupOtp || pendingOffer.storePickupOtp,
          status: 'en_route_pickup',
        });
      }
    } catch (e) {
      console.warn('Accept error', e);
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async (reasonCode?: string) => {
    setRejecting(true);
    try {
      await assignmentService.rejectAssignment(pendingOffer.assignmentId, reasonCode);
    } finally {
      setRejecting(false);
      dismissOfferModal();
    }
  };

  const isRedZone = offerTimeRemainingSeconds <= 5;
  const strokeColor = isRedZone ? theme.danger : theme.success;

  return (
    <Modal visible={isOfferModalVisible} transparent animationType="fade">
      <View style={styles.overlay}>
        {/* Background Map Simulation */}
        <ImageBackground
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDG13zNph8Mvu32-0aZgt3UW5tPcX3rAvdmTgqkfryEs4vBb4JdPGGpbeEWZ0e0MeluYk5gZ0rPgI7nA9RlSVoP7SQf_-xG0u6cGjgZCvvQ1GSWiuobMDonnsZx4MWtbVu8Wj8ocwNL1nFsO8VAYtQk2mY0jcv4yLMZzHtyoJUdTzc4RehWuKlEH5bpi-0EuHZlHaPTWoEc1z4liEe1UHXVJlTiwG5vubK5RlnzqJFjbPHfJSxeTAKU' }}
          style={StyleSheet.absoluteFill}
          imageStyle={{ opacity: 0.3 }}
          blurRadius={4}
        />

        <ScrollView 
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top, 32), paddingBottom: Math.max(insets.bottom, 24) }]}
          showsVerticalScrollIndicator={false}
        >
          
          {/* Header Area */}
          <View style={styles.header}>
            <View style={styles.bellIconContainer}>
               <Animated.View style={[styles.bellGlow, animatedGlowStyle]} />
               <BellRing size={40} color="#4fdbc8" />
            </View>
            <Text style={styles.title}>New Delivery Request!</Text>

            {/* Timer Ring */}
            <View style={styles.timerContainer}>
               <Svg width={128} height={128} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="#252a38"
                    strokeWidth="6"
                    fill="none"
                  />
                  <AnimatedCircle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke={strokeColor}
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
               </Svg>
               <View style={styles.timerTextContainer}>
                  <Text style={[styles.timerNumber, { color: isRedZone ? theme.danger : theme.textPrimary }]}>{offerTimeRemainingSeconds}</Text>
                  <Text style={styles.timerUnit}>sec</Text>
               </View>
            </View>
          </View>

          {/* Details Card */}
          <View style={styles.card}>
            {/* Earnings Row */}
            <View style={styles.earningsRow}>
               <View>
                 <Text style={styles.labelMuted}>EXPECTED EARNING</Text>
                 <Text style={styles.earningText}>{formatCurrency(pendingOffer.estimatedEarnings)}</Text>
               </View>
               <View style={styles.distanceBadge}>
                 <Navigation size={14} color="#4fdbc8" />
                 <Text style={styles.distanceText}>3.2 km</Text>
               </View>
            </View>

            {/* Locations */}
            <View style={styles.locationsContainer}>
               <View style={styles.timelineLine} />
               
               {/* Pickup */}
               <View style={styles.locationItem}>
                  <View style={styles.pickupDotContainer}>
                     <View style={styles.pickupDot} />
                  </View>
                  <View style={styles.locationContent}>
                     <Text style={styles.labelMuted}>PICKUP</Text>
                     <Text style={styles.locationTitle}>{pendingOffer.pharmacy.displayName}</Text>
                     <Text style={styles.locationSubtitle} numberOfLines={2}>{pendingOffer.pharmacy.addressText}</Text>
                  </View>
               </View>

               {/* Dropoff */}
               <View style={[styles.locationItem, { marginTop: 16 }]}>
                  <View style={styles.dropoffIconContainer}>
                     <MapPin size={12} color="#4ae176" />
                  </View>
                  <View style={styles.locationContent}>
                     <Text style={styles.labelMuted}>DROP-OFF</Text>
                     <Text style={styles.locationTitle}>{pendingOffer.customer.fullName || pendingOffer.customer.firstName}</Text>
                     <Text style={styles.locationSubtitle} numberOfLines={2}>{pendingOffer.customer.deliveryAddress}</Text>
                  </View>
               </View>
            </View>

            {/* Items Info */}
            <View style={styles.itemsInfoRow}>
               <Package size={16} color="#8c909f" />
               <Text style={styles.itemsInfoText}>{(pendingOffer as any).items?.length || 1} Items • Urgent Medication</Text>
            </View>

            {/* COD Banner */}
            {pendingOffer.codAmount ? (
              <View style={styles.codBanner}>
                <Text style={styles.codText}>💵 Collect Cash on Delivery: {formatCurrency(pendingOffer.codAmount)}</Text>
              </View>
            ) : null}
          </View>

        </ScrollView>
        {/* Actions - Pinned to bottom */}
        <View style={[styles.actionsContainer, { paddingBottom: Math.max(insets.bottom, 24), paddingTop: 16, paddingHorizontal: 16 }]}>
           <TouchableOpacity style={styles.acceptButtonContainer} onPress={handleAccept} disabled={accepting || rejecting}>
              <View
                style={[styles.acceptButton, { backgroundColor: '#04b4a2' }]}
              >
                <Text style={styles.acceptButtonText}>
                   {accepting ? 'ACCEPTING...' : 'ACCEPT DELIVERY'}
                </Text>
              </View>
           </TouchableOpacity>

           <TouchableOpacity 
             style={styles.skipButton}
             onPress={() => handleReject('skip')}
             disabled={accepting || rejecting}
           >
              <Text style={styles.skipButtonText}>Skip Request</Text>
           </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 14, 27, 0.8)',
    justifyContent: 'center',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 32,
    width: '100%',
  },
  bellIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(4, 180, 162, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bellGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 40,
    backgroundColor: 'rgba(4, 180, 162, 0.4)',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    fontWeight: '700',
    color: theme.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  timerContainer: {
    width: 128,
    height: 128,
    marginTop: 16,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.textPrimary,
    fontFamily: 'Inter-Bold',
  },
  timerUnit: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: -4,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(26, 31, 45, 0.9)',
    borderWidth: 1,
    borderColor: theme.cardBorder,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 5,
    marginBottom: 20,
    marginTop: 20,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.cardBorder,
  },
  labelMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  earningText: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.success,
    fontFamily: 'Inter-Bold',
  },
  distanceBadge: {
    backgroundColor: theme.containerHigh,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.tabBarBorder,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  locationsContainer: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 14,
    bottom: 14,
    width: 2,
    backgroundColor: 'rgba(140, 144, 159, 0.3)',
    zIndex: 0,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    zIndex: 10,
  },
  pickupDotContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(173, 198, 255, 0.2)',
    borderWidth: 1,
    borderColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.primary,
  },
  dropoffIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 225, 118, 0.2)',
    borderWidth: 1,
    borderColor: theme.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  locationContent: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
    fontFamily: 'Inter-Medium',
  },
  locationSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 2,
  },
  itemsInfoRow: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemsInfoText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  codBanner: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
    borderWidth: 1,
    borderColor: theme.danger,
    borderRadius: 8,
  },
  codText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.danger,
    textAlign: 'center',
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  acceptButtonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: theme.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  acceptButton: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#003111',
    letterSpacing: 0.5,
  },
  skipButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.textMuted,
  },
});

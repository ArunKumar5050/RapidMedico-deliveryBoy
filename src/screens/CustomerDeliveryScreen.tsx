import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAssignmentStore } from '../store/assignmentStore';
import { openExternalNavigation } from '../maps/externalNav';
import { formatCurrency } from '../utils/formatting';
import { Phone, MapPin, CheckCircle2, Navigation, ArrowRight } from 'lucide-react-native';

export const CustomerDeliveryScreen = ({ navigation }: any) => {
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const { currentAssignment } = useAssignmentStore();
  const insets = useSafeAreaInsets();

  if (!currentAssignment) return null;

  const { customer, codAmount } = currentAssignment;

  const handlePhoneCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert('Phone Number', 'Customer phone number not provided.');
      return;
    }
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      Alert.alert('Call Failed', `Could not initiate call to ${phoneNumber}`);
    });
  };

  const handleStartNav = () => {
    const dest = customer.location;
    const label = `${customer.fullName || customer.firstName} Address`;
    openExternalNavigation(dest.lat, dest.lng, label);
  };

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowRight size={24} color="#dee2f5" style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 size={40} color="#4ae176" />
          </View>
          <Text style={styles.successTitle}>Parcel Collected</Text>
          <Text style={styles.successSubtitle}>Ready for customer delivery</Text>
        </View>

        {/* Order Details Card */}
        <View style={styles.card}>
          <View style={styles.orderIdRow}>
            <Text style={styles.orderIdLabel}>ORDER ID</Text>
            <Text style={styles.orderIdValue}>#{currentAssignment.orderId.substring(0, 8)}</Text>
          </View>

          <View style={styles.customerRow}>
            <View style={styles.avatarWrapper}>
              <User size={20} color="#c2c6d6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{customer.fullName || customer.firstName}</Text>
              <View style={styles.phoneRow}>
                <Phone size={14} color="#c2c6d6" />
                <Text style={styles.customerPhone}>{customer.phone || 'N/A'}</Text>
              </View>
            </View>
            {customer.phone && (
              <TouchableOpacity 
                style={styles.callButton}
                onPress={() => handlePhoneCall(customer.phone)}
              >
                <Phone size={20} color="#4fdbc8" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.addressRow}>
            <View style={styles.avatarWrapper}>
              <MapPin size={20} color="#c2c6d6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>DELIVERY ADDRESS</Text>
              <Text style={styles.addressText}>{customer.deliveryAddress}</Text>
              {customer.landmark ? (
                <Text style={styles.landmarkText}>Landmark: {customer.landmark}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {codAmount ? (
          <View style={styles.codAlertBox}>
            <Text style={styles.codAlertTitle}>Cash on Delivery to Collect:</Text>
            <Text style={styles.codAlertAmount}>{formatCurrency(codAmount)}</Text>
          </View>
        ) : null}

        {/* Action Button */}
        <TouchableOpacity 
          style={styles.primaryCta}
          onPress={handleStartNav}
        >
          <Navigation size={24} color="#00285d" />
          <Text style={styles.primaryCtaText}>Start Delivery Navigation</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// Dummy icon to fulfill the import
const User = ({ size, color }: { size: number, color: string }) => {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.5 }} />
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.bg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.containerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4ae17650',
    marginBottom: 16,
    shadowColor: theme.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
    fontFamily: 'Inter',
  },
  successSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8,
    fontFamily: 'Inter',
  },
  card: {
    backgroundColor: theme.subtleBox,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffffff10',
    gap: 16,
  },
  orderIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff05',
    paddingBottom: 12,
  },
  orderIdLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
    letterSpacing: 0.5,
  },
  orderIdValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.primary,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 8,
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.containerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#04b4a220',
    borderWidth: 1,
    borderColor: '#4fdbc850',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 8,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: theme.textPrimary,
    lineHeight: 20,
  },
  landmarkText: {
    fontSize: 12,
    color: theme.secondaryAccent,
    marginTop: 4,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primaryGlow,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  primaryCtaText: {
    color: '#00285d',
    fontSize: 16,
    fontWeight: '700',
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
});

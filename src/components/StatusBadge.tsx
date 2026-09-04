import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DeliveryStatus, AvailabilityStatus, KYCStatusType } from '../types';
import { useThemeStore } from '../store/themeStore';

interface StatusBadgeProps {
  status: DeliveryStatus | AvailabilityStatus | KYCStatusType | { overall: KYCStatusType; documents?: any } | any;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { theme } = useThemeStore();

  // Safely extract string status if an object is passed
  const safeStatusString: string = typeof status === 'string'
    ? status
    : (status && typeof status === 'object' && 'overall' in status && typeof status.overall === 'string')
    ? status.overall
    : 'pending';

  const getBadgeTheme = () => {
    switch (safeStatusString) {
      case 'ONLINE':
      case 'approved':
      case 'completed':
        return { bg: theme.successBg, text: theme.successGlow, border: theme.success, dot: theme.success };
      case 'BUSY':
      case 'en_route_pickup':
      case 'en_route_delivery':
      case 'arrived_pickup':
      case 'arrived_delivery':
      case 'otp_verification':
      case 'under_review':
        return { bg: theme.primaryBg, text: theme.primaryGlow, border: theme.primary, dot: theme.primaryGlow };
      case 'OFFLINE':
      case 'pending':
      case 'pending_acceptance':
        return { bg: theme.warningBg, text: theme.warningGlow, border: theme.warning, dot: theme.warning };
      case 'failed':
      case 'cancelled':
      case 'rejected':
        return { bg: theme.dangerBg, text: theme.dangerGlow, border: theme.danger, dot: theme.danger };
      default:
        return { bg: theme.cardBorder, text: theme.textSecondary, border: theme.cardBorder, dot: theme.textMuted };
    }
  };

  const bTheme = getBadgeTheme();
  const formattedLabel = safeStatusString.replace(/_/g, ' ').toUpperCase();

  return (
    <View style={[styles.badge, { backgroundColor: bTheme.bg, borderColor: bTheme.border }]}>
      <View style={[styles.dot, { backgroundColor: bTheme.dot }]} />
      <Text style={[styles.text, { color: bTheme.text }]} numberOfLines={1}>
        {formattedLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

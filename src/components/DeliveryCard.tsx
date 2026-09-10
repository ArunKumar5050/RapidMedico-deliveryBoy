import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DeliveryAssignment } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatCurrency } from '../utils/formatting';
import { useThemeStore } from '../store/themeStore';

interface DeliveryCardProps {
  assignment: DeliveryAssignment;
  onPress: () => void;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({ assignment, onPress }) => {
  const { theme } = useThemeStore();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={[styles.orderIdBadge, { backgroundColor: theme.primaryBg, borderColor: theme.primary }]}>
          <Text style={[styles.orderIdText, { color: theme.primaryGlow }]} numberOfLines={1}>ORDER #{assignment.orderId}</Text>
        </View>
        <StatusBadge status={assignment.status} />
      </View>

      <View style={styles.body}>
        <View style={styles.legItem}>
          <View style={[styles.legDotPharmacy, { backgroundColor: theme.primary }]} />
          <View style={styles.legTextCol}>
            <Text style={[styles.legLabel, { color: theme.textMuted }]}>PHARMACY PICKUP</Text>
            <Text style={[styles.legTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {assignment.pharmacy.displayName || assignment.pharmacy.addressText}
            </Text>
          </View>
        </View>

        <View style={[styles.legConnector, { backgroundColor: theme.cardBorder }]} />

        <View style={styles.legItem}>
          <View style={[styles.legDotCustomer, { backgroundColor: theme.success }]} />
          <View style={styles.legTextCol}>
            <Text style={[styles.legLabel, { color: theme.textMuted }]}>DELIVERY DROP-OFF</Text>
            <Text style={[styles.legTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {assignment.customer.landmark
                ? `${assignment.customer.landmark}, ${assignment.customer.deliveryAddress}`
                : assignment.customer.deliveryAddress}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: theme.cardBorder }]}>
        <Text style={[styles.earningsLabel, { color: theme.textSecondary }]}>Estimated Earnings</Text>
        <Text style={[styles.earningsValue, { color: theme.successGlow }]}>
          {formatCurrency(assignment.estimatedEarnings)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    shadowColor: '#0077B6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  orderIdBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 1,
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  body: {
    marginVertical: 4,
  },
  legItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  legDotPharmacy: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  legDotCustomer: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  legConnector: {
    width: 2,
    height: 18,
    marginLeft: 4,
    marginVertical: 2,
  },
  legTextCol: {
    flex: 1,
  },
  legLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  legTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  earningsLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  earningsValue: {
    fontSize: 20,
    fontWeight: '900',
  },
});


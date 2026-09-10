import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '../utils/formatting';
import { useThemeStore } from '../store/themeStore';

interface EarningsCardProps {
  label: string;
  amount: number;
  subtext?: string;
  variant?: 'primary' | 'secondary' | 'accent';
}

export const EarningsCard: React.FC<EarningsCardProps> = ({
  label,
  amount,
  subtext,
  variant = 'primary',
}) => {
  const { theme } = useThemeStore();
  const isAccent = variant === 'accent';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isAccent ? theme.primaryBg : theme.cardBg,
          borderColor: isAccent ? theme.primary : theme.cardBorder,
        },
      ]}
    >
      <Text style={[styles.label, { color: isAccent ? theme.primaryGlow : theme.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.amount, { color: theme.textPrimary }]}>{formatCurrency(amount)}</Text>
      {subtext ? <Text style={[styles.subtext, { color: theme.textMuted }]}>{subtext}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    flex: 1,
    margin: 4,
    borderWidth: 1,
    shadowColor: '#0077B6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  subtext: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});


import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { useThemeStore } from '../store/themeStore';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'danger';
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}) => {
  const { theme } = useThemeStore();

  const getVariantStyles = () => {
    if (disabled) {
      return { bg: theme.cardBorder, border: theme.cardBorder, text: theme.textMuted };
    }
    switch (variant) {
      case 'success':
        return { bg: theme.success, border: theme.successGlow, text: '#ffffff' };
      case 'danger':
        return { bg: theme.danger, border: theme.dangerGlow, text: '#ffffff' };
      default:
        return { bg: theme.primary, border: theme.primaryGlow, text: '#ffffff' };
    }
  };

  const style = getVariantStyles();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: style.bg, borderColor: style.border },
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
    >
      <View style={styles.contentRow}>
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={[styles.text, { color: style.text }]}>{label}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 6,
    width: '100%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});

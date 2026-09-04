import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../store/themeStore';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  label,
  onPress,
  disabled = false,
}) => {
  const { theme } = useThemeStore();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          borderColor: theme.cardBorder,
          backgroundColor: theme.cardBg,
        },
        disabled && { borderColor: theme.cardBorder, backgroundColor: 'transparent' },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: theme.textSecondary }, disabled && { color: theme.textMuted }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 4,
    width: '100%',
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

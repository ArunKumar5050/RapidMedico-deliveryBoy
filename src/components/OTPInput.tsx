import React, { useRef, useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../store/themeStore';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  error?: string;
  attemptsRemaining?: number;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 4,
  onComplete,
  error,
  attemptsRemaining,
}) => {
  const { theme } = useThemeStore();
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleChange = (text: string, index: number) => {
    const cleanText = text.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = cleanText.slice(-1);
    setDigits(newDigits);

    if (cleanText && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullOtp = newDigits.join('');
    if (fullOtp.length === length) {
      onComplete(fullOtp);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputsRow}>
        {digits.map((digit, idx) => (
          <TextInput
            key={idx}
            ref={(ref) => {
              inputRefs.current[idx] = ref;
            }}
            style={[
              styles.box,
              {
                borderColor: theme.cardBorder,
                backgroundColor: theme.subtleBox,
                color: theme.textPrimary,
              },
              digit
                ? {
                    borderColor: theme.primaryGlow,
                    backgroundColor: theme.primaryBg,
                  }
                : null,
              error
                ? {
                    borderColor: theme.danger,
                    backgroundColor: theme.dangerBg,
                  }
                : null,
            ]}
            keyboardType="numeric"
            maxLength={1}
            value={digit}
            onChangeText={(text) => handleChange(text, idx)}
            onKeyPress={(e) => handleKeyPress(e, idx)}
            selectionColor={theme.primary}
          />
        ))}
      </View>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}>
          <Text style={[styles.errorText, { color: theme.dangerGlow }]}>{error}</Text>
        </View>
      ) : null}

      {attemptsRemaining !== undefined ? (
        <View style={styles.attemptsBadge}>
          <Text style={[styles.attemptsText, { color: theme.textSecondary }]}>
            🔒 {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  inputsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  box: {
    width: 60,
    height: 68,
    borderRadius: 16,
    borderWidth: 2,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorBanner: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  attemptsBadge: {
    marginTop: 10,
  },
  attemptsText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

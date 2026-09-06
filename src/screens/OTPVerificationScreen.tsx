import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useAssignmentStore } from '../store/assignmentStore';
import { assignmentService } from '../services/assignmentService';
import { ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react-native';

export const OTPVerificationScreen = ({ navigation }: any) => {
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const { partner } = useAuthStore();
  const { currentAssignment, setCurrentAssignment } = useAssignmentStore();
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  
  const inputRefs = useRef<Array<TextInput | null>>([null, null, null, null]);

  if (!currentAssignment) return null;

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    // Take only the last character if multiple are entered
    const char = value.length > 0 ? value[value.length - 1] : '';
    newOtp[index] = char;
    setOtp(newOtp);
    setError('');

    if (char !== '') {
      if (index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 4) return;

    setError('');
    setLoading(true);
    try {
      const res = await assignmentService.verifyDeliveryOTP(
        currentAssignment.assignmentId,
        code,
        partner?.partnerId,
        currentAssignment.estimatedEarnings
      );
      if (res.success) {
        setCurrentAssignment(null);
        Alert.alert(
          'Delivery Completed! 🎉',
          `Order #${currentAssignment.orderId.substring(0, 8)} successfully delivered.`,
          [{ text: 'Return to Dashboard', onPress: () => navigation.navigate('MainTabs', { screen: 'Dashboard' }) }]
        );
      } else {
        const remaining = res.remainingAttempts ?? Math.max(0, attemptsRemaining - 1);
        setAttemptsRemaining(remaining);
        setError(res.error || 'Invalid OTP code.');
        setOtp(['', '', '', '']);
        inputRefs.current[0]?.focus();
        
        if (remaining <= 0) {
          Alert.alert(
            'OTP Retry Lockout',
            'Maximum verification attempts exceeded. Please contact Support for Admin override.',
            [{ text: 'Report Issue', onPress: () => navigation.navigate('DeliveryFailure') }]
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowRight size={24} color="#dee2f5" style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RapidMedicoco</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleSection}>
          <View style={styles.iconWrapper}>
            <ShieldCheck size={40} color="#4fdbc8" />
            <View style={styles.iconGlow} />
          </View>
          <Text style={styles.title}>Delivery OTP</Text>
          <Text style={styles.subtitle}>
            Ask the customer for the 4-digit verification code to complete order <Text style={styles.orderHighlight}>#{currentAssignment.orderId.substring(0, 8)}</Text>
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardGlow} />
          
          <View style={styles.attemptsBadge}>
            <Text style={styles.attemptsText}>
              {attemptsRemaining} attempts remaining
            </Text>
          </View>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.otpInput,
                  error ? styles.otpInputError : null,
                  digit ? styles.otpInputFilled : null,
                ]}
                value={digit}
                onChangeText={(val) => handleOtpChange(val, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.divider} />

          <TouchableOpacity
            style={[
              styles.verifyBtn,
              (otp.join('').length < 4 || loading) && styles.verifyBtnDisabled
            ]}
            onPress={handleVerifyOTP}
            disabled={otp.join('').length < 4 || loading}
          >
            <Text style={styles.verifyBtnText}>
              {loading ? 'VERIFYING...' : 'VERIFY & COMPLETE'}
            </Text>
            {!loading && <CheckCircle2 size={24} color="#00201c" />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.resendBtn}
          onPress={() => navigation.navigate('DeliveryFailure')}
        >
          <Text style={styles.resendBtnText}>Customer cannot provide OTP?</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.bg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.primary,
    fontFamily: 'Inter',
  },
  scrollContent: {
    padding: 16,
    alignItems: 'center',
    paddingTop: 40,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4fdbc820',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4fdbc820',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  orderHighlight: {
    color: theme.textPrimary,
    fontWeight: '700',
  },
  card: {
    width: '100%',
    backgroundColor: theme.cardBg,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff10',
    position: 'relative',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#adc6ff10',
  },
  attemptsBadge: {
    backgroundColor: '#93000a30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffb4ab30',
    marginBottom: 32,
  },
  attemptsText: {
    color: theme.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    marginBottom: 8,
  },
  otpInput: {
    width: 64,
    height: 80,
    backgroundColor: theme.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffffff10',
    color: theme.textPrimary,
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: '#adc6ff50',
    backgroundColor: '#adc6ff05',
  },
  otpInputError: {
    borderColor: theme.danger,
  },
  errorText: {
    color: theme.danger,
    fontSize: 14,
    marginTop: 16,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#ffffff10',
    marginVertical: 24,
  },
  verifyBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.success,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    color: '#00201c',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  resendBtn: {
    marginTop: 32,
    padding: 12,
  },
  resendBtnText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

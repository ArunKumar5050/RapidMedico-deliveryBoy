import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { authService, SignupPayload } from '../services/authService';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react-native';

import Svg, { Circle } from 'react-native-svg';

export const AuthOTPVerifyScreen = ({ route, navigation }: any) => {
  const { phone = '', mode = 'login', signupData } = route.params || {};
  const { setPartner } = useAuthStore();
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();

  const [digits, setDigits] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);

  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...digits];

    if (cleaned.length > 1) {
      // Handle paste or auto-fill
      const pasted = cleaned.slice(0, 4).split('');
      for (let i = 0; i < 4; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      if (newDigits.every((d) => d !== '')) {
        handleVerify(newDigits.join(''));
      }
      return;
    }

    newDigits[index] = cleaned;
    setDigits(newDigits);
    setError('');

    if (cleaned && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-verify if last digit entered
    if (cleaned && index === 3) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 4) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async (codeOverride?: string) => {
    const code = codeOverride || digits.join('');
    if (code.length !== 4) {
      setError('Please enter the full 4-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authService.verifyAuthOTP(phone, code, signupData);
      if (res.success && res.partner) {
        setPartner(res.partner);
        // Authentication state is updated, RootNavigator automatically switches to protected MainTabs!
      } else {
        setError(res.error || 'Invalid verification code. Please try 1234.');
      }
    } catch (e: any) {
      if (e?.message?.toLowerCase().includes('offline')) {
        setError('Network is offline. Please check your connection and try again.');
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResendTimer(30);
    setError('');
    try {
      await authService.sendOTP(phone);
      Alert.alert('Code Sent', `A new verification code was sent to +91 ${phone}`);
    } catch (e) {
      setError('Could not resend OTP. Please try again.');
    }
  };

  const formattedPhone = phone.length === 10 ? `+91 ${phone.slice(0, 2)}***${phone.slice(7)}` : `+91 ${phone}`;
  const isFilled = digits.every(d => d !== '');

  // Progress Circle Calculation
  const radius = 20;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (resendTimer / 30) * circumference;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 150,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <View style={[styles.backIconContainer, { backgroundColor: theme.cardBg }]}>
            <ArrowLeft size={24} color={theme.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Auth Card */}
        <View style={styles.cardContainer}>
          <View
            style={[styles.glassPanel, { backgroundColor: 'rgba(17, 24, 39, 0.8)' }]}
          />
          <View style={styles.cardContent}>
            {/* Header */}
            <View style={styles.headerSection}>
              <View style={[styles.iconContainer, { backgroundColor: theme.cardBg }]}>
                <ShieldCheck size={32} color={theme.primary} />
                <View style={styles.pulseDot} />
              </View>
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Verify OTP</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Code sent to <Text style={{ color: theme.textPrimary, fontWeight: '500' }}>{formattedPhone}</Text>
              </Text>
            </View>

            {/* OTP Inputs */}
            <View style={styles.otpInputsRow}>
              {digits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={inputRefs[index]}
                  style={[
                    styles.digitBox,
                    {
                      backgroundColor: digit ? theme.cardBg : theme.cardBg,
                      borderColor: digit
                        ? theme.primary
                        : error
                        ? theme.danger
                        : 'rgba(255,255,255,0.1)',
                      color: theme.textPrimary,
                    },
                  ]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(val) => handleDigitChange(index, val)}
                  onKeyPress={(e) => handleKeyPress(index, e)}
                  autoFocus={index === 0}
                  selectTextOnFocus
                />
              ))}
            </View>
            
            {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}

            {/* Resend Timer */}
            <View style={styles.timerSection}>
              <View style={styles.timerRingContainer}>
                <Svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Circle
                    cx="24"
                    cy="24"
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  <Circle
                    cx="24"
                    cy="24"
                    r={radius}
                    stroke={theme.primary}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    fill="none"
                    strokeLinecap="round"
                  />
                </Svg>
                <Text style={[styles.timerText, { color: theme.primary }]}>{resendTimer}</Text>
              </View>
              <Text style={[styles.resendPrompt, { color: theme.textSecondary }]}>Didn't receive? </Text>
              <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0}>
                <Text style={[
                  styles.resendAction, 
                  { color: theme.primary, opacity: resendTimer > 0 ? 0.5 : 1 }
                ]}>
                  Resend
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Button */}
            <TouchableOpacity 
              style={[styles.verifyBtn, (!isFilled || loading) && { opacity: 0.5 }]} 
              onPress={() => handleVerify()} 
              disabled={!isFilled || loading}
            >
              <View
                style={[styles.verifyBtnGradient, { backgroundColor: theme.success }]}
              >
                {loading ? (
                  <View style={styles.spinner} />
                ) : (
                  <>
                    <Text style={[styles.verifyBtnText, { color: '#00285d' }]}>
                      {mode === 'signup' ? 'Verify & Enter' : 'Verify Securely'}
                    </Text>
                    <ShieldCheck size={18} color="#00285d" style={{ marginLeft: 8 }} />
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Security Badge */}
            <View style={styles.securityBadge}>
              <Lock size={14} color={theme.textMuted} />
              <Text style={[styles.securityBadgeText, { color: theme.textMuted }]}>
                End-to-end encrypted channel
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 32,
    left: 20,
    zIndex: 10,
  },
  backIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 15,
  },
  glassPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  cardContent: {
    padding: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  pulseDot: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.success,
    shadowColor: theme.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  otpInputsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24, // Added to fix alignment
  },
  digitBox: {
    width: 48,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 16,
  },
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  timerRingContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timerText: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '500',
  },
  resendPrompt: {
    fontSize: 14,
  },
  resendAction: {
    fontSize: 14,
    fontWeight: '500',
  },
  verifyBtn: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: theme.primaryGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  verifyBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    color: '#00285d',
    fontSize: 16,
    fontWeight: '600',
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: 'white',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

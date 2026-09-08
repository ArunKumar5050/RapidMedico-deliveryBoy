import React, { useState } from 'react';
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
import { authService, DEMO_PARTNERS } from '../services/authService';
import { ShieldCheck, PackagePlus, CheckCircle, ArrowRight } from 'lucide-react-native';


export const LoginScreen = ({ navigation }: any) => {
  const { setPartner } = useAuthStore();
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidPhone = phone.length === 10;

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (error) setError('');
  };

  const handleRequestOTP = async () => {
    if (!isValidPhone) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authService.sendOTP(phone);
      if (res.success) {
        navigation.navigate('AuthOTPVerify', { phone, mode: 'login' });
      }
    } catch (e: any) {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (demoPartner: (typeof DEMO_PARTNERS)[0]) => {
    setPartner(demoPartner);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 20,
            paddingBottom: Math.max(insets.bottom, 24) + 150,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Branding */}
        <View style={styles.heroSection}>
          <View style={[styles.iconContainer, { backgroundColor: theme.cardBg, borderColor: 'rgba(255,255,255,0.1)' }]}>
            <PackagePlus size={40} color={theme.primary} />
            <View style={[styles.glowingRing, { borderColor: 'rgba(77,142,255,0.3)' }]} />
          </View>
          <Text style={[styles.brandName, { color: theme.primary }]}>RapidMedico</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>MEDICAL LOGISTICS</Text>
        </View>

        {/* Login Card Container */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: 'rgba(255,255,255,0.1)' }]}>
          <View
            style={[styles.cardGradientOverlay, { backgroundColor: 'rgba(17,24,39,0.5)' }]}
            pointerEvents="none"
          />
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Delivery Partner Login</Text>

          {/* Phone Number Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Mobile Number</Text>
            <View
              style={[
                styles.phoneInputRow,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: error ? theme.danger : (isValidPhone ? theme.tertiaryAccent : 'rgba(255,255,255,0.1)'),
                },
              ]}
            >
              <View style={[styles.countryCodeBadge, { backgroundColor: theme.cardBg, borderColor: 'rgba(255,255,255,0.1)' }]}>
                <Text style={[styles.countryCode, { color: theme.textPrimary }]}>+91</Text>
              </View>
              <TextInput
                style={[styles.phoneTextInput, { color: theme.textPrimary }]}
                placeholder="Enter 10-digit number"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={handlePhoneChange}
                autoFocus={false}
              />
              {isValidPhone && (
                <View style={styles.validIconContainer}>
                  <CheckCircle size={18} color={theme.tertiaryAccent} />
                </View>
              )}
            </View>
            {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}
          </View>

          {/* Submit CTA */}
          <TouchableOpacity 
            style={[styles.submitBtn, (!isValidPhone || loading) && { opacity: 0.5 }]} 
            onPress={handleRequestOTP} 
            disabled={!isValidPhone || loading}
          >
            <View style={[styles.submitBtnGradient, { backgroundColor: theme.success }]}>
              <Text style={styles.submitBtnText}>{loading ? 'SENDING...' : 'Send OTP'}</Text>
              {!loading && <ArrowRight size={18} color="#00285d" style={{ marginLeft: 8 }} />}
            </View>
          </TouchableOpacity>

          {/* Footer Links */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>First time? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={[styles.footerLink, { color: theme.primary }]}>Register below</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1-Tap Quick Demo Accounts */}
        <View style={styles.demoSection}>
          <View style={styles.demoHeaderRow}>
            <ShieldCheck size={16} color={theme.textMuted} />
            <Text style={[styles.demoSectionTitle, { color: theme.textMuted }]}>
              QUICK DEMO ACCOUNTS (1-TAP TEST)
            </Text>
          </View>

          <View style={styles.demoButtonsContainer}>
            {DEMO_PARTNERS.map((demo) => (
              <TouchableOpacity
                key={demo.partnerId}
                style={[
                  styles.demoChip,
                  {
                    backgroundColor: theme.cardBg,
                    borderColor: 'rgba(255,255,255,0.1)',
                  },
                ]}
                onPress={() => handleQuickDemoLogin(demo)}
                activeOpacity={0.7}
              >
                <View style={[styles.demoAvatar, { backgroundColor: 'rgba(173,198,255,0.1)' }]}>
                  <Text style={[styles.demoAvatarText, { color: theme.primary }]}>
                    {demo.fullName.substring(0, 1)}
                  </Text>
                </View>
                <View style={styles.demoChipTextCol}>
                  <Text style={[styles.demoChipName, { color: theme.textPrimary }]}>
                    {demo.fullName}
                  </Text>
                  <Text style={[styles.demoChipDetail, { color: theme.textSecondary }]}>
                    {demo.vehicleNumber} • {demo.availability}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
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
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  glowingRing: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: theme.primaryGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 2,
    marginTop: 4,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
    marginBottom: 32,
  },
  cardGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
  },
  countryCodeBadge: {
    height: '100%',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  countryCode: {
    fontSize: 12,
    fontWeight: '600',
  },
  phoneTextInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
  },
  validIconContainer: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  submitBtn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 5,
  },
  submitBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#00285d',
    fontSize: 14,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  demoSection: {
    width: '100%',
    maxWidth: 400,
    marginTop: 16,
  },
  demoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    justifyContent: 'center',
  },
  demoSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  demoButtonsContainer: {
    gap: 10,
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  demoAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  demoChipTextCol: {
    flex: 1,
  },
  demoChipName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  demoChipDetail: {
    fontSize: 12,
    fontWeight: '500',
  },
});


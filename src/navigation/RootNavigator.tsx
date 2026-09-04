import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

// Auth Stack Screens
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { AuthOTPVerifyScreen } from '../screens/AuthOTPVerifyScreen';

// Protected App Stack Screens
import { MainTabNavigator } from './MainTabNavigator';
import { ActiveDeliveryScreen } from '../screens/ActiveDeliveryScreen';
import { PharmacyPickupScreen } from '../screens/PharmacyPickupScreen';
import { CustomerDeliveryScreen } from '../screens/CustomerDeliveryScreen';
import { OTPVerificationScreen } from '../screens/OTPVerificationScreen';
import { DeliveryFailureScreen } from '../screens/DeliveryFailureScreen';
import { KYCUploadScreen } from '../screens/KYCUploadScreen';
import { NewDeliveryAlertScreen } from '../screens/NewDeliveryAlertScreen';
import { Bike } from 'lucide-react-native';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, checkPersistedAuth } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    // Check if user has an existing persisted session in AsyncStorage
    checkPersistedAuth();
  }, []);

  // Loading / Splash state while checking session
  if (isLoading) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: theme.bg }]}>
        <View style={[styles.splashLogoGlow, { backgroundColor: theme.primaryBg, borderColor: theme.primary }]}>
          <Bike size={44} color={theme.primary} />
        </View>
        <Text style={[styles.splashTitle, { color: theme.textPrimary }]}>RapidMedi</Text>
        <Text style={[styles.splashSubtitle, { color: theme.textSecondary }]}>
          Delivery Partner Network
        </Text>
        <ActivityIndicator size="large" color={theme.primary} style={styles.splashSpinner} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.bg } }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: theme.cardBg },
          headerTitleStyle: { color: theme.textPrimary, fontWeight: '800' },
          headerTintColor: theme.primary,
        }}
      >
        {!isAuthenticated ? (
          // ==================== AUTH STACK (UNAUTHENTICATED) ====================
          // Strict Route Guard: Unauthenticated users CANNOT access dashboard or delivery screens
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{
                title: 'Driver Registration',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="AuthOTPVerify"
              component={AuthOTPVerifyScreen}
              options={{
                title: 'OTP Verification',
                headerShown: false,
              }}
            />
          </>
        ) : (
          // ==================== PROTECTED APP STACK (AUTHENTICATED) ====================
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ActiveDelivery"
              component={ActiveDeliveryScreen}
              options={{ title: 'Active Delivery' }}
            />
            <Stack.Screen
              name="PharmacyPickup"
              component={PharmacyPickupScreen}
              options={{ title: 'Pharmacy Handoff' }}
            />
            <Stack.Screen
              name="CustomerDelivery"
              component={CustomerDeliveryScreen}
              options={{ title: 'Customer Handoff' }}
            />
            <Stack.Screen
              name="OTPVerification"
              component={OTPVerificationScreen}
              options={{ title: 'Delivery OTP' }}
            />
            <Stack.Screen
              name="DeliveryFailure"
              component={DeliveryFailureScreen}
              options={{ title: 'Report Delivery Issue' }}
            />
            <Stack.Screen
              name="KYCUpload"
              component={KYCUploadScreen}
              options={{ title: 'KYC Compliance' }}
            />
          </>
        )}
      </Stack.Navigator>

      {/* High-priority delivery assignment offer modal — only active when partner is authenticated */}
      {isAuthenticated && <NewDeliveryAlertScreen />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  splashLogoGlow: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  splashSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  splashSpinner: {
    marginTop: 32,
  },
});

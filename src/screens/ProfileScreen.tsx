import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { ShieldCheck, Bike, Award, Moon, Bell, LogOut, CheckCircle2 } from 'lucide-react-native';

export const ProfileScreen = ({ navigation }: any) => {
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const { partner, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Mobile Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerLeft}>
          <Image 
            source={{ uri: partner?.profilePhotoUrl || 'https://ui-avatars.com/api/?name=' + (partner?.fullName || 'Partner') }} 
            style={styles.avatarSmall} 
          />
          <Text style={styles.headerTitle}>RapidMedico</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPulse} />
            <Image 
              source={{ uri: partner?.profilePhotoUrl || 'https://ui-avatars.com/api/?name=' + (partner?.fullName || 'Partner') }} 
              style={styles.avatarLarge} 
            />
            <View style={styles.verifiedBadge}>
              <CheckCircle2 size={16} color="#003915" />
            </View>
          </View>
          <Text style={styles.nameText}>{partner?.fullName || 'Delivery Partner'}</Text>
          <Text style={styles.phoneText}>{partner?.phone || '+91 -'}</Text>
          <View style={styles.vehicleBadge}>
            <Bike size={16} color="#4fdbc8" />
            <Text style={styles.vehicleBadgeText}>EV PARTNER PRO</Text>
          </View>
        </View>

        {/* KYC Status */}
        <View style={styles.kycCard}>
          <View style={styles.kycLeft}>
            <View style={styles.kycIconWrapper}>
              <ShieldCheck size={24} color="#4ae176" />
            </View>
            <View>
              <Text style={styles.kycTitle}>KYC Verified</Text>
              <Text style={styles.kycSubtitle}>All documents approved</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('KYCUpload')}>
            <Text style={styles.kycActionText}>VIEW</Text>
          </TouchableOpacity>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <View style={[styles.infoIconWrapper, { backgroundColor: 'rgba(173, 198, 255, 0.15)' }]}>
              <Bike size={24} color="#adc6ff" />
            </View>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>{partner?.vehicleNumber || 'Electric Scooter'}</Text>
            <Text style={styles.infoSubValue}>Active</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={[styles.infoIconWrapper, { backgroundColor: theme.secondaryBg }]}>
              <Award size={24} color="#4fdbc8" />
            </View>
            <Text style={styles.infoLabel}>Training</Text>
            <Text style={styles.infoValue}>Level 2 Bio-Safety</Text>
            <Text style={styles.infoSubValueHighlight}>Valid till Dec 2024</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Moon size={20} color="#c2c6d6" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingSubtitle}>Optimized for night delivery</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.containerHigh, true: theme.primaryGlow }}
              thumbColor={'#ffffff'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrapper}>
                <Bell size={20} color="#c2c6d6" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingSubtitle}>Alerts for critical jobs</Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: theme.containerHigh, true: theme.primaryGlow }}
              thumbColor={'#ffffff'}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={20} color="#ffb4ab" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: theme.bg,
    borderBottomWidth: 1,
    borderBottomColor: theme.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.containerHigh,
    borderWidth: 1,
    borderColor: 'rgba(173, 198, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.primary,
    letterSpacing: -0.5,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  profileSection: {
    alignItems: 'center',
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarPulse: {
    position: 'absolute',
    inset: -4,
    borderRadius: 64,
    backgroundColor: 'rgba(173, 198, 255, 0.2)',
  },
  avatarLarge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: theme.primary,
    backgroundColor: theme.subtleBox,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.success,
    borderWidth: 2,
    borderColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  phoneText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 12,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.containerHigh,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(173, 198, 255, 0.2)',
  },
  vehicleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
    letterSpacing: 1,
  },
  kycCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 225, 118, 0.3)',
    marginBottom: 24,
  },
  kycLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kycIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  kycSubtitle: {
    fontSize: 11,
    color: theme.success,
    marginTop: 2,
  },
  kycActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
    letterSpacing: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  infoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  infoSubValue: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 4,
  },
  infoSubValueHighlight: {
    fontSize: 11,
    color: theme.secondaryAccent,
    marginTop: 4,
  },
  settingsSection: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.containerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  settingSubtitle: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.tabBarBorder,
  },
  dangerZone: {
    marginBottom: 24,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.5)',
    backgroundColor: 'rgba(147, 0, 10, 0.1)',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.danger,
  },
});

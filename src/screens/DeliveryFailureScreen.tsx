import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, HeadphonesIcon, ArrowRight, FileText, Info } from 'lucide-react-native';
import { useAssignmentStore } from '../store/assignmentStore';

export const DeliveryFailureScreen = ({ navigation, route }: any) => {
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { currentAssignment, setCurrentAssignment } = useAssignmentStore();

  const reason = route.params?.reason || 'Customer unavailable / Incorrect address';
  const orderId = currentAssignment?.orderId || 'MED-88492-X';

  const handleReturnToDashboard = () => {
    setCurrentAssignment(null);
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Dashboard' } }],
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.mainContent, { paddingTop: Math.max(insets.top, 40) }]}>
        <View style={styles.iconContainer}>
          <View style={styles.pulseOuter} />
          <View style={styles.pulseInner} />
          <View style={styles.iconCircle}>
            <AlertTriangle size={32} color="#ffb4ab" />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Delivery Issue Reported</Text>
          <Text style={styles.subtitle}>We've logged the problem. Support will review this shortly.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardGlow} />
          
          <View style={styles.cardRow}>
            <FileText size={20} color="#8c909f" />
            <View style={styles.cardTextContent}>
              <Text style={styles.cardLabel}>ORDER ID</Text>
              <Text style={styles.cardValue}>#{orderId.substring(0, 10).toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <Info size={20} color="#ffb4ab" />
            <View style={styles.cardTextContent}>
              <Text style={styles.cardLabel}>REASON RECORDED</Text>
              <Text style={styles.cardValue}>{reason}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity style={styles.supportBtn}>
          <HeadphonesIcon size={18} color="#dee2f5" />
          <Text style={styles.supportBtnText}>Report to Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dashboardBtn} onPress={handleReturnToDashboard}>
          <Text style={styles.dashboardBtnText}>Return to Dashboard</Text>
          <ArrowRight size={18} color="#002e6a" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  pulseOuter: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 180, 171, 0.2)',
  },
  pulseInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 180, 171, 0.3)',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#93000a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 180, 171, 0.5)',
    zIndex: 10,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.danger,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 128,
    height: 128,
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
    borderRadius: 64,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.tabBarBorder,
    paddingBottom: 16,
  },
  cardTextContent: {
    marginLeft: 12,
  },
  cardLabel: {
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  supportBtn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#424754',
    backgroundColor: theme.subtleBox,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  supportBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
    letterSpacing: 0.5,
  },
  dashboardBtn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    backgroundColor: theme.primaryGlow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dashboardBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#002e6a',
    letterSpacing: 0.5,
  },
});

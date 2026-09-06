import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useEarningsStore } from '../store/earningsStore';
import { earningsService } from '../services/earningsService';
import { formatCurrency } from '../utils/formatting';
import { Wallet, TrendingUp, Calendar, Clock, AlertCircle, RefreshCw, Truck, Trash2 } from 'lucide-react-native';

const timeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const EarningsScreen = () => {
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const { partner } = useAuthStore();
  const { earnings, setEarnings, isLoading, setLoading } = useEarningsStore();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!partner?.partnerId) return;

    setLoading(true);
    // Real-time Firestore subscription to partner's earnings & completed deliveries
    const unsubscribe = earningsService.subscribePartnerEarnings(
      partner.partnerId,
      (liveEarnings) => {
        setEarnings(liveEarnings);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [partner?.partnerId]);

  const handleRefresh = async () => {
    if (!partner?.partnerId) return;
    setRefreshing(true);
    const data = await earningsService.getPartnerEarnings(partner.partnerId);
    setEarnings(data);
    setRefreshing(false);
  };

  const [clearing, setClearing] = useState(false);

  const handleClearEarnings = () => {
    if (!partner?.partnerId) return;
    Alert.alert(
      'Reset Delivery Records & Earnings?',
      'Are you sure you want to reset all completed delivery records and financial stats for this partner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Records',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              const success = await earningsService.clearAllDeliveryRecords(partner.partnerId);
              if (success) {
                Alert.alert('Records Reset', 'All delivery records and earnings have been reset.');
              } else {
                Alert.alert('Error', 'Failed to reset records.');
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Error resetting records.');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const deliveryList = earnings?.deliveryEarnings || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerLeft}>
          <Image 
            source={{ uri: partner?.profilePhotoUrl || 'https://ui-avatars.com/api/?name=' + (partner?.fullName || 'Partner') }} 
            style={styles.avatar} 
          />
          <Text style={styles.headerTitle}>RapidMedicoco</Text>
        </View>
        <TouchableOpacity style={styles.headerRight}>
          <RefreshCw size={20} color="#adc6ff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4ae176" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Financial Analytics</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE SYNC</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClearEarnings}
            disabled={clearing}
            activeOpacity={0.7}
          >
            <Trash2 size={15} color="#ffb4ab" />
            <Text style={styles.clearBtnText}>
              {clearing ? 'Resetting...' : 'Clear Records'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Today's Total */}
          <View style={[styles.card, styles.todayCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.todayCardLabel}>TODAY'S TOTAL</Text>
              <Wallet size={20} color="rgba(173, 198, 255, 0.8)" />
            </View>
            <Text style={styles.todayCardAmount}>{formatCurrency(earnings?.today || 0)}</Text>
          </View>

          {/* This Week & Month */}
          <View style={styles.rowCards}>
            <View style={[styles.card, styles.halfCard]}>
              <Text style={styles.cardLabel}>THIS WEEK</Text>
              <Text style={styles.cardAmount}>{formatCurrency(earnings?.thisWeek || 0)}</Text>
            </View>
            <View style={[styles.card, styles.halfCard]}>
              <Text style={styles.cardLabel}>THIS MONTH</Text>
              <Text style={styles.cardAmount}>{formatCurrency(earnings?.thisMonth || 0)}</Text>
            </View>
          </View>

          {/* Pending Settlement */}
          <View style={[styles.card, styles.pendingCard]}>
            <View style={styles.pendingLeft}>
              <View style={styles.pendingIconWrapper}>
                <Clock size={20} color="#4fdbc8" />
              </View>
              <View>
                <Text style={styles.pendingTitle}>Pending Settlement</Text>
                <Text style={styles.pendingSubtitle}>Expected by 11 PM</Text>
              </View>
            </View>
            <Text style={styles.pendingAmount}>{formatCurrency(earnings?.pendingSettlement || 0)}</Text>
          </View>
        </View>

        {/* Recent Delivery Earnings */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Delivery Earnings</Text>

          {isLoading && deliveryList.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#4ae176" />
              <Text style={styles.loadingText}>Syncing live earnings from database...</Text>
            </View>
          ) : deliveryList.length === 0 ? (
            <View style={styles.emptyCard}>
              <AlertCircle size={32} color="#c2c6d6" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Delivery Earnings Yet</Text>
              <Text style={styles.emptySub}>
                Completed customer deliveries will automatically compute base pay, distance incentives, and bonuses here in real time.
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {deliveryList.map((item, index) => (
                <View key={item.assignmentId} style={styles.listItem}>
                  <View style={styles.listLeft}>
                    <View style={styles.listIconWrapper}>
                      <Truck size={18} color="#c2c6d6" />
                    </View>
                    <View>
                      <Text style={styles.listTitle}>ORD-{item.orderId.substring(0, 4)}</Text>
                      <Text style={styles.listSubtitle} numberOfLines={1}>
                        Base: {formatCurrency(item.basePay)} • Dist: {formatCurrency(item.distanceIncentive)}
                      </Text>
                      <Text style={styles.listTime}>
                        {timeAgo(new Date(item.date))}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.listAmount}>+{formatCurrency(item.amount)}</Text>
                </View>
              ))}
            </View>
          )}
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
    justifyContent: 'space-between',
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.containerHigh,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.primary,
  },
  headerRight: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.tabBarBorder,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.4)',
    backgroundColor: 'rgba(255, 180, 171, 0.15)',
  },
  clearBtnText: {
    color: '#ffb4ab',
    fontSize: 12,
    fontWeight: '700',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.success,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.success,
    letterSpacing: 0.5,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  card: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 16,
  },
  todayCard: {
    height: 128,
    justifyContent: 'space-between',
    borderColor: 'rgba(173, 198, 255, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  todayCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
    letterSpacing: 1,
  },
  todayCardAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.textPrimary,
    letterSpacing: -0.5,
  },
  rowCards: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
    height: 112,
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    letterSpacing: 1,
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 219, 200, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  pendingSubtitle: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  pendingAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.secondaryAccent,
  },
  recentSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 16,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  emptyCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.tabBarBorder,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.tabBarBorder,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  listIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.containerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  listSubtitle: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  listTime: {
    fontSize: 10,
    color: theme.textMuted,
    marginTop: 2,
  },
  listAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.success,
  },
});

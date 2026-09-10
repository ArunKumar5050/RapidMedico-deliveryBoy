import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { earningsService } from '../services/earningsService';
import { DeliveryHistory } from '../types';
import { formatCurrency } from '../utils/formatting';
import { History, CheckCircle2, XCircle, Clock, Search, Filter, Trash2 } from 'lucide-react-native';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDate = (d: Date): string => {
  const month = MONTHS[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${month} ${day}, ${hours}:${mins}`;
};

export const DeliveryHistoryScreen = () => {
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const { partner } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<DeliveryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'WEEK' | 'MONTH'>('ALL');

  useEffect(() => {
    if (!partner?.partnerId) return;
    
    setLoading(true);
    const unsubscribe = earningsService.subscribeDeliveryHistory(
      partner.partnerId,
      (data) => {
        setHistory(data);
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
    const data = await earningsService.getDeliveryHistory(partner.partnerId);
    setHistory(data);
    setRefreshing(false);
  };

  const [clearing, setClearing] = useState(false);

  const handleClearHistory = () => {
    if (!partner?.partnerId) return;
    Alert.alert(
      'Clear All Delivery Records?',
      'Are you sure you want to permanently clear all completed delivery history and financial stats? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Records',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              const success = await earningsService.clearAllDeliveryRecords(partner.partnerId);
              if (success) {
                setHistory([]);
                Alert.alert('Records Cleared', 'All delivery records have been cleared successfully.');
              } else {
                Alert.alert('Error', 'Failed to clear delivery records.');
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Error clearing records.');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const filteredHistory = history.filter((item) => {
    if (filter === 'ALL') return true;
    
    const now = new Date();
    const itemDate = new Date(item.completedAt);
    
    if (filter === 'WEEK') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return itemDate >= weekAgo;
    }
    
    if (filter === 'MONTH') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return itemDate >= monthAgo;
    }
    
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerLeft}>
          <Image 
            source={{ uri: partner?.profilePhotoUrl || 'https://ui-avatars.com/api/?name=' + (partner?.fullName || 'Partner') }} 
            style={styles.avatar} 
          />
          <Text style={styles.headerTitle}>RapidMedico</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View style={styles.titleRow}>
            <History size={24} color={theme.primary} />
            <Text style={styles.pageTitle}>Delivery History</Text>
          </View>
          <TouchableOpacity
            style={styles.clearRecordsBtn}
            onPress={handleClearHistory}
            disabled={clearing}
            activeOpacity={0.7}
          >
            <Trash2 size={15} color={theme.danger} />
            <Text style={styles.clearRecordsBtnText}>
              {clearing ? 'Clearing...' : 'Clear All'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Row */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'ALL' && styles.filterBtnActive]}
            onPress={() => setFilter('ALL')}
          >
            <Text style={[styles.filterBtnText, filter === 'ALL' && styles.filterBtnTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'WEEK' && styles.filterBtnActive]}
            onPress={() => setFilter('WEEK')}
          >
            <Text style={[styles.filterBtnText, filter === 'WEEK' && styles.filterBtnTextActive]}>This Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'MONTH' && styles.filterBtnActive]}
            onPress={() => setFilter('MONTH')}
          >
            <Text style={[styles.filterBtnText, filter === 'MONTH' && styles.filterBtnTextActive]}>This Month</Text>
          </TouchableOpacity>
        </View>

        {/* List Content */}
        <View style={styles.listContainer}>
          {loading && history.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={styles.loadingText}>Loading history...</Text>
            </View>
          ) : filteredHistory.length === 0 ? (
            <View style={styles.emptyBox}>
              <History size={32} color="#424754" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Deliveries Found</Text>
              <Text style={styles.emptySub}>Deliveries will appear here once they are completed or cancelled.</Text>
            </View>
          ) : (
            filteredHistory.map((item) => {
              const isDelivered = item.status === 'completed';
              return (
                <View 
                  key={item.entryId} 
                  style={[styles.card, !isDelivered && styles.cardCancelled]}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.orderId}>#{item.orderId.substring(0, 8).toUpperCase()}</Text>
                      <Text style={styles.orderDate}>{formatDate(new Date(item.completedAt))}</Text>
                    </View>
                    <View style={[styles.statusBadge, !isDelivered && styles.statusBadgeCancelled]}>
                      {isDelivered ? (
                        <CheckCircle2 size={14} color={theme.success} />
                      ) : (
                        <XCircle size={14} color="#c2c6d6" />
                      )}
                      <Text style={[styles.statusText, !isDelivered && styles.statusTextCancelled]}>
                        {isDelivered ? 'Delivered' : 'Cancelled'}
                      </Text>
                    </View>
                  </View>

                  {isDelivered && (
                    <View style={styles.routeContainer}>
                      <View style={styles.routeTimeline}>
                        <View style={styles.dotStart} />
                        <View style={styles.line} />
                        <View style={styles.dotEnd} />
                      </View>
                      <View style={styles.routeDetails}>
                        <Text style={styles.routeText} numberOfLines={1}>{item.pickupAreaCoarse}</Text>
                        <Text style={styles.routeTextSecondary} numberOfLines={1}>{item.deliveryAreaCoarse}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.cardFooter}>
                    {isDelivered ? (
                      <View style={styles.timeWrapper}>
                        <Clock size={16} color="#c2c6d6" />
                        <Text style={styles.timeText}>Completed</Text>
                      </View>
                    ) : (
                      <Text style={styles.timeText}>Failed Delivery</Text>
                    )}
                    <Text style={[styles.amountText, !isDelivered && styles.amountTextCancelled]}>
                      {formatCurrency(item.earnings)}
                    </Text>
                  </View>
                </View>
              );
            })
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
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  clearRecordsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.4)',
    backgroundColor: theme.dangerBg,
  },
  clearRecordsBtnText: {
    color: theme.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: theme.subtleBox,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 4,
    marginBottom: 24,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterBtnActive: {
    backgroundColor: theme.containerHigh,
    borderWidth: 1,
    borderColor: theme.tabBarBorder,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  filterBtnTextActive: {
    color: theme.primary,
  },
  listContainer: {
    gap: 16,
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
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  card: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 16,
  },
  cardCancelled: {
    opacity: 0.75,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.textSecondary,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: theme.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 167, 75, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(74, 225, 118, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusBadgeCancelled: {
    backgroundColor: theme.containerHigh,
    borderColor: '#424754',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.success,
  },
  statusTextCancelled: {
    color: theme.textSecondary,
  },
  routeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  routeTimeline: {
    alignItems: 'center',
    paddingTop: 4,
  },
  dotStart: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.primary,
  },
  line: {
    width: 2,
    height: 24,
    backgroundColor: '#424754',
    marginVertical: 4,
  },
  dotEnd: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.danger,
  },
  routeDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  routeText: {
    fontSize: 14,
    color: theme.textPrimary,
  },
  routeTextSecondary: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: theme.tabBarBorder,
    paddingTop: 12,
    marginTop: 4,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.primary,
  },
  amountTextCancelled: {
    color: theme.textSecondary,
  },
});

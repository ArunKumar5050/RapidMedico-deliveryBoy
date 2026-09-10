import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ActiveDeliveryScreen } from '../screens/ActiveDeliveryScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { DeliveryHistoryScreen } from '../screens/DeliveryHistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../store/themeStore';

const Tab = createBottomTabNavigator();

export const MainTabNavigator = () => {
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, 10);
  const tabHeight = 60 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.headerBg,
          borderBottomWidth: 1,
          borderBottomColor: theme.tabBarBorder,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: theme.textPrimary,
          fontWeight: '900',
          fontSize: 18,
          letterSpacing: 0.5,
        },
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopWidth: 1.5,
          borderTopColor: theme.tabBarBorder,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0.4,
          marginBottom: 2,
        },
        tabBarIcon: ({ focused }) => {
          let icon = '⚡';
          if (route.name === 'Dashboard') icon = '⚡';
          else if (route.name === 'Active') icon = '🎯';
          else if (route.name === 'Earnings') icon = '💰';
          else if (route.name === 'History') icon = '📦';
          else if (route.name === 'Profile') icon = '👤';

          return (
            <View
              style={[
                styles.iconContainer,
                focused && { backgroundColor: theme.primaryBg },
              ]}
            >
              <Text style={styles.iconText}>{icon}</Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Command' }} />
      <Tab.Screen name="Active" component={ActiveDeliveryScreen} options={{ title: 'Active Order' }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} options={{ title: 'Earnings' }} />
      <Tab.Screen name="History" component={DeliveryHistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  iconText: {
    fontSize: 16,
  },
});

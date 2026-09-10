import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ActiveDeliveryScreen } from '../screens/ActiveDeliveryScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { DeliveryHistoryScreen } from '../screens/DeliveryHistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useThemeStore } from '../store/themeStore';

const Tab = createBottomTabNavigator();

const commandIcon = require('../../assets/command-icon.png');
const activeOrderIcon = require('../../assets/active-order-icon.png');
const earningsIcon = require('../../assets/earnings-icon.png');
const historyIcon = require('../../assets/history-icon.png');
const profileIcon = require('../../assets/profile-icon.png');

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
          if (route.name === 'Dashboard') {
            return (
              <View
                style={[
                  styles.iconContainer,
                  focused && { backgroundColor: theme.primaryBg },
                ]}
              >
                <Image
                  source={commandIcon}
                  style={[
                    styles.tabIconImage,
                    { tintColor: focused ? theme.primary : theme.textMuted },
                  ]}
                  resizeMode="contain"
                />
              </View>
            );
          }

          if (route.name === 'Active') {
            return (
              <View
                style={[
                  styles.iconContainer,
                  focused && { backgroundColor: theme.primaryBg },
                ]}
              >
                <Image
                  source={activeOrderIcon}
                  style={[
                    styles.tabIconImage,
                    { tintColor: focused ? theme.primary : theme.textMuted },
                  ]}
                  resizeMode="contain"
                />
              </View>
            );
          }

          if (route.name === 'Earnings') {
            return (
              <View
                style={[
                  styles.iconContainer,
                  focused && { backgroundColor: theme.primaryBg },
                ]}
              >
                <Image
                  source={earningsIcon}
                  style={[
                    styles.tabIconImage,
                    { tintColor: focused ? theme.primary : theme.textMuted },
                  ]}
                  resizeMode="contain"
                />
              </View>
            );
          }

          if (route.name === 'History') {
            return (
              <View
                style={[
                  styles.iconContainer,
                  focused && { backgroundColor: theme.primaryBg },
                ]}
              >
                <Image
                  source={historyIcon}
                  style={[
                    styles.tabIconImage,
                    { tintColor: focused ? theme.primary : theme.textMuted },
                  ]}
                  resizeMode="contain"
                />
              </View>
            );
          }

          if (route.name === 'Profile') {
            return (
              <View
                style={[
                  styles.iconContainer,
                  focused && { backgroundColor: theme.primaryBg },
                ]}
              >
                <Image
                  source={profileIcon}
                  style={[
                    styles.tabIconImage,
                    { tintColor: focused ? theme.primary : theme.textMuted },
                  ]}
                  resizeMode="contain"
                />
              </View>
            );
          }

          return null;
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
  tabIconImage: {
    width: 20,
    height: 20,
  },
  iconText: {
    fontSize: 16,
  },
});



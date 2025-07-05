import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import FeedScreen from '../screens/FeedScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { View, Text } from 'react-native';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#121212', // 黒
            borderTopColor: '#00C6A2',   // ミント色の境界線
            borderTopWidth: 1,
            height: 70,
            paddingBottom: 10,
            paddingTop: 5,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          tabBarActiveTintColor: '#00C6A2',     // ミント
          tabBarInactiveTintColor: '#FFFFFFAA', // 白 (半透明)
          tabBarIcon: ({ color, size }) => {
            let iconName: keyof typeof Feather.glyphMap = 'film';
            if (route.name === '履歴') iconName = 'bookmark';
            else if (route.name === 'リール') iconName = 'film';
            else if (route.name === '設定') iconName = 'settings';
            return <Feather name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="履歴" component={HistoryScreen} />
        <Tab.Screen name="リール" component={FeedScreen} />
        <Tab.Screen name="設定" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack'; // ★★★ 追加 ★★★
import { Feather } from '@expo/vector-icons';

// 画面コンポーネントをインポート
import FeedScreen from '../screens/FeedScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SearchScreen from '../screens/SearchScreen'; // ★★★ 追加 ★★★

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator(); // ★★★ 追加 ★★★

// タブナビゲーション部分を別のコンポーネントとして定義
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'film';
          if (route.name === '履歴') {
            iconName = 'bookmark';
          } else if (route.name === 'リール') {
            iconName = 'film';
          } else if (route.name === '設定') {
            iconName = 'settings';
          }
          return <Feather name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="履歴" component={HistoryScreen} />
      <Tab.Screen name="リール" component={FeedScreen} />
      <Tab.Screen name="設定" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// ★★★ 全体をスタックナビゲーターで囲む ★★★
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Main" 
          component={MainTabs} 
          options={{ headerShown: false }} // タブ画面ではヘッダー不要
        />
        <Stack.Screen 
          name="Search" 
          component={SearchScreen} 
          options={{ title: '論文を検索' }} // 検索画面のヘッダータイトル
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
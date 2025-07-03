import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// ダミーの画面コンポーネントをインポート
import FeedScreen from '../screens/FeedScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

// タブナビゲーターを作成
const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false, // 各画面のヘッダーは非表示にする
        }}
      >
        <Tab.Screen name="履歴" component={HistoryScreen} />
        <Tab.Screen name="リール" component={FeedScreen} />
        <Tab.Screen name="設定" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
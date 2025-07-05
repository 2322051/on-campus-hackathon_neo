import React from 'react';
// ★★★ 変更点1: GestureHandlerRootView をインポート ★★★
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    // ★★★ 変更点2: 全体を GestureHandlerRootView で囲む ★★★
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

// バックエンドの UserSettings 型
interface UserSettings {
  user_id: number;
  character_voice: number;
}

// 選択可能なキャラクターボイスのリスト（IDを1から順に割り振り）
const AVAILABLE_VOICES = [
  { id: 1, name: 'ずんだもん' },
  { id: 2, name: '四国めたん' },
  { id: 3, name: '春日部つむぎ' },
  { id: 4, name: '雨晴はう' },
  { id: 5, name: '波音リツ' },
  { id: 6, name: '玄野武宏' },
  { id: 7, name: '白上虎太郎' },
  { id: 8, name: '青山龍星' },
  { id: 9, name: '冥鳴ひまり' },
  { id: 10, name: '九州そら' },
  { id: 11, name: 'もち子さん' },
  { id: 12, name: '剣崎雌雄' },
  { id: 13, name: 'WhiteCUL,' },
  { id: 14, name: '後鬼' },
  { id: 15, name: 'No.7' },
  { id: 16, name: 'ちび式じい' },
  { id: 17, name: '櫻歌ミコ' },
  { id: 18, name: '小夜/SAYO' },
  { id: 19, name: 'ナースロボ＿タイプＴ' },
  { id: 20, name: '聖騎士 紅桜' },
  { id: 21, name: '雀松朱司' },
  { id: 22, name: '麒ヶ島宗麟' },
  { id: 23, name: '春歌ナナ' },
  { id: 24, name: '猫使アル' },
  { id: 25, name: '猫使ビィ' },
];

// 設定項目表示用のヘルパーコンポーネント
const SettingItem = ({ title, iconName, children }: {
  title: string;
  iconName?: keyof typeof Feather.glyphMap;
  children?: React.ReactNode;
}) => (
  <View style={styles.settingItem}>
    <View style={styles.settingItemLeft}>
      {iconName && <Feather name={iconName} size={24} color="#555" style={styles.settingIcon} />}
      <Text style={styles.settingItemTitle}>{title}</Text>
    </View>
    <View style={styles.settingItemRight}>{children}</View>
  </View>
);

const SettingsScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [initialUserSettings, setInitialUserSettings] = useState<UserSettings | null>(null);
  const [editingVoice, setEditingVoice] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const API_BASE_URL = 'http://127.0.0.1:8000';
  const CURRENT_USER_ID = 1;

  // ユーザー設定を取得
  const fetchUserSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/${CURRENT_USER_ID}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: UserSettings = await response.json();
      setInitialUserSettings(data);
      setEditingVoice(data.character_voice);
    } catch (error) {
      console.error('ユーザー設定の取得に失敗しました:', error);
      Alert.alert('エラー', '設定の読み込みに失敗しました。');
      setInitialUserSettings({ user_id: CURRENT_USER_ID, character_voice: 1 });
      setEditingVoice(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) fetchUserSettings();
  }, [isFocused]);

  // 設定更新ハンドラー
  const handleUpdateSettings = async () => {
    if (!initialUserSettings || isUpdating) return;
    if (editingVoice === initialUserSettings.character_voice) {
      Alert.alert('変更なし', '更新する設定がありません。');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/settings/${CURRENT_USER_ID}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ character_voice: editingVoice }),
        }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const updatedData: UserSettings = await response.json();
      setInitialUserSettings(updatedData);
      setEditingVoice(updatedData.character_voice);
      Alert.alert('成功', '設定を更新しました！');
    } catch (error) {
      console.error('設定の更新に失敗しました:', error);
      Alert.alert('エラー', '設定の保存に失敗しました。もう一度お試しください。');
      fetchUserSettings();
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading || !initialUserSettings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>設定を読み込み中...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>設定</Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* キャラクターボイス設定 */}
        <Text style={styles.sectionTitle}>キャラクターボイス</Text>
        <SettingItem title="ボイス選択" iconName="mic">
          <Picker
            selectedValue={editingVoice}
            onValueChange={(itemValue: number) => setEditingVoice(itemValue)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            {AVAILABLE_VOICES.map((voice) => (
              <Picker.Item key={voice.id} label={voice.name} value={voice.id} />
            ))}
          </Picker>
        </SettingItem>

        {/* 更新ボタン */}
        <TouchableOpacity
          style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
          onPress={handleUpdateSettings}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>設定を更新</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f2f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  headerContainer: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  container: { flex: 1 },
  contentContainer: { paddingBottom: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#666', marginTop: 20, marginBottom: 10, paddingHorizontal: 4 },
  settingItem: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, marginVertical: 4, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  settingItemLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  settingIcon: { marginRight: 15, width: 24, textAlign: 'center' },
  settingItemTitle: { fontSize: 17, color: '#333', fontWeight: '600' },
  settingItemRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  picker: { height: 150, width: '100%' },
  pickerItem: { fontSize: 16 },
  updateButton: { backgroundColor: '#007bff', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 30, marginHorizontal: 16 },
  updateButtonDisabled: { backgroundColor: '#a0c9fa' },
  updateButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default SettingsScreen;
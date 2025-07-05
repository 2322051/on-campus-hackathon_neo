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
  Modal,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

interface UserSettings {
  user_id: number;
  character_voice: number;
}

const AVAILABLE_VOICES = [
  { id: 3, name: 'ずんだもん' },
  { id: 2, name: '四国めたん' },
  { id: 8, name: '春日部つむぎ' },
  { id: 10, name: '雨晴はう' },
  { id: 9, name: '波音リツ' },
  { id: 11, name: '玄野武宏' },
  { id: 12, name: '白上虎太郎' },
  { id: 13, name: '青山龍星' },
  { id: 14, name: '冥鳴ひまり' },
  { id: 16, name: '九州そら' },
  { id: 20, name: 'もち子さん' },
  { id: 21, name: '剣崎雌雄' },
  { id: 23, name: 'WhiteCUL' },
  { id: 27, name: '後鬼' },
  { id: 29, name: 'No.7' },
  { id: 42, name: 'ちび式じい' },
  { id: 43, name: '櫻歌ミコ' },
  { id: 46, name: '小夜/SAYO' },
  { id: 47, name: 'ナースロボ＿タイプＴ' },
  { id: 51, name: '聖騎士 紅桜' },
  { id: 52, name: '雀松朱司' },
  { id: 53, name: '麒ヶ島宗麟' },
  { id: 54, name: '春歌ナナ' },
  { id: 55, name: '猫使アル' },
  { id: 58, name: '猫使ビィ' },
];

const API_BASE_URL = 'http://127.0.0.1:8000';
const CURRENT_USER_ID = 1;

const SettingsScreen = () => {
  const isFocused = useIsFocused();

  const [initialSettings, setInitialSettings] = useState<UserSettings | null>(null);
  const [editingVoice, setEditingVoice] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchUserSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings/${CURRENT_USER_ID}`);
      const data: UserSettings = await res.json();
      setInitialSettings(data);
      setEditingVoice(data.character_voice);
    } catch (e) {
      Alert.alert('エラー', '設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) fetchUserSettings();
  }, [isFocused]);

  const handleUpdateSettings = async () => {
  if (!initialSettings || isUpdating) return;
  if (editingVoice === initialSettings.character_voice) {
    Alert.alert('変更なし', '更新する内容がありません');
    return;
  }

  setIsUpdating(true);
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings/${CURRENT_USER_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_voice: editingVoice }),
    });
    const updated = await response.json();
    setInitialSettings(updated);
    // ★ ココを消すことで未選択に戻る問題を防ぐ！
    // setEditingVoice(updated.character_voice);
    Alert.alert('成功', '設定が更新されました');
  } catch {
    Alert.alert('エラー', '更新に失敗しました');
  } finally {
    setIsUpdating(false);
  }
};

  const getVoiceName = (id: number | undefined) =>
    AVAILABLE_VOICES.find((v) => v.id === id)?.name || '未選択';

  if (loading || !initialSettings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3ddc97" />
        <Text style={{ color: '#fff', marginTop: 10 }}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>キャラクターボイス</Text>
        <TouchableOpacity
          style={styles.selectBox}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.selectBoxText}>{getVoiceName(editingVoice)}</Text>
          <Feather name="chevron-down" size={20} color="#3ddc97" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
          onPress={handleUpdateSettings}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.updateButtonText}>設定を更新</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* モーダル */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <FlatList
              data={AVAILABLE_VOICES}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setEditingVoice(item.id);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  title: { fontSize: 16, color: '#fff', marginBottom: 10 },
  selectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3ddc97',
  },
  selectBoxText: { fontSize: 16, color: '#fff' },
  updateButton: {
    marginTop: 30,
    backgroundColor: '#3ddc97',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  updateButtonDisabled: { backgroundColor: '#aaa' },
  updateButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '60%',
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  modalItemText: { fontSize: 16, color: '#fff' },
  modalCloseButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  modalCloseButtonText: { color: '#3ddc97', fontWeight: 'bold' },
});

export default SettingsScreen;
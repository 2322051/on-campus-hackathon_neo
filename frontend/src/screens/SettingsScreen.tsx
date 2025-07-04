// SettingsScreen.tsx (単一画面完結・更新ボタン付き)

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
  TextInput, // ★追加: テキスト入力用
} from 'react-native';
// Pickerを使う場合、@react-native-picker/picker をインストールしてください
// yarn add @react-native-picker/picker または npm install @react-native-picker/picker
import { Picker } from '@react-native-picker/picker'; // ★追加: セレクター用

import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

// ★★★ バックエンドのUserSettingsResponseに対応する型を定義 ★★★
interface UserSettings {
  user_id: number;
  character_voice: number;      // user_info.character_voice に対応 (ID)
  additional_prompt: string;    // user_info.additional_prompt に対応
}

// キャラクターボイスの選択肢（ダミーデータ）
const AVAILABLE_VOICES = [
  { id: 0, name: '未設定' }, // 初期値またはエラー用
  { id: 1, name: '標準男性ボイス (A)' },
  { id: 2, name: '標準女性ボイス (B)' },
  { id: 3, name: '高音男性ボイス (C)' },
  { id: 4, name: '低音女性ボイス (D)' },
];

// 設定項目表示のヘルパーコンポーネント (テキスト入力やPickerを子に持てるように調整)
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
    <View style={styles.settingItemRight}>
      {children}
    </View>
  </View>
);

const SettingsScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [initialUserSettings, setInitialUserSettings] = useState<UserSettings | null>(null); // 初期ロード時の設定
  const [editingVoice, setEditingVoice] = useState<number | undefined>(undefined); // 編集中のキャラクターボイス
  const [editingPrompt, setEditingPrompt] = useState<string | undefined>(undefined); // 編集中のプロンプト
  
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false); // 更新中フラグ

  const API_BASE_URL = 'http://127.0.0.1:8000'; // FastAPIのURLに合わせてください
  const CURRENT_USER_ID = 1; // ダミーユーザーID。実際のアプリでは認証後に取得

  const fetchUserSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/${CURRENT_USER_ID}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: UserSettings = await response.json();
      setInitialUserSettings(data);
      setEditingVoice(data.character_voice); // 編集用ステートを初期値でセット
      setEditingPrompt(data.additional_prompt); // 編集用ステートを初期値でセット
    } catch (error) {
      console.error('ユーザー設定の取得に失敗しました:', error);
      Alert.alert('エラー', '設定の読み込みに失敗しました。');
      // エラー時も表示を試みるため、一部デフォルト値を設定
      setInitialUserSettings({
        user_id: CURRENT_USER_ID,
        character_voice: 0, // 仮のデフォルト値
        additional_prompt: '設定を読み込めませんでした。',
      });
      setEditingVoice(0);
      setEditingPrompt('設定を読み込めませんでした。');
    } finally {
      setLoading(false);
    }
  };

  // 画面がフォーカスされた時にユーザー設定を読み込む
  useEffect(() => {
    if (isFocused) {
      fetchUserSettings();
    }
  }, [isFocused]);

  // ★★★ 設定更新ハンドラー ★★★
  const handleUpdateSettings = async () => {
    if (!initialUserSettings || isUpdating) return;

    const updates: { [key: string]: any } = {};
    let hasChanges = false;

    // キャラクターボイスの変更をチェック
    if (editingVoice !== undefined && editingVoice !== initialUserSettings.character_voice) {
      updates.character_voice = editingVoice;
      hasChanges = true;
    }

    // プロンプトの変更をチェック
    if (editingPrompt !== undefined && editingPrompt !== initialUserSettings.additional_prompt) {
      updates.additional_prompt = editingPrompt;
      hasChanges = true;
    }

    if (!hasChanges) {
      Alert.alert('変更なし', '更新する設定がありません。');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/${CURRENT_USER_ID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates), // 変更があった項目のみ送信
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const updatedData: UserSettings = await response.json();
      setInitialUserSettings(updatedData); // 更新後の最新の設定で初期値を上書き
      setEditingVoice(updatedData.character_voice);
      setEditingPrompt(updatedData.additional_prompt);
      Alert.alert('成功', '設定を更新しました！');
    } catch (error) {
      console.error('設定の更新に失敗しました:', error);
      Alert.alert('エラー', '設定の保存に失敗しました。もう一度お試しください。');
      // 失敗した場合は、サーバーから再取得してUIを元の状態に戻す
      fetchUserSettings(); 
    } finally {
      setIsUpdating(false);
    }
  };


  if (loading || initialUserSettings === null) {
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

        {/* --- キャラクターボイス設定 --- */}
        <Text style={styles.sectionTitle}>キャラクターボイス</Text>
        <SettingItem
          title="ボイス選択"
          iconName="mic"
        >
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

        {/* --- プロンプト設定 --- */}
        <Text style={styles.sectionTitle}>プロンプト</Text>
        <SettingItem
          title="追加プロンプト入力"
          iconName="edit-3"
        >
          <TextInput
            style={styles.textInput}
            onChangeText={setEditingPrompt}
            value={editingPrompt}
            placeholder="ここにプロンプトを入力してください"
            multiline={true} // 複数行入力可能に
            numberOfLines={4} // 初期表示行数
            textAlignVertical="top" // Androidでテキストが上から始まるように
          />
        </SettingItem>

        {/* --- 更新ボタン --- */}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  headerContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
    paddingHorizontal: 16, // 全体的な左右のパディング
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4, // SettingItemのパディングに合わせて調整
  },
  settingItem: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16, // SettingItem内の左右パディング
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // タイトルと入力欄の間にスペース
  },
  settingIcon: {
    marginRight: 15,
    width: 24,
    textAlign: 'center',
  },
  settingItemTitle: {
    fontSize: 17,
    color: '#333',
    fontWeight: '600',
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // 左寄せ
    // flex: 1, // 必要に応じて調整
  },
  picker: {
    height: 150, // Pickerの高さ
    width: '100%', // 親要素に合わせる
  },
  pickerItem: {
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    minHeight: 100, // プロンプト入力欄の最小高さ
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fdfdfd',
    textAlignVertical: 'top', // Androidでテキストが上から始まるように
  },
  updateButton: {
    backgroundColor: '#007bff', // 青色のボタン
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginHorizontal: 16, // 画面端からのマージン
  },
  updateButtonDisabled: {
    backgroundColor: '#a0c9fa', // 無効時の色
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;
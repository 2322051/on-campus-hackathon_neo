import { FeedResponse, FeedItem, UserSettings, UserSettingsUpdateRequest } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000/api'; // シミュレータ用

/** # 呼び出し: アプリ初回起動時。役割: 即時表示用の固定フィード10件を取得。 */
export const getInitialFeed = async (): Promise<FeedResponse> => {
  const response = await fetch(`${API_BASE_URL}/feed/initial`);
  if (!response.ok) throw new Error('Failed to fetch initial feed');
  return await response.json();
};

/** # 呼び出し: アプリ初回起動時。役割: 裏でパーソナライズされたフィードの生成を開始させる。 */
export const generateFeed = async (userId: number = 1): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/feed/generate?user_id=${userId}`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to start feed generation');
  return await response.json();
};

/** # 呼び出し: スワイプ時。役割: 次のパーソナライズ済み論文を1件取得。 */
export const getNextFeedItem = async (userId: number = 1): Promise<FeedItem> => {
  const response = await fetch(`${API_BASE_URL}/feed/next?user_id=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch next feed item');
  return await response.json();
};

/** # 呼び出し: 履歴画面表示時。役割: ブックマーク済みの論文リストを取得。 */
export const getBookmarks = async (): Promise<FeedResponse> => { /* ... */ };

/** # 呼び出し: 論文をブックマークに追加する時。 */
export const addBookmark = async (paperId: string): Promise<any> => { /* ... */ };

/** # 呼び出し: 既存のブックマークを解除する時。 */
export const deleteBookmark = async (paperId: string): Promise<void> => { /* ... */ };

/** # 呼び出し: 設定画面表示時。役割: 現在の設定内容を読み込む。 */
export const getSettings = async (userId: number = 1): Promise<UserSettings> => { /* ... */ };

/** # 呼び出し: 設定画面で「更新」ボタンが押された時。役割: 変更内容をサーバーに保存し、新しいフィードを受け取る。 */
export const updateSettings = async (updateData: UserSettingsUpdateRequest, userId: number = 1): Promise<FeedResponse> => { /* ... */ };
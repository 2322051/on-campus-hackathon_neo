import { FeedResponse, FeedItem, UserSettings, UserSettingsUpdateRequest } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

/** # 呼び出し: アプリ初回起動時。役割: 即時表示用の固定フィード10件を取得。 */
export const getInitialFeed = async (userId: number = 1): Promise<FeedResponse> => {
  const response = await fetch(`${API_BASE_URL}/feed/initial/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch initial feed');
  return await response.json();
};

/** # 呼び出し: アプリ初回起動時。役割: 裏でパーソナライズされたフィードの生成を開始させる。 */
export const generateFeed = async (userId: number = 1): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/feed/generate/${userId}`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to start feed generation');
  return await response.json();
};

/** # 呼び出し: スワイプ時。役割: 次のパーソナライズ済み論文を1件取得。 */
export const getNextFeedItem = async (userId: number = 1): Promise<FeedItem> => {
  const response = await fetch(`${API_BASE_URL}/feed/next/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch next feed item');
  return await response.json();
};

/** # 呼び出し: 履歴画面表示時。役割: ブックマーク済みの論文リストを取得。 */
export const getBookmarks = async (userId: number = 1): Promise<FeedResponse> => {
  const response = await fetch(`${API_BASE_URL}/bookmarks/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch bookmarks');
  return await response.json();
};

/** # 呼び出し: 論文を新しくブックマークに追加する時。 */
export const addBookmark = async (paperId: string, uuid: string, userId: number = 1): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/bookmarks/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      paper_id: paperId,
      uuid: uuid 
    }),
  });
  if (!response.ok) throw new Error('Failed to add bookmark');
  return await response.json();
};

/** # 呼び出し: 既存のブックマークを解除する時。 */
export const deleteBookmark = async (paperId: string, uuid: string, userId: number = 1): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/bookmarks/${userId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      paper_id: paperId,
      uuid: uuid 
    }),
  });
  if (!response.ok) throw new Error('Failed to delete bookmark');
};

/** # 呼び出し: 設定画面表示時。役割: 現在の設定内容を読み込む。 */
export const getSettings = async (userId: number = 1): Promise<UserSettings> => {
  const response = await fetch(`${API_BASE_URL}/settings/${userId}`);
  if (!response.ok) throw new Error('Failed to get settings');
  return await response.json();
};

/** # 呼び出し: 設定画面で「更新」ボタンが押された時。役割: 変更内容をサーバーに保存し、新しいフィードを受け取る。 */
export const updateSettings = async (updateData: UserSettingsUpdateRequest, userId: number = 1): Promise<FeedResponse> => {
  const response = await fetch(`${API_BASE_URL}/settings/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) throw new Error('Failed to update settings');
  return await response.json();
};
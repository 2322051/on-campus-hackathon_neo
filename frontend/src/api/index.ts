import { FeedResponse, FeedItem, UserSettings, UserSettingsUpdateRequest } from '../types';

// --- IP直書き部分（必要に応じて切り替え） ---
const LOCAL_IP = "192.168.40.31"; // ← ご自身のIPに変更
const PORT = "8000";

export const API_BASE_URL = `http://${LOCAL_IP}:${PORT}/api`;

// --- API関数一覧 ---

export const getInitialFeed = async (userId: number = 1): Promise<FeedResponse> => {
  const response = await fetch(`${API_BASE_URL}/feed/initial/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch initial feed');
  return await response.json();
};

export const generateFeed = async (userId: number = 1): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/feed/generate/${userId}`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to start feed generation');
  return await response.json();
};

export const getNextFeedItem = async (userId: number = 1): Promise<FeedItem> => {
  const response = await fetch(`${API_BASE_URL}/feed/next/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch next feed item');
  return await response.json();
};

export const getBookmarks = async (userId: number = 1): Promise<FeedResponse> => {
  const response = await fetch(`${API_BASE_URL}/bookmarks/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch bookmarks');
  return await response.json();
};

export const addBookmark = async (paperId: string, uuid: string, userId: number = 1): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/bookmarks/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paper_id: paperId, uuid: uuid }),
  });
  if (!response.ok) throw new Error('Failed to add bookmark');
  return await response.json();
};

export const deleteBookmark = async (paperId: string, uuid: string, userId: number = 1): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/bookmarks/${userId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paper_id: paperId, uuid: uuid }),
  });
  if (!response.ok) throw new Error('Failed to delete bookmark');
};

export const getSettings = async (userId: number = 1): Promise<UserSettings> => {
  const response = await fetch(`${API_BASE_URL}/settings/${userId}`);
  if (!response.ok) throw new Error('Failed to get settings');
  return await response.json();
};

export const updateSettings = async (updateData: UserSettingsUpdateRequest, userId: number = 1): Promise<FeedResponse> => {
  const response = await fetch(`${API_BASE_URL}/settings/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) throw new Error('Failed to update settings');
  return await response.json();
};
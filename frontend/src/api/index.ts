import { FeedResponse } from '../types'; // 型定義を後で作成します
const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const getFeed = async (): Promise<FeedResponse> => {
  try {
 
    const response = await fetch(`${API_BASE_URL}/feed`);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data: FeedResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch feed:', error);
    throw error;
  }
};

export const addBookmark = async (paperId: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paper_id: paperId }),
    });
    if (!response.ok) {
      throw new Error('Failed to add bookmark');
    }
    return await response.json();
  } catch (error) {
    console.error('Add bookmark error:', error);
    throw error;
  }
};

export const deleteBookmark = async (paperId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookmarks`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paper_id: paperId }),
    });
    if (!response.ok) {
      throw new Error('Failed to delete bookmark');
    }
  } catch (error) {
    console.error('Delete bookmark error:', error);
    throw error;
  }
};

export const getBookmarks = async (): Promise<FeedResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookmarks`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data: FeedResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch bookmarks:', error);
    throw error;
  }
};
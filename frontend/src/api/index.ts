import { FeedResponse } from '../types'; // 型定義を後で作成します
const API_BASE_URL = 'http://192.168.40.31:8000/api';


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
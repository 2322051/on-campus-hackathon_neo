export interface FeedItem {
  feed_id: string;
  paper_id: string;
  title: string;
  authors: string[];
  summary: string;
  audio_url: string;
  paper_url: string;
  is_bookmarked: boolean;
}

export interface FeedResponse {
  items: FeedItem[];
}
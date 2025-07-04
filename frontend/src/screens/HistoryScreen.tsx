import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { getBookmarks } from '../api';
import { FeedItem } from '../types';

// ブックマークアイテムを1つ表示するコンポーネント
const BookmarkItem = ({ item }: { item: FeedItem }) => {
  // タップされたら論文ページを開く
  const handlePress = () => {
    if (item.paper_url) {
      Linking.openURL(item.paper_url);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.itemContainer}>
      <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.itemAuthors} numberOfLines={1}>{item.authors.join(', ')}</Text>
    </TouchableOpacity>
  );
};

const HistoryScreen = () => {
  const [bookmarks, setBookmarks] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isFocused = useIsFocused();

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        setLoading(true);
        const response = await getBookmarks();
        setBookmarks(response.items);
        setError(null);
      } catch (e) {
        setError('ブックマークの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    // この画面が表示されている（フォーカスされている）時だけデータを取得する
    if (isFocused) {
      fetchBookmarks();
    }
  }, [isFocused]);

  if (loading) {
    return <ActivityIndicator style={styles.container} size="large" />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>ブックマーク一覧</Text>
      </View>
      {bookmarks.length > 0 ? (
        <FlatList
          data={bookmarks}
          renderItem={({ item }) => <BookmarkItem item={item} />}
          keyExtractor={(item) => item.paper_id}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <View style={styles.container}>
          <Text>ブックマークされた論文はありません。</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  itemAuthors: {
    fontSize: 14,
    color: 'gray',
    marginTop: 8,
  },
});

export default HistoryScreen;
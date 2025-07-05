import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { getBookmarks } from '../api';
import { FeedItem } from '../types';

// ブックマークアイテムを1つ表示するコンポーネント
const BookmarkItem = ({ item }: { item: FeedItem }) => {
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

    if (isFocused) {
      fetchBookmarks();
    }
  }, [isFocused]);

  if (loading) {
    return <ActivityIndicator style={styles.centered} size="large" color="#3FE0B5" />;
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
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
        <View style={styles.centered}>
          <Text style={styles.noItemText}>ブックマークされた論文はありません。</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#000',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  itemContainer: {
    backgroundColor: '#111',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#3FE0B5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  itemAuthors: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 6,
  },
  noItemText: {
    color: '#999',
    fontSize: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
  },
});

export default HistoryScreen;
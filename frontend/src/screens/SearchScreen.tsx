import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  LayoutChangeEvent,
  ViewabilityConfig,
  ViewToken,
  Linking,
  Share
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Audio } from 'expo-av';
import { useIsFocused } from '@react-navigation/native';
import { searchPapers, addBookmark, deleteBookmark } from '../api';
import { FeedItem } from '../types';

// PaperItem Component
const PaperItem = ({ item, index, containerHeight }: { item: FeedItem; index: number; containerHeight: number; }) => {
  const backgroundColor = index % 2 === 0 ? '#001f3f' : '#3D9970';
  return (
    <View style={[styles.paperContainer, { height: containerHeight, backgroundColor }]}>
      <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
      <Text style={styles.authors} numberOfLines={2}>{item.authors.join(', ')}</Text>
      <Text style={styles.summary} numberOfLines={10}>{item.summary}</Text>
    </View>
  );
};

// OverlayUI Component
const OverlayUI = ({ currentItem, onBookmarkPress, onLinkPress, onSharePress }: { currentItem: FeedItem | null; onBookmarkPress: () => void; onLinkPress: () => void; onSharePress: () => void; }) => {
  const bookmarkIconColor = currentItem?.is_bookmarked ? '#34D399' : 'white';
  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      <View style={styles.rightIconsWrapper} pointerEvents="auto">
        <TouchableOpacity style={styles.iconButton} onPress={onBookmarkPress}><Feather name="bookmark" size={32} color={bookmarkIconColor} /><Text style={[styles.iconText, { color: bookmarkIconColor }]}>Save</Text></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={onLinkPress}><Feather name="external-link" size={32} color="white" /><Text style={styles.iconText}>Link</Text></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={onSharePress}><Feather name="share-2" size={32} color="white" /><Text style={styles.iconText}>Share</Text></TouchableOpacity>
      </View>
    </View>
  );
};

// SearchScreen Component
const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const [viewableItemIndex, setViewableItemIndex] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isFocused = useIsFocused();
  
  const handleSearch = async () => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setSearched(true);
    try {
      const response = await searchPapers(query);
      setResults(response.items);
      setViewableItemIndex(0);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && height !== listHeight) {
      setListHeight(height);
    }
  };
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setViewableItemIndex(viewableItems[0].index);
    }
  }, []);
  const viewabilityConfig = useRef<ViewabilityConfig>({ itemVisiblePercentThreshold: 50 }).current;
  
  const currentAudioUrl = useMemo(() => {
    if (results.length > 0 && viewableItemIndex < results.length) {
      return results[viewableItemIndex].audio_url;
    }
    return null;
  }, [viewableItemIndex, results]);

  useEffect(() => {
    const loadAndPlaySound = async (url: string) => {
      if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
        soundRef.current = sound;
      } catch (e) { console.error("Failed to load sound", e); }
    };
    if (isFocused && currentAudioUrl) {
      loadAndPlaySound(currentAudioUrl);
    } else {
      soundRef.current?.unloadAsync();
    }
    return () => { soundRef.current?.unloadAsync(); };
  }, [currentAudioUrl, isFocused]);

  const handleBookmarkPress = async () => {
    const currentItem = results[viewableItemIndex];
    if (!currentItem) return;
    try {
      if (currentItem.is_bookmarked) { await deleteBookmark(currentItem.paper_id); } 
      else { await addBookmark(currentItem.paper_id); }
      const newResults = [...results];
      const targetItem = { ...newResults[viewableItemIndex] };
      targetItem.is_bookmarked = !targetItem.is_bookmarked;
      newResults[viewableItemIndex] = targetItem;
      setResults(newResults);
    } catch (error) { console.error("Bookmark operation failed", error); }
  };

  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd((_event, success) => { if (success) { handleBookmarkPress(); } });
  const handleLinkPress = () => {
    const currentItem = results[viewableItemIndex];
    if (currentItem?.paper_url) Linking.openURL(currentItem.paper_url);
  };
  const handleSharePress = async () => {
    const currentItem = results[viewableItemIndex];
    if (!currentItem) return;
    try { await Share.share({ message: `${currentItem.title}\n${currentItem.paper_url}` }); } 
    catch (e: any) { console.error(e.message); }
  };

  const currentItem = results.length > 0 ? results[viewableItemIndex] : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="キーワードで検索..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Feather name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={doubleTap}>
        <View style={styles.feedContainer} onLayout={onLayout}>
          {loading ? (
            <ActivityIndicator size="large" />
          ) : listHeight > 0 && results.length > 0 ? (
            <FlatList
              data={results}
              renderItem={({ item, index }) => <PaperItem item={item} index={index} containerHeight={listHeight} />}
              keyExtractor={(item) => item.feed_id}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
            />
          ) : (
            searched && <View style={styles.emptyContainer}><Text>検索結果はありませんでした。</Text></View>
          )}
          {results.length > 0 && <OverlayUI currentItem={currentItem} onBookmarkPress={handleBookmarkPress} onLinkPress={handleLinkPress} onSharePress={handleSharePress} />}
        </View>
      </GestureDetector>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  searchBarContainer: { flexDirection: 'row', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  textInput: { flex: 1, height: 40, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, marginRight: 10 },
  searchButton: { backgroundColor: '#007bff', padding: 8, borderRadius: 8, justifyContent: 'center' },
  feedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
   paperContainer: { width: Dimensions.get('window').width,justifyContent: 'flex-start',paddingTop: 150,paddingHorizontal: 20,},
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  authors: { fontSize: 15, color: 'lightgray', marginBottom: 12 },
  summary: { fontSize: 17, lineHeight: 25, color: '#eee' },
  overlayContainer: { ...StyleSheet.absoluteFillObject },
  rightIconsWrapper: {
    position: 'absolute',
    // ★★★ 変更点 ★★★
    bottom: 160, 
    right: 10, 
    alignItems: 'center',
  },
  iconButton: { alignItems: 'center', marginBottom: 25 },
  iconText: { color: 'white', fontSize: 12, marginTop: 4 },
});

export default SearchScreen;
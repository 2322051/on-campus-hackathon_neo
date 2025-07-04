import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
  TouchableOpacity,
  LayoutChangeEvent,
  ViewabilityConfig,
  ViewToken,
  Linking,
  Share,
  Alert,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { 
  getInitialFeed, 
  generateFeed, 
  getNextFeedItem, 
  addBookmark, 
  deleteBookmark 
} from '../api';
import { FeedItem } from '../types';

const initialHeight = Dimensions.get('window').height;

// PaperItem, OverlayUIコンポーネントは変更なし
const PaperItem = ({ item, index, containerHeight }: { item: FeedItem; index: number; containerHeight: number; }) => {
  const backgroundColor = index % 2 === 0 ? '#0d001a' : '#1a000d';
  return (
    <View style={[styles.pageContainer, { height: containerHeight, backgroundColor }]}>
      <View>
        <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
        <Text style={styles.authors} numberOfLines={2}>{item.authors.join(', ')}</Text>
        <Text style={styles.summary} numberOfLines={10}>{item.summary}</Text>
      </View>
    </View>
  );
};
const OverlayUI = ({ currentItem, onBookmarkPress, onLinkPress, onSharePress }: { currentItem: FeedItem | null; onBookmarkPress: () => void; onLinkPress: () => void; onSharePress: () => void; }) => {
  const bookmarkIconColor = currentItem?.is_bookmarked ? '#34D399' : 'white';
  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      <View style={styles.rightIconsWrapper} pointerEvents="auto">
        <TouchableOpacity style={styles.iconButton} onPress={onBookmarkPress}>
          <Feather name="bookmark" size={32} color={bookmarkIconColor} />
          <Text style={[styles.iconText, { color: bookmarkIconColor }]}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={onLinkPress}>
          <Feather name="external-link" size={32} color="white" />
          <Text style={styles.iconText}>Link</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={onSharePress}>
          <Feather name="share-2" size={32} color="white" />
          <Text style={styles.iconText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


const FeedScreen = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [listHeight, setListHeight] = useState(initialHeight);
  const [viewableItemIndex, setViewableItemIndex] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isFocused = useIsFocused();
  const viewabilityConfig = useRef<ViewabilityConfig>({ itemVisiblePercentThreshold: 50 }).current;
  const dynamicCacheActive = useRef(false);
  const [isWaitingForFeed, setIsWaitingForFeed] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      try {
        const isFirstLaunch = await AsyncStorage.getItem('isFirstLaunch');
        if (isFirstLaunch === null) {
          console.log("初回起動を検出。初期フィードを取得します。");
          const response = await getInitialFeed();
          setFeedItems(response.items);
          await generateFeed();
          await AsyncStorage.setItem('isFirstLaunch', 'false');
        } else {
          console.log("2回目以降の起動。初期フィードを取得します（暫定）。");
          const response = await getInitialFeed();
          setFeedItems(response.items);
        }
      } catch (e) {
        Alert.alert("エラー", "フィードの取得に失敗しました。");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    initializeApp();
  }, []);

  const fetchNextItem = useCallback(async () => {
    if (isFetchingNext) return;
    setIsFetchingNext(true);
    console.log("次のパーソナライズ済みアイテムを取得します...");
    try {
      const nextItem = await getNextFeedItem();
      setFeedItems(prevItems => [...prevItems.slice(1), nextItem]);
      setIsWaitingForFeed(false);
    } catch (e) {
      console.error("次のアイテムの取得に失敗しました。準備待機状態に入ります。", e);
      setIsWaitingForFeed(true);
    } finally {
      setIsFetchingNext(false);
    }
  }, [isFetchingNext]);

  useEffect(() => {
    if (isWaitingForFeed) {
      const retryTimer = setTimeout(() => {
        console.log("3秒経過、次のアイテム取得を再試行します。");
        fetchNextItem();
      }, 3000);
      return () => clearTimeout(retryTimer);
    }
  }, [isWaitingForFeed, fetchNextItem]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      const newIndex = viewableItems[0].index;
      if (newIndex === 3) {
        dynamicCacheActive.current = true;
      }
      if (dynamicCacheActive.current && newIndex > viewableItemIndex) {
        fetchNextItem();
      }
      setViewableItemIndex(newIndex);
    }
  }, [viewableItemIndex, fetchNextItem]);

  useEffect(() => {
    const loadAndPlaySound = async () => {
      const currentItem = feedItems[viewableItemIndex];
      if (!currentItem || !isFocused) return;
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: currentItem.audio_url },
          { shouldPlay: true, isLooping: true }
        );
        soundRef.current = sound;
      } catch (error) {
        console.error('音声の読み込みに失敗しました:', error);
      }
    };
    loadAndPlaySound();
    return () => { soundRef.current?.unloadAsync(); };
  }, [viewableItemIndex, feedItems, isFocused]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && height !== listHeight) { setListHeight(height); }
  };

  const handleBookmarkPress = async () => {
    const currentItem = feedItems[viewableItemIndex];
    if (!currentItem) return;
    try {
      if (currentItem.is_bookmarked) { await deleteBookmark(currentItem.paper_id); } 
      else { await addBookmark(currentItem.paper_id); }
      const newItems = [...feedItems];
      const targetItem = { ...newItems[viewableItemIndex] };
      targetItem.is_bookmarked = !targetItem.is_bookmarked;
      newItems[viewableItemIndex] = targetItem;
      setFeedItems(newItems);
    } catch (error) { console.error("ブックマーク操作に失敗しました", error); }
  };

  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd((_event, success) => { if (success) { handleBookmarkPress(); } });
  const handleLinkPress = () => {
    const currentItem = feedItems[viewableItemIndex];
    if (currentItem?.paper_url) { Linking.openURL(currentItem.paper_url); }
  };
  const handleSharePress = async () => {
    const currentItem = feedItems[viewableItemIndex];
    if (!currentItem) return;
    try { await Share.share({ message: `${currentItem.title}\n${currentItem.paper_url}` }); }
    catch (error: any) { console.error(error.message); }
  };

  if (loading) { return <ActivityIndicator style={styles.container} size="large" />; }

  const currentItem = feedItems.length > 0 ? feedItems[viewableItemIndex] : null;

  return (
    <GestureDetector gesture={doubleTap}>
      <View style={styles.container} onLayout={onLayout}>
        {listHeight > 0 && (
          <FlatList
            data={feedItems}
            renderItem={({ item, index }) => (<PaperItem item={item} index={index} containerHeight={listHeight} />)}
            keyExtractor={(item, index) => `${item.feed_id}_${index}`}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            ListFooterComponent={() => {
              if (isWaitingForFeed) {
                return (
                  <View style={[styles.pageContainer, { height: listHeight, alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.messageText}>新しいフィードを準備中です...</Text>
                  </View>
                );
              }
              return null;
            }}
          />
        )}
        <OverlayUI currentItem={currentItem} onBookmarkPress={handleBookmarkPress} onLinkPress={handleLinkPress} onSharePress={handleSharePress} />
      </View>
    </GestureDetector>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  pageContainer: { width: '100%', justifyContent: 'center', paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8, },
  authors: { fontSize: 15, color: 'lightgray', marginBottom: 12, },
  summary: { fontSize: 17, lineHeight: 25, color: '#eee', },
  overlayContainer: { ...StyleSheet.absoluteFillObject, },
  rightIconsWrapper: { position: 'absolute', bottom: 160, right: 10, alignItems: 'center', },
  iconButton: { alignItems: 'center', marginBottom: 25, },
  iconText: { color: 'white', fontSize: 12, marginTop: 4, },
  messageText: { marginTop: 20, fontSize: 16, color: 'white', textAlign: 'center' },
});

export default FeedScreen;
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
import * as FileSystem from 'expo-file-system';

import { 
  getInitialFeed, 
  generateFeed, 
  getNextFeedItem, 
  addBookmark, 
  deleteBookmark 
} from '../api';
import { FeedItem } from '../types';

const initialHeight = Dimensions.get('window').height;
const DUMMY_USER_ID = 1;
const DUMMY_UUID = "user-unique-identifier-12345";

// --- Base64をMP3ファイルとして保存する関数 ---
const saveBase64AsAudioFile = async (base64Data: string, filename: string): Promise<string> => {
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
};

const PaperItem = ({ item, index, containerHeight }: { item: FeedItem; index: number; containerHeight: number; }) => {
  const backgroundColor = index % 2 === 0 ? '#0d001a' : '#1a000d';
  return (
    <View style={[styles.paperContainer, { height: containerHeight, backgroundColor }]}>
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

  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      try {
        const isFirstLaunch = await AsyncStorage.getItem('isFirstLaunch');
        const response = await getInitialFeed(DUMMY_USER_ID);
        setFeedItems(response.items);
        if (isFirstLaunch === null) {
          await generateFeed(DUMMY_USER_ID);
          await AsyncStorage.setItem('isFirstLaunch', 'false');
        } else {
          await generateFeed(DUMMY_USER_ID);
        }
      } catch (e) {
        Alert.alert("Error", "Failed to fetch feed.");
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
    try {
      const nextItem = await getNextFeedItem(DUMMY_USER_ID);
      setFeedItems(prevItems => [...prevItems.slice(1), nextItem]);
    } catch (e) {
      console.error("Failed to fetch next item.", e);
    } finally {
      setIsFetchingNext(false);
    }
  }, [isFetchingNext]);

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

  // 🔽 Base64音声の読み込み＆再生
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

        const response = await fetch(currentItem.audio_url); // ここでBase64を取得
        const base64Audio = await response.text(); // APIがtext/plainで返す想定
        const localUri = await saveBase64AsAudioFile(base64Audio, `audio_${currentItem.feed_id}.mp3`);

        const { sound } = await Audio.Sound.createAsync(
          { uri: localUri },
          { shouldPlay: true, isLooping: true }
        );
        soundRef.current = sound;
      } catch (error) {
        console.error('Failed to load sound:', error);
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
      if (currentItem.is_bookmarked) {
        await deleteBookmark(currentItem.paper_id, DUMMY_UUID, DUMMY_USER_ID);
      } else {
        await addBookmark(currentItem.paper_id, DUMMY_UUID, DUMMY_USER_ID);
      }
      const newItems = [...feedItems];
      const targetItem = { ...newItems[viewableItemIndex] };
      targetItem.is_bookmarked = !targetItem.is_bookmarked;
      newItems[viewableItemIndex] = targetItem;
      setFeedItems(newItems);
    } catch (error) {
      console.error("Bookmark operation failed", error);
    }
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
          />
        )}
        <OverlayUI
          currentItem={currentItem}
          onBookmarkPress={handleBookmarkPress}
          onLinkPress={handleLinkPress}
          onSharePress={handleSharePress}
        />
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  paperContainer: { width: Dimensions.get('window').width, justifyContent: 'center', paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  authors: { fontSize: 15, color: 'lightgray', marginBottom: 12 },
  summary: { fontSize: 17, lineHeight: 25, color: '#eee' },
  overlayContainer: { ...StyleSheet.absoluteFillObject },
  rightIconsWrapper: { position: 'absolute', bottom: 160, right: 10, alignItems: 'center' },
  iconButton: { alignItems: 'center', marginBottom: 25 },
  iconText: { color: 'white', fontSize: 12, marginTop: 4 },
});

export default FeedScreen;
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
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useIsFocused, useNavigation } from '@react-navigation/native';

import { getFeed, addBookmark, deleteBookmark } from '../api';
import { FeedItem } from '../types';

const initialHeight = Dimensions.get('window').height;

// PaperItemコンポーネントは変更なし
const PaperItem = ({
  item,
  index,
  containerHeight,
}: {
  item: FeedItem;
  index: number;
  containerHeight: number;
}) => {
  const backgroundColor = index % 2 === 0 ? '#0d001a' : '#1a000d';

  return (
    <View
      style={[
        styles.paperContainer,
        { height: containerHeight, backgroundColor },
      ]}
    >
      <Text style={styles.title} numberOfLines={3}>
        {item.title}
      </Text>
      <Text style={styles.authors} numberOfLines={2}>
        {item.authors.join(', ')}
      </Text>
      <Text style={styles.summary} numberOfLines={10}>
        {item.summary}
      </Text>
    </View>
  );
};

// OverlayUIコンポーネントは変更なし
const OverlayUI = ({
  currentItem,
  onBookmarkPress,
  onLinkPress,
  onSharePress,
  onSearchPress,
}: {
  currentItem: FeedItem | null;
  onBookmarkPress: () => void;
  onLinkPress: () => void;
  onSharePress: () => void;
  onSearchPress: () => void;
}) => {
  const bookmarkIconColor = currentItem?.is_bookmarked ? '#34D399' : 'white';

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      <TouchableOpacity style={styles.searchIcon} onPress={onSearchPress} pointerEvents="auto">
        <Feather name="search" size={28} color="white" />
      </TouchableOpacity>
      
      <View style={styles.rightIconsWrapper} pointerEvents="auto">
        <TouchableOpacity style={styles.iconButton} onPress={onBookmarkPress}>
          <Feather name="bookmark" size={32} color={bookmarkIconColor} />
          <Text style={[styles.iconText, { color: bookmarkIconColor }]}>
            Save
          </Text>
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

// --- メインの画面コンポーネント ---
const FeedScreen = () => {
  const navigation = useNavigation<any>();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listHeight, setListHeight] = useState(initialHeight);
  const [viewableItemIndex, setViewableItemIndex] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    const fetchFeed = async () => {
      // setLoading(true); // 毎回インジケーターが出ないように、ここではコメントアウトしても良い
      try {
        const response = await getFeed();
        if (response.items) {
          setFeedItems(response.items);
        }
      } catch (e) {
        console.error(e);
      } finally {
        // setLoading(false);
      }
    };

    // この画面が表示されている時だけデータを取得
    if (isFocused) {
      fetchFeed();
    }
  }, [isFocused]); // 依存配列を[]から[isFocused]に変更

  useEffect(() => {
    const loadAndPlaySound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
        });
      } catch (e) {
        console.error("Failed to set audio mode", e);
      }
      const currentItem = feedItems[viewableItemIndex];
      if (!currentItem) return;
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      try {
        console.log(`Loading sound from: ${currentItem.audio_url}`);
        const { sound } = await Audio.Sound.createAsync(
          { uri: currentItem.audio_url },
          { shouldPlay: true }
        );
        soundRef.current = sound;
      } catch (error) {
        console.error('Failed to load sound:', error);
      }
    };
    if (isFocused && feedItems.length > 0) {
      loadAndPlaySound();
    } else {
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    }
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, [viewableItemIndex, feedItems, isFocused]);

  const getItemLayout = (_data: any, index: number) => ({
    length: listHeight,
    offset: listHeight * index,
    index,
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && height !== listHeight) {
      setListHeight(height);
    }
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setViewableItemIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef<ViewabilityConfig>({ itemVisiblePercentThreshold: 50 }).current;

  const handleBookmarkPress = async () => {
    const currentItem = feedItems[viewableItemIndex];
    if (!currentItem) return;
    try {
      if (currentItem.is_bookmarked) {
        await deleteBookmark(currentItem.paper_id);
      } else {
        await addBookmark(currentItem.paper_id);
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

  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd((_event, success) => {
      if (success) { handleBookmarkPress(); }
  });

  const handleLinkPress = () => {
    const currentItem = feedItems[viewableItemIndex];
    if (currentItem?.paper_url) {
      Linking.openURL(currentItem.paper_url);
    }
  };

  const handleSharePress = async () => {
    const currentItem = feedItems[viewableItemIndex];
    if (!currentItem) return;
    try {
      await Share.share({ message: `${currentItem.title}\n${currentItem.paper_url}` });
    } catch (error: any) {
      console.error(error.message);
    }
  };

  const handleSearchPress = () => {
    const parentNavigator = navigation.getParent();
    // ★★★ ここを修正 ★★★
    navigation.getParent()?.navigate('Search');
    // ログ1: まず、タップされたことを確認
    console.log('Search icon tapped!'); 

    if (parentNavigator) {
      // ログ2: 親のナビゲーターが見つかったか確認
      console.log('Parent navigator found. Navigating to Search...'); 
      parentNavigator.navigate('Search');
    } else {
      // ログ3: 親のナビゲーターが見つからなかった場合
      console.log('Parent navigator NOT found.'); 
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.container} size="large" />;
  }

  const currentItem = feedItems.length > 0 ? feedItems[viewableItemIndex] : null;

  return (
    <GestureDetector gesture={doubleTap}>
      <View style={styles.container} onLayout={onLayout}>
        {listHeight > 0 && (
          <FlatList
            data={feedItems}
            renderItem={({ item, index }) => (
              <PaperItem item={item} index={index} containerHeight={listHeight} />
            )}
            keyExtractor={(item) => item.feed_id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            windowSize={2}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
          />
        )}
        <OverlayUI
          currentItem={currentItem}
          onBookmarkPress={handleBookmarkPress}
          onLinkPress={handleLinkPress}
          onSharePress={handleSharePress}
          onSearchPress={handleSearchPress}
        />
      </View>
    </GestureDetector>
  );
};


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  paperContainer: {
    width: Dimensions.get('window').width,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  authors: {
    fontSize: 15,
    color: 'lightgray',
    marginBottom: 12,
  },
  summary: {
    fontSize: 17,
    lineHeight: 25,
    color: '#eee',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  searchIcon: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 10,
  },
  rightIconsWrapper: {
    position: 'absolute',
    bottom: 100,
    right: 10,
    alignItems: 'center',
  },
  iconButton: {
    alignItems: 'center',
    marginBottom: 25,
  },
  iconText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
});

export default FeedScreen;
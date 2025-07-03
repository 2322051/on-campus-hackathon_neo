import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, FlatList, Dimensions, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getFeed } from '../api';
import { FeedItem } from '../types';

// 初期値として使うだけなので、コンポーネント外に定義
const initialHeight = Dimensions.get('window').height;

// 1. 論文テキストを表示する部分
// ★★★ 変更点1: propsでコンテナの高さを正確に受け取る ★★★
const PaperItem = ({ item, index, containerHeight }: { item: FeedItem; index: number; containerHeight: number }) => {
  const backgroundColor = index % 2 === 0 ? '#000080' : '#800000';

  return (
    // ★★★ 変更点2: 測定したコンテナの高さをスタイルに適用 ★★★
    <View style={[styles.paperContainer, { height: containerHeight, backgroundColor }]}>
      <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
      <Text style={styles.authors} numberOfLines={2}>{item.authors.join(', ')}</Text>
      <Text style={styles.summary} numberOfLines={10}>{item.summary}</Text>
    </View>
  );
};

// 2. アイコンなど、手前に表示するUI
const OverlayUI = () => {
  return (
    <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">
        <View style={styles.rightIconsWrapper} pointerEvents="auto">
            <TouchableOpacity style={styles.iconButton}>
                <Feather name="bookmark" size={32} color="white" />
                <Text style={styles.iconText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
                <Feather name="external-link" size={32} color="white" />
                <Text style={styles.iconText}>Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
                <Feather name="share-2" size={32} color="white" />
                <Text style={styles.iconText}>Share</Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
};

// --- メインの画面コンポーネント ---
const FeedScreen = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  // ★★★ 変更点3: 実際に使える高さを保存するためのstate ★★★
  const [listHeight, setListHeight] = useState(initialHeight);

  useEffect(() => {
    const fetchFeed = async () => {
      // (データ取得ロジックは変更なし)
      setLoading(true);
      try {
        const response = await getFeed();
        if (response.items) {
          setFeedItems(response.items);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, []);

  // ★★★ 変更点4: 測定した高さを使ってレイアウト情報を生成 ★★★
  const getItemLayout = (_data: any, index: number) => ({
    length: listHeight,
    offset: listHeight * index,
    index,
  });

  // ★★★ 変更点5: Viewが描画された時に実際の高さを測定し、stateを更新 ★★★
  const onLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    // 測定した高さが0より大きく、現在の高さと異なる場合のみ更新
    if (height > 0 && height !== listHeight) {
      setListHeight(height);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.container} size="large" />;
  }

  return (
    // ★★★ 変更点6: onLayoutで高さを測定する ★★★
    <View style={styles.container} onLayout={onLayout}>
      {/* 測定が完了してからFlatListを描画 */}
      {listHeight > 0 && (
        <FlatList
          data={feedItems}
          // ★★★ 変更点7: 測定した高さをPaperItemに渡す ★★★
          renderItem={({ item, index }) => <PaperItem item={item} index={index} containerHeight={listHeight} />}
          keyExtractor={(item) => item.feed_id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          windowSize={2}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
        />
      )}
      <OverlayUI />
    </View>
  );
};

// --- スタイル定義 ---
const styles = StyleSheet.create({
  container: {
    flex: 1, // 親要素いっぱいに広がる
  },
  paperContainer: {
    // widthは画面幅で固定
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
    ...StyleSheet.absoluteFillObject, // position: absolute, top/left/right/bottom: 0 と同じ
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
  }
});

export default FeedScreen;
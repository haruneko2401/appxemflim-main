import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPopularVideos, getRandomVideos, getTrendingVideos, getChannelDetails } from '../api/youtube';
import VideoCard from '../components/VideoCard';
import { TetColors } from '../theme/colors';

const FILTER_OPTIONS = {
  ALL: 'all',
  VIEWS: 'views',
  DATE: 'date',
  LIKES: 'likes',
};

const DATE_FILTERS = {
  TODAY: 'today',
  THIS_WEEK: 'thisWeek',
  THIS_MONTH: 'thisMonth',
  ALL_TIME: 'allTime',
};

const HomeScreen = ({ navigation }) => {
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState(FILTER_OPTIONS.ALL);
  const [dateFilter, setDateFilter] = useState(DATE_FILTERS.ALL_TIME);

  const loadVideos = useCallback(async (isRefresh = false) => {
    try {
      setError(null);

      let videoItems = [];
      let nextToken = null;

      if (isRefresh) {
        // Random strategy for fresh content
        const randomChoice = Math.random();
        let data;

        if (randomChoice < 0.45) {
          data = await getRandomVideos(20);
        } else if (randomChoice < 0.75) {
          data = await getTrendingVideos(20);
        } else {
          data = await getPopularVideos(null, 20);
        }

        videoItems = data.items || [];
        nextToken = data.nextPageToken || null;
      } else {
        const pageToken = nextPageToken;
        if (!pageToken) return;

        const data = await getPopularVideos(pageToken, 20);
        videoItems = data.items || [];
        nextToken = data.nextPageToken || null;
      }

      // 1. Normalize videos
      const normalizedVideos = videoItems.map(item => {
        let videoId = item.id;
        if (typeof item.id === 'object' && item.id.videoId) {
          videoId = item.id.videoId;
        }
        return {
          id: videoId,
          snippet: item.snippet,
          statistics: item.statistics,
        };
      }).filter(v => v.id);

      // 2. Fetch Channel Avatars
      const channelIds = normalizedVideos.map(v => v.snippet?.channelId).filter(Boolean);
      let channelMap = {};

      if (channelIds.length > 0) {
        try {
          const channelData = await getChannelDetails(channelIds);
          if (channelData.items) {
            channelData.items.forEach(ch => {
              channelMap[ch.id] = ch.snippet?.thumbnails?.default?.url;
            });
          }
        } catch (err) {
          console.warn('Failed to fetch channel avatars', err);
        }
      }

      // 3. Merge avatars into videos
      const videosWithAvatars = normalizedVideos.map(v => ({
        ...v,
        channelAvatar: channelMap[v.snippet?.channelId] || null
      }));

      // 4. Update State
      if (isRefresh) {
        // Filter duplicates within the new batch itself
        const uniqueNewVideos = Array.from(new Map(videosWithAvatars.map(item => [item.id, item])).values());
        setVideos(uniqueNewVideos);
      } else {
        setVideos(prev => {
          const existingIds = new Set(prev.map(v => v.id));
          const newVideos = videosWithAvatars.filter(v => !existingIds.has(v.id));
          return [...prev, ...newVideos];
        });
      }

      setNextPageToken(nextToken);
      setHasMore(!!nextToken);

    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Failed to load videos. Please check your API key.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [nextPageToken]);

  // Apply filters when videos or filter options change
  useEffect(() => {
    let filtered = [...videos];

    // Apply date filter
    if (dateFilter !== DATE_FILTERS.ALL_TIME) {
      const now = new Date();
      let cutoffDate = new Date();

      switch (dateFilter) {
        case DATE_FILTERS.TODAY:
          cutoffDate.setDate(now.getDate() - 1);
          break;
        case DATE_FILTERS.THIS_WEEK:
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case DATE_FILTERS.THIS_MONTH:
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }

      filtered = filtered.filter(video => {
        if (!video.snippet?.publishedAt) return false;
        const publishedDate = new Date(video.snippet.publishedAt);
        return publishedDate >= cutoffDate;
      });
    }

    // Apply sort filter
    switch (activeFilter) {
      case FILTER_OPTIONS.VIEWS:
        filtered.sort((a, b) => {
          const viewsA = parseInt(a.statistics?.viewCount || 0);
          const viewsB = parseInt(b.statistics?.viewCount || 0);
          return viewsB - viewsA;
        });
        break;
      case FILTER_OPTIONS.LIKES:
        filtered.sort((a, b) => {
          const likesA = parseInt(a.statistics?.likeCount || 0);
          const likesB = parseInt(b.statistics?.likeCount || 0);
          return likesB - likesA;
        });
        break;
      case FILTER_OPTIONS.DATE:
        filtered.sort((a, b) => {
          const dateA = new Date(a.snippet?.publishedAt || 0);
          const dateB = new Date(b.snippet?.publishedAt || 0);
          return dateB - dateA;
        });
        break;
      default:
        // Keep original order
        break;
    }

    setFilteredVideos(filtered);
  }, [videos, activeFilter, dateFilter]);

  useEffect(() => {
    loadVideos(true);
  }, []);

  const flatListRef = useRef(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setNextPageToken(null);
    setHasMore(true);
    loadVideos(true);
  }, [loadVideos]);

  const scrollToTopAndRefresh = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
    onRefresh();
  }, [onRefresh]);



  // Listen for Bottom Tab Press
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      // If the screen is already focused and user presses the tab again
      if (navigation.isFocused()) {
        // e.preventDefault(); // Optional
        scrollToTopAndRefresh();
      }
    });

    return unsubscribe;
  }, [navigation, scrollToTopAndRefresh]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      loadVideos(false);
    }
  }, [loadingMore, hasMore, loading, loadVideos]);

  const handleVideoPress = useCallback(
    (video) => {
      navigation.navigate('VideoPlayer', { video });
    },
    [navigation]
  );

  const renderVideoCard = useCallback(
    ({ item }) => (
      <VideoCard video={item} onPress={() => handleVideoPress(item)} navigation={navigation} />
    ),
    [handleVideoPress, navigation]
  );

  const renderFilterBar = () => (
    <View style={styles.filterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === FILTER_OPTIONS.ALL && styles.filterButtonActive
          ]}
          onPress={() => setActiveFilter(FILTER_OPTIONS.ALL)}
        >
          <Text style={[
            styles.filterText,
            activeFilter === FILTER_OPTIONS.ALL && styles.filterTextActive
          ]}>
            Tất cả
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === FILTER_OPTIONS.VIEWS && styles.filterButtonActive
          ]}
          onPress={() => setActiveFilter(FILTER_OPTIONS.VIEWS)}
        >
          <Text style={[
            styles.filterText,
            activeFilter === FILTER_OPTIONS.VIEWS && styles.filterTextActive
          ]}>
            Trò chơi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === FILTER_OPTIONS.LIKES && styles.filterButtonActive
          ]}
          onPress={() => setActiveFilter(FILTER_OPTIONS.LIKES)}
        >
          <Text style={[
            styles.filterText,
            activeFilter === FILTER_OPTIONS.LIKES && styles.filterTextActive
          ]}>
            Âm nhạc
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === FILTER_OPTIONS.DATE && styles.filterButtonActive
          ]}
          onPress={() => setActiveFilter(FILTER_OPTIONS.DATE)}
        >
          <Text style={[
            styles.filterText,
            activeFilter === FILTER_OPTIONS.DATE && styles.filterTextActive
          ]}>
            Danh sách kết
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );



  const renderCustomHeader = () => (
    <View style={styles.customHeader}>
      <TouchableOpacity
        style={styles.logoContainer}
        onPress={scrollToTopAndRefresh}
        activeOpacity={0.7}
      >
        {/* You can replace Text with an Image logo here if you have one */}
        <Ionicons name="play-circle" size={28} color={TetColors.gold} style={{ marginRight: 6 }} />
        <Text style={styles.appTitle}>GoldTurf</Text>
      </TouchableOpacity>

      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
        >
          <Ionicons name="scan-outline" size={22} color={TetColors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
        >
          <Ionicons name="notifications-outline" size={22} color={TetColors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search-outline" size={22} color={TetColors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View>
      {renderCustomHeader()}
      {renderFilterBar()}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#d4af37" />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {error || 'Không có video nào'}
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={TetColors.gold} />
          <Text style={styles.loadingText}>Đang tải video...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={filteredVideos}
        renderItem={renderVideoCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={TetColors.gold}
            colors={[TetColors.gold]}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TetColors.background,
  },
  header: {
    // Removed old header style
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: TetColors.background,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    color: TetColors.textPrimary,
    fontSize: 22,
    fontWeight: '800', // Extra bold
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // Space between icons
  },
  iconButton: {
    padding: 4,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TetColors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: TetColors.background,
    paddingVertical: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: TetColors.backgroundElevated,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  filterText: {
    color: TetColors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TetColors.background,
  },
  loadingText: {
    color: TetColors.textPrimary,
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: TetColors.textTertiary,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default HomeScreen;

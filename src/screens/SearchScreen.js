import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { searchVideos, getVideoDetails, getSearchSuggestions, getChannelDetails } from '../api/youtube';
import VideoCard from '../components/VideoCard';
import { TetColors } from '../theme/colors';

const SearchScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // The actual query used for searching
  const [videos, setVideos] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const debounceTimer = useRef(null);
  const inputRef = useRef(null);

  // Debounced search suggestions
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.trim().length >= 2) {
      setShowSuggestions(true);
      setLoadingSuggestions(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          const data = await getSearchSuggestions(query);
          const suggestionItems = data.items || [];
          // Use video titles as search suggestions (since YouTube doesn't have official autocomplete API)
          setSuggestions(suggestionItems.map(item => ({
            id: item.id.videoId,
            title: item.snippet?.title || '',
            searchQuery: item.snippet?.title || '', // The actual query to search
            thumbnail: item.snippet?.thumbnails?.default?.url || '',
          })));
        } catch (err) {
          setSuggestions([]);
        } finally {
          setLoadingSuggestions(false);
        }
      }, 300); // 300ms debounce
    } else if (query.trim().length === 0) {
      // Only hide suggestions when query is completely empty
      setSuggestions([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
    } else {
      // Keep suggestions visible if query has 1 character
      setSuggestions([]);
      setLoadingSuggestions(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const loadSearchResults = useCallback(async (searchTerm, isNewSearch = false) => {
    if (!searchTerm.trim()) {
      return;
    }

    const pageToken = isNewSearch ? null : nextPageToken;
    const isLoadingMore = !isNewSearch && !!nextPageToken;

    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const data = await searchVideos(searchTerm, pageToken, 20);
      const searchResults = data.items || [];

      // Fetch statistics for each video
      const videoIds = searchResults.map(item => item.id.videoId).join(',');
      if (videoIds) {
        try {
          const detailsData = await getVideoDetails(videoIds);
          const detailsMap = {};
          detailsData.items?.forEach(item => {
            detailsMap[item.id] = {
              statistics: item.statistics,
              snippet: item.snippet,
            };
          });

          // Fetch Channel Avatars
          const channelIds = searchResults.map(item => item.snippet?.channelId).filter(Boolean);
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

          const videosWithStats = searchResults.map(item => ({
            id: item.id.videoId,
            snippet: item.snippet,
            statistics: detailsMap[item.id.videoId]?.statistics,
            channelAvatar: channelMap[item.snippet?.channelId] || null
          }));

          if (isNewSearch) {
            setVideos(videosWithStats);
          } else {
            // Filter out duplicates when appending
            setVideos(prev => {
              const existingIds = new Set(prev.map(v => v.id));
              const newVideos = videosWithStats.filter(v => !existingIds.has(v.id));
              return [...prev, ...newVideos];
            });
          }
        } catch (err) {
          // If details fetch fails, use search results without stats but still try avatars
          let videosWithoutStats = searchResults.map(item => ({
            id: item.id.videoId,
            snippet: item.snippet,
          }));

          // Try fetching avatars even if stats failed
          try {
            const channelIds = videosWithoutStats.map(item => item.snippet?.channelId).filter(Boolean);
            if (channelIds.length > 0) {
              const channelData = await getChannelDetails(channelIds);
              let channelMap = {};
              if (channelData.items) {
                channelData.items.forEach(ch => {
                  channelMap[ch.id] = ch.snippet?.thumbnails?.default?.url;
                });
              }
              videosWithoutStats = videosWithoutStats.map(v => ({
                ...v,
                channelAvatar: channelMap[v.snippet?.channelId] || null
              }));
            }
          } catch (e) { console.log('Avatar fetch failed in catch block', e); }


          if (isNewSearch) {
            setVideos(videosWithoutStats);
          } else {
            // Filter out duplicates when appending
            setVideos(prev => {
              const existingIds = new Set(prev.map(v => v.id));
              const newVideos = videosWithoutStats.filter(v => !existingIds.has(v.id));
              return [...prev, ...newVideos];
            });
          }
        }
      } else {
        if (isNewSearch) {
          setVideos([]);
        }
      }

      setNextPageToken(data.nextPageToken || null);
      setHasMore(!!data.nextPageToken);
    } catch (err) {
      console.error('Error searching videos:', err);
      setError('Failed to search videos. Please check your API key.');
      if (isNewSearch) {
        setVideos([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [nextPageToken]);

  const handleSearch = useCallback(async (searchTerm = null) => {
    const searchText = searchTerm || query;
    if (!searchText.trim()) {
      return;
    }

    Keyboard.dismiss();
    setHasSearched(true);
    setShowSuggestions(false);
    setSearchQuery(searchText);
    setQuery(searchText);
    setNextPageToken(null);
    setHasMore(true);
    await loadSearchResults(searchText, true);
  }, [query, loadSearchResults]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading && searchQuery) {
      loadSearchResults(searchQuery, false);
    }
  }, [loadingMore, hasMore, loading, searchQuery, loadSearchResults]);

  const handleSuggestionPress = useCallback((suggestion) => {
    const searchTerm = suggestion.searchQuery || suggestion.title;
    setQuery(searchTerm);
    setShowSuggestions(false);
    // Use setTimeout to ensure input doesn't lose focus immediately
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      Keyboard.dismiss();
      handleSearch(searchTerm);
    }, 100);
  }, [handleSearch]);

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

  const renderSuggestion = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}
      onPressIn={() => {
        // Keep keyboard open when pressing suggestion
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }}
    >
      <Ionicons name="time-outline" size={20} color={TetColors.textTertiary} style={styles.suggestionIcon} />
      <Text style={styles.suggestionText} numberOfLines={1}>{item.title}</Text>
      {item.thumbnail && (
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.suggestionThumbnail}
          resizeMode="cover"
        />
      )}
      <TouchableOpacity
        style={styles.suggestionActionButton}
        onPress={(e) => {
          e.stopPropagation();
          // Add to search history or remove
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={18} color={TetColors.textTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  ), [handleSuggestionPress]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.searchBarContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={TetColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Tìm trên GoldTurf"
            placeholderTextColor={TetColors.textDisabled}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (text.length >= 2) {
                setShowSuggestions(true);
              } else if (text.length === 0) {
                setShowSuggestions(false);
                setSuggestions([]);
              }
            }}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (query.trim().length > 0) {
                Keyboard.dismiss();
                handleSearch();
              }
            }}
            blurOnSubmit={false}
            autoCorrect={false}
            autoCapitalize="none"
            editable={true}
          />
          <TouchableOpacity
            style={styles.micButton}
            onPress={() => {
              // Voice search functionality
              Keyboard.dismiss();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="mic-outline" size={24} color={TetColors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          renderItem={renderSuggestion}
          keyExtractor={(item, index) => `suggestion-${item.id}-${index}`}
          scrollEnabled={false}
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled={true}
          style={styles.suggestionsList}
        />
      )}

      {loadingSuggestions && (
        <View style={styles.suggestionsLoader}>
          <ActivityIndicator size="small" color={TetColors.gold} />
        </View>
      )}

      {hasSearched && !showSuggestions && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {videos.length} kết quả
          </Text>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={TetColors.gold} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={TetColors.gold} />
          <Text style={styles.emptyText}>Đang tìm kiếm...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={TetColors.red} />
          </View>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      );
    }

    if (hasSearched) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="search-outline" size={64} color={TetColors.textTertiary} />
          </View>
          <Text style={styles.emptyText}>Không tìm thấy video</Text>
          <Text style={styles.emptySubtext}>Thử từ khóa khác</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="search-outline" size={64} color={TetColors.textTertiary} />
        </View>
        <Text style={styles.emptyText}>Tìm kiếm video</Text>
        <Text style={styles.emptySubtext}>Nhập từ khóa để tìm video</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlatList
        data={videos}
        renderItem={renderVideoCard}
        keyExtractor={(item) => item.id}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={videos.length > 0 ? styles.listContent : styles.listContentEmpty}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TetColors.background,
  },
  headerContainer: {
    backgroundColor: TetColors.background,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TetColors.backgroundElevated,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: TetColors.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  micButton: {
    padding: 8,
    marginLeft: 8,
  },
  suggestionsList: {
    backgroundColor: TetColors.background,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#3a3a3a',
  },
  suggestionIcon: {
    marginRight: 16,
  },
  suggestionText: {
    flex: 1,
    color: TetColors.textPrimary,
    fontSize: 15,
  },
  suggestionThumbnail: {
    width: 48,
    height: 36,
    borderRadius: 4,
    marginLeft: 12,
    marginRight: 8,
    backgroundColor: TetColors.backgroundElevated,
  },
  suggestionActionButton: {
    padding: 4,
  },
  suggestionsLoader: {
    padding: 16,
    alignItems: 'center',
  },
  resultsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  resultsText: {
    color: TetColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${TetColors.gold}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    color: TetColors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptySubtext: {
    color: TetColors.textTertiary,
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});

export default SearchScreen;

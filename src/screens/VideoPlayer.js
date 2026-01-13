import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import { getVideoDetails } from '../api/youtube';
import { Ionicons } from '@expo/vector-icons';
import { TetColors } from '../theme/colors';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = (width * 9) / 16; // 16:9 aspect ratio

const VideoPlayer = ({ route, navigation }) => {
  const { video: initialVideo } = route.params;
  const [video, setVideo] = useState(initialVideo);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadVideoDetails = async () => {
      if (!initialVideo.id) {
        setError('Invalid video ID');
        setLoading(false);
        return;
      }

      // If video already has statistics, don't fetch again
      if (initialVideo.statistics) {
        setLoading(false);
        return;
      }

      try {
        const data = await getVideoDetails(initialVideo.id);
        if (data.items && data.items.length > 0) {
          setVideo({
            ...initialVideo,
            snippet: data.items[0].snippet,
            statistics: data.items[0].statistics,
          });
        }
      } catch (err) {
        console.error('Error loading video details:', err);
        setError('Failed to load video details');
      } finally {
        setLoading(false);
      }
    };

    loadVideoDetails();
  }, [initialVideo]);

  const onStateChange = useCallback((state) => {
    if (state === 'playing') {
      setPlaying(true);
    } else if (state === 'paused') {
      setPlaying(false);
    }
  }, []);

  const togglePlaying = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const formatNumber = (num) => {
    if (!num) return '0';
    const number = parseInt(num);
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    }
    if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    }
    return number.toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={TetColors.gold} />
          <Text style={styles.loadingText}>Đang tải video...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={TetColors.red} />
          </View>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const videoId = video.id;
  const title = video.snippet?.title || 'No title';
  const channelTitle = video.snippet?.channelTitle || 'Unknown channel';
  const description = video.snippet?.description || 'No description available';
  const viewCount = formatNumber(video.statistics?.viewCount);
  const likeCount = formatNumber(video.statistics?.likeCount);
  const publishedAt = formatDate(video.snippet?.publishedAt);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.playerContainer}>
          <YoutubePlayer
            height={VIDEO_HEIGHT}
            play={playing}
            videoId={videoId}
            onChangeState={onStateChange}
            webViewStyle={styles.webView}
          />
        </View>

        <View style={styles.detailsContainer}>
          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Stats and Actions Row */}
          <View style={styles.statsRow}>
            <View style={styles.viewsContainer}>
              <Text style={styles.viewsText}>{viewCount} lượt xem</Text>
              <Text style={styles.dateText}>{publishedAt}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="thumbs-up-outline" size={24} color={TetColors.textPrimary} />
              <Text style={styles.actionText}>{likeCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="thumbs-down-outline" size={24} color={TetColors.textPrimary} />
              <Text style={styles.actionText}>Không thích</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-outline" size={24} color={TetColors.textPrimary} />
              <Text style={styles.actionText}>Chia sẻ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="download-outline" size={24} color={TetColors.textPrimary} />
              <Text style={styles.actionText}>Tải xuống</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Channel Section */}
          <View style={styles.channelContainer}>
            <View style={styles.channelInfo}>
              <View style={styles.channelAvatar}>
                <Text style={styles.channelInitial}>
                  {channelTitle.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.channelDetails}>
                <Text style={styles.channelName}>{channelTitle}</Text>
                <Text style={styles.subscriberCount}>1.2M người đăng ký</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.subscribeButton}>
              <Text style={styles.subscribeText}>ĐĂNG KÝ</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.description} numberOfLines={3}>
              {description}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TetColors.background,
  },
  scrollView: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: TetColors.background,
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${TetColors.red}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorText: {
    color: TetColors.textPrimary,
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  playerContainer: {
    width: '100%',
    backgroundColor: '#000000',
  },
  webView: {
    opacity: 0.99,
  },
  detailsContainer: {
    padding: 16,
  },
  title: {
    color: TetColors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewsText: {
    color: TetColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  dateText: {
    color: TetColors.textTertiary,
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    marginBottom: 8,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: TetColors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: TetColors.border,
    marginVertical: 12,
  },
  channelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TetColors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  channelInitial: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    color: TetColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subscriberCount: {
    color: TetColors.textTertiary,
    fontSize: 12,
  },
  subscribeButton: {
    backgroundColor: TetColors.gold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  subscribeText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  descriptionContainer: {
    paddingVertical: 8,
  },
  description: {
    color: TetColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default VideoPlayer;

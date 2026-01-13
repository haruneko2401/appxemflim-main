import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Image,
  FlatList,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import { getVideoDetails, getChannelDetails, getRandomVideos } from '../api/youtube';
import { Ionicons } from '@expo/vector-icons';
import { TetColors } from '../theme/colors';
import VideoCard from '../components/VideoCard';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = (width * 9) / 16;

const VideoPlayer = ({ route, navigation }) => {
  const { video: initialVideo } = route.params;
  const [video, setVideo] = useState(initialVideo);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // 1. Load Video Details
      let currentVideo = { ...initialVideo };

      if (!currentVideo.id) {
        setError('Invalid video ID');
        setLoading(false);
        return;
      }

      if (!currentVideo.statistics) {
        try {
          const data = await getVideoDetails(initialVideo.id);
          if (data.items && data.items.length > 0) {
            currentVideo = {
              ...currentVideo,
              snippet: data.items[0].snippet,
              statistics: data.items[0].statistics,
            };
          }
        } catch (err) {
          console.error('Error loading video details:', err);
        }
      }

      // 2. Load Channel Avatar if missing
      if (!currentVideo.channelAvatar && currentVideo.snippet?.channelId) {
        try {
          const channelData = await getChannelDetails([currentVideo.snippet.channelId]);
          if (channelData.items && channelData.items.length > 0) {
            const channelItem = channelData.items[0];
            currentVideo.channelAvatar = channelItem.snippet?.thumbnails?.default?.url;
            currentVideo.subscriberCount = channelItem.statistics?.subscriberCount;
          }
        } catch (err) {
          console.error('Error fetching channel avatar:', err);
        }
      }

      setVideo(currentVideo);
      setLoading(false);

      // 3. Load Related/Random Videos
      try {
        const randomData = await getRandomVideos(10);

        // Get avatars for related videos too for a complete look
        const relatedItems = randomData.items || [];
        const channelIds = relatedItems.map(item => item.snippet?.channelId).filter(Boolean);
        if (channelIds.length > 0) {
          const channelData = await getChannelDetails(channelIds);
          const channelMap = {};
          channelData.items?.forEach(ch => {
            channelMap[ch.id] = ch.snippet?.thumbnails?.default?.url;
          });
          const relatedWithAvatars = relatedItems.map(v => ({
            ...v,
            channelAvatar: channelMap[v.snippet?.channelId]
          }));
          setRelatedVideos(relatedWithAvatars);
        } else {
          setRelatedVideos(relatedItems);
        }
      } catch (err) {
        console.error("Error loading related videos", err);
      } finally {
        setRelatedLoading(false);
      }
    };

    loadData();
  }, [initialVideo]);

  const onStateChange = useCallback((state) => {
    if (state === 'playing') setPlaying(true);
    if (state === 'paused') setPlaying(false);
  }, []);

  const formatNumber = (num) => {
    if (!num) return '0';
    const number = parseInt(num);
    if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
    if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
    return number.toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renderHeader = () => {
    const videoId = video.id;
    const title = video.snippet?.title || 'No title';
    const channelTitle = video.snippet?.channelTitle || 'Unknown channel';
    const description = video.snippet?.description || '';
    const viewCount = formatNumber(video.statistics?.viewCount);
    const likeCount = formatNumber(video.statistics?.likeCount);
    const publishedAt = formatDate(video.snippet?.publishedAt);
    const subscriberCount = video.subscriberCount ? formatNumber(video.subscriberCount) : '1.2M';

    return (
      <View>
        <View style={styles.playerContainer}>
          <YoutubePlayer
            height={VIDEO_HEIGHT}
            play={playing}
            videoId={videoId}
            onChangeState={onStateChange}
            webViewStyle={styles.webView}
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.videoTitle} numberOfLines={2}>{title}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{viewCount} lượt xem</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{publishedAt}</Text>
          </View>

          {/* Channel Section */}
          <View style={styles.channelRow}>
            <View style={styles.channelInfo}>
              <View style={styles.avatarContainer}>
                {video.channelAvatar ? (
                  <Image source={{ uri: video.channelAvatar }} style={styles.avatar} />
                ) : (
                  <Text style={styles.avatarText}>{channelTitle.charAt(0)}</Text>
                )}
              </View>
              <View>
                <Text style={styles.channelName} numberOfLines={1}>{channelTitle}</Text>
                <Text style={styles.subscriberText}>{subscriberCount} người đăng ký</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.subscribeBtn}>
              <Text style={styles.subscribeBtnText}>Đăng ký</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons ScrollView */}
          <View style={styles.actionsList}>
            <TouchableOpacity style={styles.actionCapsule}>
              <Ionicons name="thumbs-up-outline" size={20} color={TetColors.textPrimary} />
              <Text style={styles.actionText}>{likeCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCapsule}>
              <Ionicons name="share-social-outline" size={20} color={TetColors.textPrimary} />
              <Text style={styles.actionText}>Chia sẻ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCapsule}>
              <Ionicons name="download-outline" size={20} color={TetColors.textPrimary} />
              <Text style={styles.actionText}>Tải xuống</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCapsule}>
              <Ionicons name="bookmark-outline" size={20} color={TetColors.textPrimary} />
              <Text style={styles.actionText}>Lưu</Text>
            </TouchableOpacity>
          </View>

          {/* Description Card */}
          <TouchableOpacity
            style={styles.descriptionCard}
            onPress={() => setDescriptionExpanded(!descriptionExpanded)}
            activeOpacity={0.9}
          >
            <Text style={styles.descriptionTitle}>Mô tả</Text>
            <Text style={styles.descriptionText} numberOfLines={descriptionExpanded ? undefined : 3}>
              {description}
            </Text>
            <Text style={styles.moreText}>
              {descriptionExpanded ? 'Thu gọn' : 'Xem thêm'}
            </Text>
          </TouchableOpacity>

          {/* Comments Preview */}
          <View style={styles.commentsPreview}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Bình luận</Text>
              <Text style={styles.commentsCount}>{formatNumber(video.statistics?.commentCount || 1024)}</Text>
            </View>
            <View style={styles.commentPlaceholder}>
              <View style={styles.commentAvatar} />
              <View style={styles.commentInput}>
                <Text style={styles.commentInputText}>Thêm bình luận...</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Video liên quan</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={TetColors.gold} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <FlatList
        data={relatedVideos}
        renderItem={({ item }) => <VideoCard video={item} onPress={() => navigation.push('VideoPlayer', { video: item })} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={relatedLoading ? <ActivityIndicator color={TetColors.gold} style={{ margin: 20 }} /> : null}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TetColors.background,
  },
  playerContainer: {
    width: '100%',
    backgroundColor: '#000',
    marginBottom: 12,
  },
  webView: {
    opacity: 0.99,
  },
  infoContainer: {
    paddingHorizontal: 16,
  },
  videoTitle: {
    color: TetColors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaText: {
    color: TetColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  metaDot: {
    color: TetColors.textSecondary,
    fontSize: 13,
    marginHorizontal: 8,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: TetColors.backgroundElevated,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TetColors.gold,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  channelName: {
    color: TetColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subscriberText: {
    color: TetColors.textSecondary,
    fontSize: 12,
  },
  subscribeBtn: {
    backgroundColor: TetColors.gold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  subscribeBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  actionsList: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
    flexWrap: 'wrap',
  },
  actionCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TetColors.backgroundElevated,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  actionText: {
    color: TetColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  descriptionCard: {
    backgroundColor: TetColors.backgroundElevated,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  descriptionTitle: {
    color: TetColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  descriptionText: {
    color: TetColors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  moreText: {
    color: TetColors.gold,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  commentsPreview: {
    marginBottom: 24,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  commentsTitle: {
    color: TetColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  commentsCount: {
    color: TetColors.textSecondary,
    fontSize: 14,
  },
  commentPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TetColors.backgroundElevated,
    padding: 8,
    borderRadius: 24, // Pill shape input
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TetColors.textTertiary,
    marginRight: 12,
    marginLeft: 4,
  },
  commentInputText: {
    color: TetColors.textSecondary,
    fontSize: 14,
  },
  sectionTitle: {
    color: TetColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
});

export default VideoPlayer;

import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TetColors } from '../theme/colors';

const VideoCard = memo(({ video, onPress, navigation }) => {
  const thumbnail = video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url;
  const title = video.snippet?.title || 'No title';
  const channelTitle = video.snippet?.channelTitle || 'Unknown channel';
  const channelId = video.snippet?.channelId || null;

  // Format view count
  const formatViews = (count) => {
    if (!count) return 'N/A';
    const num = parseInt(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const viewCount = formatViews(video.statistics?.viewCount);

  // Format published date
  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return '1 ngày trước';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
    return `${Math.floor(diffDays / 365)} năm trước`;
  };

  const timeAgo = getTimeAgo(video.snippet?.publishedAt);

  const handleChannelPress = (e) => {
    e.stopPropagation();
    if (navigation) {
      navigation.navigate('Channel', {
        channelTitle,
        channelId
      });
    } else {
      console.log('Navigate to channel:', channelTitle);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Thumbnail with duration badge */}
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        {/* Duration badge - placeholder for now */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>10:23</Text>
        </View>
      </View>

      {/* Video info */}
      <View style={styles.infoContainer}>
        <TouchableOpacity
          style={styles.channelButton}
          onPress={handleChannelPress}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            {video.channelAvatar ? (
              <Image
                source={{ uri: video.channelAvatar }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {channelTitle.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={handleChannelPress}
            activeOpacity={0.7}
          >
            <View style={styles.metadata}>
              <Text style={styles.channelName} numberOfLines={1}>
                {channelTitle}
              </Text>
              <Text style={styles.metaText}>
                {viewCount} lượt xem • {timeAgo}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.menuButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-vertical" size={20} color={TetColors.textTertiary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    backgroundColor: TetColors.background,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: TetColors.backgroundElevated,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  channelButton: {
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TetColors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Add hidden to clip image
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  details: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: TetColors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 4,
  },
  metadata: {
    flexDirection: 'column',
  },
  channelName: {
    color: TetColors.textTertiary,
    fontSize: 12,
    marginBottom: 2,
  },
  metaText: {
    color: TetColors.textTertiary,
    fontSize: 12,
  },
  menuButton: {
    paddingTop: 2,
  },
});

VideoCard.displayName = 'VideoCard';

export default VideoCard;

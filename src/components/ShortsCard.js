import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TetColors } from '../theme/colors';

const { width } = Dimensions.get('window');
const SHORTS_ITEM_WIDTH = (width - 48) / 3; // 3 columns with padding
const SHORTS_ITEM_HEIGHT = SHORTS_ITEM_WIDTH * 16 / 9; // 16:9 aspect ratio for vertical

const ShortsCard = ({ video, onPress }) => {
    const thumbnail = video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url;
    const title = video.snippet?.title || 'No title';

    // Format view count
    const formatViews = (count) => {
        if (!count) return 'N/A';
        const num = parseInt(count);
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toLocaleString();
    };

    const viewCount = formatViews(video.statistics?.viewCount);

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={styles.thumbnailContainer}>
                <Image
                    source={{ uri: thumbnail }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />
                <View style={styles.viewsOverlay}>
                    <Ionicons name="play" size={12} color="#FFFFFF" />
                    <Text style={styles.viewsText}>{viewCount}</Text>
                </View>
            </View>
            <Text style={styles.title} numberOfLines={2}>
                {title}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SHORTS_ITEM_WIDTH,
        marginBottom: 16,
    },
    thumbnailContainer: {
        width: '100%',
        height: SHORTS_ITEM_HEIGHT,
        backgroundColor: TetColors.backgroundElevated,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    viewsOverlay: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    viewsText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    title: {
        color: TetColors.textPrimary,
        fontSize: 12,
        fontWeight: '500',
        marginTop: 6,
        lineHeight: 16,
    },
});

export default ShortsCard;

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Image,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TetColors } from '../theme/colors';
import VideoCard from '../components/VideoCard';
import ShortsCard from '../components/ShortsCard';
import { getChannelVideos, getChannelShorts, getChannelDetails } from '../api/youtube';

const ChannelScreen = ({ route, navigation }) => {
    const { channelTitle, channelId } = route.params;
    const [activeTab, setActiveTab] = useState('home');
    const [videos, setVideos] = useState([]);
    const [shorts, setShorts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextPageToken, setNextPageToken] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const [channelDetails, setChannelDetails] = useState(null);

    // Mock data for demonstration - will be merged with real API data
    const [channelInfo, setChannelInfo] = useState({
        name: channelTitle,
        handle: `@${channelTitle.toLowerCase().replace(/\s+/g, '')} `,
        subscribers: '...',
        videoCount: '...',
        description: '...',
        links: [],
        banner: null,
        avatar: null, // Add avatar field
    });

    // Fetch channel videos
    useEffect(() => {
        loadChannelContent(true);
    }, [channelTitle, activeTab]);

    const loadChannelContent = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setLoading(true);
                // Fetch channel info strictly once per channel load
                if (!channelDetails || channelDetails.id !== channelId) {
                    try {
                        const info = await getChannelDetails([channelId]);
                        if (info.items && info.items.length > 0) {
                            const item = info.items[0];
                            setChannelDetails(item);

                            // Format stats
                            const subCount = item.statistics?.subscriberCount;
                            const formattedSubs = subCount >= 1000000
                                ? `${(subCount / 1000000).toFixed(1)}M`
                                : subCount >= 1000
                                    ? `${(subCount / 1000).toFixed(0)}K`
                                    : subCount;

                            setChannelInfo(prev => ({
                                ...prev,
                                name: item.snippet?.title || prev.name,
                                handle: item.snippet?.customUrl || prev.handle,
                                subscribers: `${formattedSubs} người đăng ký`,
                                videoCount: `${item.statistics?.videoCount} video`,
                                description: item.snippet?.description || prev.description,
                                banner: item.brandingSettings?.image?.bannerExternalUrl || null,
                                avatar: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url
                            }));
                        }
                    } catch (e) {
                        console.log("Error fetching channel info", e);
                    }
                }
            } else {
                setLoadingMore(true);
            }

            const pageToken = isRefresh ? null : nextPageToken;

            // Fetch both videos and shorts for home tab, or specific content for other tabs
            if (activeTab === 'home' || activeTab === 'videos') {
                const data = await getChannelVideos(channelTitle, channelId, pageToken, 20);
                const allVideos = data.items || [];
                const regularVideos = allVideos.filter(v => !v.isShort);

                if (isRefresh) {
                    setVideos(regularVideos);
                    // Also fetch shorts for home tab
                    if (activeTab === 'home') {
                        const shortsData = await getChannelShorts(channelTitle, channelId, null, 12);
                        setShorts(shortsData.items || []);
                    }
                } else {
                    setVideos(prev => {
                        const existingIds = new Set(prev.map(v => v.id));
                        const newVideos = regularVideos.filter(v => !existingIds.has(v.id));
                        return [...prev, ...newVideos];
                    });
                }

                setNextPageToken(data.nextPageToken || null);
                setHasMore(!!data.nextPageToken);
            } else if (activeTab === 'shorts') {
                // Fetch only shorts
                const shortsData = await getChannelShorts(channelTitle, channelId, pageToken, 20);

                if (isRefresh) {
                    setShorts(shortsData.items || []);
                } else {
                    setShorts(prev => {
                        const existingIds = new Set(prev.map(v => v.id));
                        const newShorts = (shortsData.items || []).filter(v => !existingIds.has(v.id));
                        return [...prev, ...newShorts];
                    });
                }

                setNextPageToken(shortsData.nextPageToken || null);
                setHasMore(!!shortsData.nextPageToken);
            }
        } catch (error) {
            console.error('Error loading channel content:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore && !loading && (activeTab === 'videos' || activeTab === 'shorts')) {
            loadChannelContent(false);
        }
    }, [loadingMore, hasMore, loading, activeTab, loadChannelContent]);

    const handleVideoPress = (video) => {
        navigation.navigate('VideoPlayer', { video });
    };

    const renderVideoCard = ({ item }) => (
        <VideoCard video={item} onPress={() => handleVideoPress(item)} />
    );

    const renderHeader = () => (
        <View>
            {/* Channel Banner */}
            {channelInfo.banner && (
                <Image
                    source={{ uri: channelInfo.banner }}
                    style={styles.banner}
                    resizeMode="cover"
                />
            )}

            {/* Channel Info */}
            <View style={styles.channelHeader}>
                <View style={[styles.avatarContainer, { marginTop: channelInfo.banner ? -40 : 16 }]}>
                    <View style={styles.channelAvatar}>
                        {channelInfo.avatar ? (
                            <Image
                                source={{ uri: channelInfo.avatar }}
                                style={{ width: '100%', height: '100%' }}
                            />
                        ) : (
                            <Text style={styles.avatarText}>
                                {channelInfo.name.charAt(0).toUpperCase()}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.channelInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.channelName}>{channelInfo.name}</Text>
                        <Ionicons name="checkmark-circle" size={20} color={TetColors.textPrimary} />
                    </View>
                    <Text style={styles.channelHandle}>{channelInfo.handle}</Text>
                    <Text style={styles.channelStats}>
                        {channelInfo.subscribers} • {channelInfo.videoCount}
                    </Text>
                </View>

                {/* Description */}
                <Text style={styles.description} numberOfLines={3}>
                    {channelInfo.description}
                </Text>

                {/* Links */}
                {channelInfo.links && channelInfo.links.length > 0 && (
                    <Text style={styles.links} numberOfLines={1}>
                        {channelInfo.links.join(' • ')}
                    </Text>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.subscribeButton}>
                        <Text style={styles.subscribeText}>Đăng ký</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.joinButton}>
                        <Ionicons name="star" size={20} color={TetColors.textPrimary} />
                        <Text style={styles.joinText}>Tham gia</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'home' && styles.tabActive]}
                        onPress={() => setActiveTab('home')}
                    >
                        <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>
                            Trang chủ
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'videos' && styles.tabActive]}
                        onPress={() => setActiveTab('videos')}
                    >
                        <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>
                            Video
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'shorts' && styles.tabActive]}
                        onPress={() => setActiveTab('shorts')}
                    >
                        <Text style={[styles.tabText, activeTab === 'shorts' && styles.tabTextActive]}>
                            Shorts
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'live' && styles.tabActive]}
                        onPress={() => setActiveTab('live')}
                    >
                        <Text style={[styles.tabText, activeTab === 'live' && styles.tabTextActive]}>
                            Video phát trực tiếp
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
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

    const renderHomeContent = () => {
        const homeData = [
            { type: 'horizontal', title: 'Dành cho bạn', videos: videos.slice(0, 6) },
            { type: 'shorts', title: 'Shorts', videos: shorts.slice(0, 6) },
            { type: 'section', title: 'Video', videos: videos.slice(6, 9) },
        ];

        return (
            <FlatList
                data={homeData}
                keyExtractor={(item, index) => `home-section-${index}`}
                ListHeaderComponent={renderHeader}
                renderItem={({ item }) => {
                    if (item.type === 'horizontal' && item.videos.length > 0) {
                        return (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{item.title}</Text>
                                <FlatList
                                    data={item.videos}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(video, index) => `horizontal-video-${index}`}
                                    renderItem={({ item: video }) => (
                                        <View style={styles.horizontalVideoCard}>
                                            <VideoCard
                                                video={video}
                                                onPress={() => handleVideoPress(video)}
                                                navigation={navigation}
                                            />
                                        </View>
                                    )}
                                    contentContainerStyle={styles.horizontalList}
                                />
                            </View>
                        );
                    } else if (item.type === 'shorts' && item.videos.length > 0) {
                        return (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{item.title}</Text>
                                <View style={styles.shortsGrid}>
                                    {item.videos.map((video, index) => (
                                        <ShortsCard
                                            key={`short-${index}`}
                                            video={video}
                                            onPress={() => handleVideoPress(video)}
                                        />
                                    ))}
                                </View>
                            </View>
                        );
                    } else if (item.type === 'section' && item.videos.length > 0) {
                        return (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{item.title}</Text>
                                {item.videos.map((video, index) => (
                                    <VideoCard
                                        key={`video-${index}`}
                                        video={video}
                                        onPress={() => handleVideoPress(video)}
                                        navigation={navigation}
                                    />
                                ))}
                            </View>
                        );
                    }
                    return null;
                }}
            />
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={TetColors.gold} />
                    <Text style={styles.loadingText}>Đang tải video...</Text>
                </View>
            ) : (
                <>
                    {activeTab === 'home' && renderHomeContent()}

                    {activeTab === 'videos' && (
                        <FlatList
                            data={videos}
                            renderItem={({ item }) => (
                                <VideoCard
                                    video={item}
                                    onPress={() => handleVideoPress(item)}
                                    navigation={navigation}
                                />
                            )}
                            keyExtractor={(item, index) => `video - ${item.id} -${index} `}
                            ListHeaderComponent={renderHeader}
                            ListFooterComponent={renderFooter}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="videocam-outline" size={64} color={TetColors.textTertiary} />
                                    <Text style={styles.emptyText}>Chưa có video nào</Text>
                                    <Text style={styles.emptySubtext}>Kênh này chưa đăng video</Text>
                                </View>
                            }
                            contentContainerStyle={videos.length > 0 ? styles.listContent : styles.listContentEmpty}
                            onEndReached={loadMore}
                            onEndReachedThreshold={0.5}
                        />
                    )}

                    {activeTab === 'shorts' && (
                        <FlatList
                            data={shorts}
                            renderItem={({ item }) => (
                                <ShortsCard
                                    video={item}
                                    onPress={() => handleVideoPress(item)}
                                />
                            )}
                            keyExtractor={(item, index) => `short - ${item.id} -${index} `}
                            numColumns={3}
                            columnWrapperStyle={styles.shortsRow}
                            ListHeaderComponent={renderHeader}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="play-circle-outline" size={64} color={TetColors.textTertiary} />
                                    <Text style={styles.emptyText}>Chưa có Shorts nào</Text>
                                    <Text style={styles.emptySubtext}>Kênh này chưa đăng Shorts</Text>
                                </View>
                            }
                            contentContainerStyle={shorts.length > 0 ? styles.shortsContent : styles.listContentEmpty}
                        />
                    )}

                    {activeTab === 'live' && (
                        <FlatList
                            data={[]}
                            ListHeaderComponent={renderHeader}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="radio-outline" size={64} color={TetColors.textTertiary} />
                                    <Text style={styles.emptyText}>Chưa có video phát trực tiếp</Text>
                                </View>
                            }
                            contentContainerStyle={styles.listContentEmpty}
                        />
                    )}
                </>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: TetColors.background,
    },
    banner: {
        width: '100%',
        height: 150,
        backgroundColor: TetColors.backgroundElevated,
    },
    channelHeader: {
        padding: 16,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    channelAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: TetColors.gold,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarText: {
        color: '#000000',
        fontSize: 32,
        fontWeight: '700',
    },
    channelInfo: {
        alignItems: 'center',
        marginBottom: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    channelName: {
        color: TetColors.textPrimary,
        fontSize: 20,
        fontWeight: '700',
    },
    channelHandle: {
        color: TetColors.textTertiary,
        fontSize: 14,
        marginBottom: 4,
    },
    channelStats: {
        color: TetColors.textTertiary,
        fontSize: 13,
    },
    description: {
        color: TetColors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    links: {
        color: TetColors.gold,
        fontSize: 13,
        marginBottom: 16,
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    subscribeButton: {
        flex: 1,
        backgroundColor: TetColors.textPrimary,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
    },
    subscribeText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '700',
    },
    joinButton: {
        flex: 1,
        backgroundColor: TetColors.backgroundElevated,
        paddingVertical: 10,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    joinText: {
        color: TetColors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    tabsContainer: {
        borderBottomWidth: 1,
        borderBottomColor: TetColors.border,
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: TetColors.textPrimary,
    },
    tabText: {
        color: TetColors.textTertiary,
        fontSize: 14,
        fontWeight: '500',
    },
    tabTextActive: {
        color: TetColors.textPrimary,
        fontWeight: '700',
    },
    listContent: {
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    listContentEmpty: {
        flexGrow: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: TetColors.textPrimary,
        fontSize: 16,
        marginTop: 16,
        fontWeight: '500',
    },
    footerLoader: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        color: TetColors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        color: TetColors.textTertiary,
        fontSize: 14,
        marginTop: 4,
    },
    tabContent: {
        flex: 1,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: TetColors.textPrimary,
        fontSize: 18,
        fontWeight: '700',
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    shortsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        gap: 12,
    },
    shortsContent: {
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    shortsRow: {
        justifyContent: 'space-between',
        paddingHorizontal: 12,
    },
    horizontalList: {
        paddingHorizontal: 12,
    },
    horizontalVideoCard: {
        width: 320,
        marginRight: 12,
    },
});

export default ChannelScreen;

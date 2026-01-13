import axios from 'axios';
// Note: react-native-dotenv may not work with Expo SDK 54
// Using direct import from .env as fallback
// TODO: Fix environment variable loading
let YOUTUBE_API_KEY;
try {
  const envModule = require('@env');
  YOUTUBE_API_KEY = envModule.YOUTUBE_API_KEY;
} catch (e) {
  // Fallback: hardcode API key if env loading fails
  YOUTUBE_API_KEY = 'AIzaSyCnXLtkHMPZWaXjuX4fuIRClnbAMK1TBQo';
}

const API_KEY = YOUTUBE_API_KEY || 'AIzaSyCnXLtkHMPZWaXjuX4fuIRClnbAMK1TBQo';

// Debug: Log API key status (first 10 chars only for security)
console.log('API Key loaded:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'NOT FOUND');
console.log('API Key length:', API_KEY ? API_KEY.length : 0);

const apiClient = axios.create({
  baseURL: 'https://www.googleapis.com/youtube/v3',
});

/**
 * Fetches popular videos with pagination and filters
 * @param {string} pageToken - Optional page token for pagination
 * @param {number} maxResults - Number of results (default 20)
 * @param {string} regionCode - Region code (default 'VN')
 * @param {string} categoryId - Optional category ID
 * @returns {Promise} Response containing list of popular videos
 */
export const getPopularVideos = async (pageToken = null, maxResults = 20, regionCode = 'VN', categoryId = null) => {
  try {
    const params = {
      key: API_KEY,
      chart: 'mostPopular',
      part: 'snippet,statistics',
      regionCode,
      maxResults,
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    if (categoryId) {
      params.videoCategoryId = categoryId;
    }

    const response = await apiClient.get('/videos', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching popular videos:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Gets video categories for a region
 * @param {string} regionCode - Region code (default 'VN')
 * @returns {Promise} Response containing video categories
 */
export const getVideoCategories = async (regionCode = 'VN') => {
  try {
    const response = await apiClient.get('/videoCategories', {
      params: {
        key: API_KEY,
        part: 'snippet',
        regionCode,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching video categories:', error);
    return { items: [] };
  }
};

/**
 * Searches for videos by query with pagination
 * @param {string} query - Search keyword
 * @param {string} pageToken - Optional page token for pagination
 * @param {number} maxResults - Number of results (default 20)
 * @returns {Promise} Response containing list of videos matching the query
 */
export const searchVideos = async (query, pageToken = null, maxResults = 20) => {
  try {
    const params = {
      key: API_KEY,
      q: query,
      type: 'video',
      part: 'snippet',
      maxResults,
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await apiClient.get('/search', { params });
    return response.data;
  } catch (error) {
    console.error('Error searching videos:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Gets search suggestions (using search API for autocomplete)
 * Note: YouTube doesn't have official autocomplete API, so we'll use search with partial results
 * @param {string} query - Partial search query
 * @returns {Promise} Response with suggestions
 */
export const getSearchSuggestions = async (query) => {
  if (!query || query.length < 2) {
    return { items: [] };
  }

  try {
    const response = await apiClient.get('/search', {
      params: {
        key: API_KEY,
        q: query,
        type: 'video',
        part: 'snippet',
        maxResults: 5, // Only get a few for suggestions
      },
    });
    return response.data;
  } catch (error) {
    // Silently fail for suggestions
    return { items: [] };
  }
};

/**
 * Gets video details including statistics
 * @param {string} videoId - YouTube video ID
 * @returns {Promise} Response containing video details
 */
export const getVideoDetails = async (videoId) => {
  try {
    const response = await apiClient.get('/videos', {
      params: {
        key: API_KEY,
        id: videoId,
        part: 'snippet,statistics',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching video details:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Gets videos from a specific channel
 * @param {string} channelTitle - Channel title to search for
 * @param {string} channelId - Optional channel ID for more accurate results
 * @param {string} pageToken - Optional page token for pagination
 * @param {number} maxResults - Number of results (default 20)
 * @returns {Promise} Response containing list of channel videos
 */
export const getChannelVideos = async (channelTitle, channelId = null, pageToken = null, maxResults = 20) => {
  try {
    // Build search params
    const params = {
      key: API_KEY,
      type: 'video',
      part: 'snippet',
      maxResults: 50, // Get more to ensure we have enough after filtering
      order: 'date', // Get latest videos first
    };

    // If we have channelId, use it for more accurate results
    if (channelId) {
      params.channelId = channelId;
    } else {
      // Otherwise search by channel name
      params.q = channelTitle;
    }

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await apiClient.get('/search', { params });
    const searchResults = response.data.items || [];

    // Filter results - if no channelId, filter by channel title (more lenient)
    let filteredResults = searchResults;
    if (!channelId) {
      filteredResults = searchResults.filter(item => {
        const itemChannelTitle = item.snippet?.channelTitle || '';
        // Check if channel title contains the search term or vice versa
        return itemChannelTitle.toLowerCase().includes(channelTitle.toLowerCase()) ||
          channelTitle.toLowerCase().includes(itemChannelTitle.toLowerCase());
      });
    }

    // Limit to requested amount
    filteredResults = filteredResults.slice(0, maxResults);

    // Fetch statistics and duration for each video
    const videoIds = filteredResults.map(item => item.id.videoId).join(',');
    if (videoIds) {
      try {
        const detailsResponse = await apiClient.get('/videos', {
          params: {
            key: API_KEY,
            id: videoIds,
            part: 'snippet,statistics,contentDetails',
          },
        });

        const detailsData = detailsResponse.data;
        const detailsMap = {};
        detailsData.items?.forEach(item => {
          // Parse ISO 8601 duration (e.g., PT1M30S = 1 minute 30 seconds)
          const duration = item.contentDetails?.duration || 'PT0S';
          const seconds = parseDuration(duration);

          detailsMap[item.id] = {
            statistics: item.statistics,
            snippet: item.snippet,
            duration: seconds,
            isShort: seconds > 0 && seconds <= 60, // Shorts are ≤60 seconds
          };
        });

        const videosWithStats = filteredResults.map(item => ({
          id: item.id.videoId,
          snippet: item.snippet,
          statistics: detailsMap[item.id.videoId]?.statistics,
          duration: detailsMap[item.id.videoId]?.duration,
          isShort: detailsMap[item.id.videoId]?.isShort || false,
        }));

        return {
          items: videosWithStats,
          nextPageToken: response.data.nextPageToken,
          pageInfo: response.data.pageInfo,
        };
      } catch (err) {
        console.error('Error fetching video details:', err);
        // If details fetch fails, return without stats
        const videosWithoutStats = filteredResults.map(item => ({
          id: item.id.videoId,
          snippet: item.snippet,
          isShort: false, // Default to not short if we can't determine
        }));

        return {
          items: videosWithoutStats,
          nextPageToken: response.data.nextPageToken,
          pageInfo: response.data.pageInfo,
        };
      }
    }

    return {
      items: [],
      nextPageToken: null,
      pageInfo: response.data.pageInfo,
    };
  } catch (error) {
    console.error('Error fetching channel videos:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Parse ISO 8601 duration to seconds
 * @param {string} duration - ISO 8601 duration string (e.g., PT1M30S)
 * @returns {number} Duration in seconds
 */
const parseDuration = (duration) => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Gets Shorts (short videos ≤60s) from a specific channel
 * @param {string} channelTitle - Channel title to search for
 * @param {string} channelId - Optional channel ID for more accurate results
 * @param {string} pageToken - Optional page token for pagination
 * @param {number} maxResults - Number of results (default 20)
 * @returns {Promise} Response containing list of channel shorts
 */
export const getChannelShorts = async (channelTitle, channelId = null, pageToken = null, maxResults = 20) => {
  try {
    // Build search params for short videos
    const params = {
      key: API_KEY,
      type: 'video',
      part: 'snippet',
      maxResults: 50,
      order: 'date',
      videoDuration: 'short', // YouTube filter for videos < 4 minutes (we'll filter further)
    };

    if (channelId) {
      params.channelId = channelId;
    } else {
      params.q = channelTitle;
    }

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await apiClient.get('/search', { params });
    const searchResults = response.data.items || [];

    // Filter by channel if no channelId
    let filteredResults = searchResults;
    if (!channelId) {
      filteredResults = searchResults.filter(item => {
        const itemChannelTitle = item.snippet?.channelTitle || '';
        return itemChannelTitle.toLowerCase().includes(channelTitle.toLowerCase()) ||
          channelTitle.toLowerCase().includes(itemChannelTitle.toLowerCase());
      });
    }

    // Fetch details to get exact duration
    const videoIds = filteredResults.map(item => item.id.videoId).join(',');
    if (videoIds) {
      try {
        const detailsResponse = await apiClient.get('/videos', {
          params: {
            key: API_KEY,
            id: videoIds,
            part: 'snippet,statistics,contentDetails',
          },
        });

        const detailsData = detailsResponse.data;
        const shorts = [];

        detailsData.items?.forEach(item => {
          const duration = item.contentDetails?.duration || 'PT0S';
          const seconds = parseDuration(duration);

          // Only include videos ≤60 seconds (true Shorts)
          if (seconds > 0 && seconds <= 60) {
            shorts.push({
              id: item.id,
              snippet: item.snippet,
              statistics: item.statistics,
              duration: seconds,
              isShort: true,
            });
          }
        });

        return {
          items: shorts.slice(0, maxResults),
          nextPageToken: response.data.nextPageToken,
          pageInfo: response.data.pageInfo,
        };
      } catch (err) {
        console.error('Error fetching shorts details:', err);
        return {
          items: [],
          nextPageToken: null,
          pageInfo: response.data.pageInfo,
        };
      }
    }

    return {
      items: [],
      nextPageToken: null,
      pageInfo: response.data.pageInfo,
    };
  } catch (error) {
    console.error('Error fetching channel shorts:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Gets trending videos based on popular keywords
 * @param {number} maxResults - Number of results
 * @param {string} regionCode - Region code
 * @returns {Promise} Response containing trending videos
 */
export const getTrendingVideos = async (maxResults = 20, regionCode = 'VN') => {
  const trendingKeywords = [
    'viral', 'trending', 'mới nhất', 'hôm nay',
    'hot', 'review', 'hướng dẫn', 'tin tức',
    'phim hay', 'nhạc hay', 'clip vui', 'thử thách'
  ];

  const randomKeyword = trendingKeywords[
    Math.floor(Math.random() * trendingKeywords.length)
  ];

  // Use current year to ensure recent content
  const query = `${randomKeyword} ${new Date().getFullYear()}`;

  try {
    const response = await searchVideos(query, null, maxResults);

    // Return search results format which is { items: [], nextPageToken: ... }
    return {
      items: response.items || [],
      nextPageToken: response.nextPageToken
    };
  } catch (error) {
    console.error('Error fetching trending videos:', error);
    // Fallback to popular videos
    return getPopularVideos(null, maxResults, regionCode);
  }
};

/**
 * Fetches popular videos from random categories to ensure freshness
 * @param {number} maxResults - Number of results
 * @param {string} regionCode - Region code (default 'VN')
 * @returns {Promise} Response containing list of random videos
 */
export const getRandomVideos = async (maxResults = 20, regionCode = 'VN') => {
  const categories = ['10', '20', '24', '25', '17', '23', '22'];
  // 10: Music, 20: Gaming, 24: Entertainment, 25: News, 17: Sports, 23: Comedy, 22: People & Blogs

  try {
    // Random select 2 categories
    const shuffledCats = shuffleArray(categories);
    const selectedCategories = shuffledCats.slice(0, 2);
    const resultsPerCat = Math.ceil(maxResults / selectedCategories.length);

    // Fetch videos from multiple categories in parallel
    const promises = selectedCategories.map(cat =>
      getPopularVideos(null, resultsPerCat, regionCode, cat)
        .catch(e => ({ items: [] })) // Handle errors gracefully
    );

    const results = await Promise.all(promises);

    // Merge results
    let allVideos = results.flatMap(r => r.items || []);

    // If not enough videos, fill with general popular videos
    if (allVideos.length < maxResults) {
      const popular = await getPopularVideos(null, maxResults - allVideos.length, regionCode);
      allVideos = [...allVideos, ...(popular.items || [])];
    }

    // Remove duplicates based on ID
    const uniqueVideos = Array.from(new Map(allVideos.map(item => [item.id, item])).values());

    // Shuffle final list
    return {
      items: shuffleArray(uniqueVideos).slice(0, maxResults),
      nextPageToken: null // We mostly use this for refresh, so execution ends here usually
    };
  } catch (error) {
    console.error('Error fetching random videos:', error);
    // Fallback
    return getPopularVideos(null, maxResults, regionCode);
  }
};

/**
 * Gets details for multiple channels including snippets (for thumbnails)
 * @param {Array<string>} channelIds - List of channel IDs
 * @returns {Promise} Response containing channel details
 */
export const getChannelDetails = async (channelIds) => {
  if (!channelIds || channelIds.length === 0) {
    return { items: [] };
  }

  // Remove duplicates and limit to 50 (API limit)
  const uniqueIds = [...new Set(channelIds)].slice(0, 50);

  try {
    const response = await apiClient.get('/channels', {
      params: {
        key: API_KEY,
        id: uniqueIds.join(','),
        part: 'snippet',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching channel details:', error);
    return { items: [] };
  }
};

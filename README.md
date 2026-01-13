# YouTube Clone - React Native (Expo)

A mobile YouTube clone application built with React Native using Expo, featuring video playback, search functionality, and a modern dark theme UI.

## Features

- 📱 **Popular Videos**: Browse trending videos on YouTube
- 🔍 **Search**: Search for videos by keywords
- ▶️ **Video Player**: Watch videos with YouTube player integration
- 🎨 **Dark Theme**: Modern UI with dark mode design
- ⚡ **Optimized**: Performance optimized with React.memo and useCallback

## Tech Stack

- **React Native** (Expo ~49.0.0)
- **React Navigation** (Stack Navigator)
- **Axios** (API client)
- **react-native-youtube-iframe** (Video player)
- **@expo/vector-icons** (Icons)

## Installation

### 1. Install Dependencies

```bash
npm install
```

or

```bash
expo install
```

### 2. Get YouTube Data API v3 Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Create credentials (API Key)
5. Copy your API key

### 3. Configure API Key

Create a `.env` file in the root directory (copy from `.env.example` if needed) and add your YouTube Data API v3 key:

```env
YOUTUBE_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

**Note:** The `.env` file is already in `.gitignore` to keep your API key secure. Never commit your actual `.env` file to version control.

**Important:** After updating the `.env` file, you **MUST** restart Metro bundler with cache cleared:
```bash
# Stop the current Metro bundler (Ctrl+C)
# Then restart with:
npx expo start --clear
```
This is required because `react-native-dotenv` only loads environment variables when the bundler starts.

### 4. Run the Application

**Using Expo:**
```bash
npx expo start
```

Then:
- Press `a` for Android
- Press `i` for iOS
- Press `w` for Web
- Scan QR code with Expo Go app on your phone

**Using React Native CLI (if ejected):**
```bash
npx react-native run-android
# or
npx react-native run-ios
```

## Project Structure

```
youtube-clone/
├── src/
│   ├── api/
│   │   └── youtube.js          # YouTube API client
│   ├── components/
│   │   └── VideoCard.js        # Video card component
│   ├── screens/
│   │   ├── HomeScreen.js       # Popular videos screen
│   │   ├── SearchScreen.js     # Search screen
│   │   └── VideoPlayer.js      # Video player screen
│   └── navigation/
│       └── AppNavigator.js     # Navigation setup
├── App.js                       # Entry point
├── app.json                     # Expo configuration
├── package.json                 # Dependencies
└── README.md                    # This file
```

## API Functions

- `getPopularVideos()` - Fetches popular/trending videos
- `searchVideos(query)` - Searches videos by keyword
- `getVideoDetails(videoId)` - Gets detailed video information

## Notes

- Make sure you have a valid YouTube Data API v3 key
- The API has quota limits (default: 10,000 units per day)
- Each video search uses 100 units
- Each video details fetch uses 1 unit

## License

This project is for educational purposes only.

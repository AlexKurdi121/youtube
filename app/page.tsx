// app/page.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Volume2, VolumeX, Maximize, Minimize, Play, Pause, RotateCcw, X, Download, ChevronDown, Check } from 'lucide-react';

interface VideoData {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
  description?: string;
}

interface SearchSuggestion {
  title: string;
  type: 'video' | 'channel' | 'playlist';
}

interface DownloadQuality {
  label: string;
  value: string;
  url: string;
}

// Empty initial state - no demo videos
const DEMO_VIDEOS: VideoData[] = [];

// Popular search suggestions with categories
const POPULAR_SUGGESTIONS = [
  'Music',
  'Comedy',
  'Gaming',
  'Tutorials',
  'Vlogs',
  'Cooking',
  'Travel',
  'Technology',
  'Sports',
  'Science',
  'Movies',
  'Education',
  'Motivation',
  'Fitness',
  'Fashion',
  'Art'
];

// Extended suggestions based on query (client-side)
const getLocalSuggestions = (query: string): string[] => {
  const allSuggestions = [
    // Music
    'Music videos', 'Pop music', 'Hip hop', 'Rap', 'Rock music', 'Jazz', 'Classical music', 'EDM', 'House music', 'Techno',
    // Comedy
    'Stand up comedy', 'Funny videos', 'Comedy sketches', 'Pranks', 'Reaction videos', 'Parody',
    // Gaming
    'Gaming videos', 'Minecraft', 'Fortnite', 'COD', 'GTA V', 'Roblox', 'Valorant', 'CS:GO', 'Among Us',
    // Tutorials
    'How to', 'DIY', 'Coding tutorial', 'Web development', 'Python tutorial', 'JavaScript tutorial',
    'Photography tutorial', 'Video editing', 'Graphic design', 'Cooking recipes',
    // Vlogs
    'Daily vlog', 'Travel vlog', 'Lifestyle', 'Motivation', 'Self improvement',
    // Technology
    'Tech reviews', 'Smartphones', 'AI', 'Machine learning', 'Blockchain', 'Cryptocurrency',
    // Education
    'Science experiments', 'Math tutorial', 'History documentary', 'Space exploration',
    // Sports
    'Football', 'Basketball', 'Cricket', 'Tennis', 'Golf', 'Boxing', 'MMA', 'Workout routines',
    // Food
    'Cooking show', 'Recipe', 'Food review', 'Baking', 'Vegan recipes', 'Street food',
    // Travel
    'Travel guide', 'Tourist attractions', 'City tour', 'Nature documentary', 'Beach', 'Mountains',
    // Entertainment
    'Movie review', 'TV shows', 'Celebrity interviews', 'Behind the scenes', 'Trailers',
    // Health
    'Fitness tips', 'Yoga', 'Meditation', 'Healthy food', 'Weight loss', 'Mental health'
  ];
  
  return allSuggestions
    .filter(s => s.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloadQualities, setDownloadQualities] = useState<DownloadQuality[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  
  const playerRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true);
    // Load search history from localStorage
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load search history:', e);
      }
    }
  }, []);

  // Handle click outside suggestions and download menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle YouTube iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'onStateChange') {
            setIsPlaying(data.info === 1);
          }
          if (data.event === 'onCurrentTime') {
            setCurrentTime(data.info);
          }
          if (data.event === 'onDuration') {
            setDuration(data.info);
          }
          if (data.event === 'onReady') {
            setPlayerReady(true);
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Get search suggestions based on query (client-side only)
  const getSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    setIsSearching(true);
    
    try {
      const localSuggestions = getLocalSuggestions(query);
      const suggestions = localSuggestions.map(title => ({
        title,
        type: 'video' as const
      }));
      
      const popularMatches = POPULAR_SUGGESTIONS
        .filter(s => s.toLowerCase().includes(query.toLowerCase()))
        .map(s => ({ title: s, type: 'video' as const }));
      
      const combined = [...suggestions, ...popularMatches];
      const unique = combined.filter((item, index, self) => 
        index === self.findIndex((t) => t.title === item.title)
      );
      
      setSearchSuggestions(unique.slice(0, 8));
    } catch (error) {
      console.error('Error getting suggestions:', error);
      const fallback = POPULAR_SUGGESTIONS
        .filter(s => s.toLowerCase().includes(query.toLowerCase()))
        .map(s => ({ title: s, type: 'video' as const }));
      setSearchSuggestions(fallback.slice(0, 5));
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        getSuggestions(searchQuery);
        setShowSuggestions(true);
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, getSuggestions]);

  const searchVideos = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }
    
    setLoading(true);
    setError('');
    setIsDemoMode(false);
    setVideos([]);
    setShowSuggestions(false);
    setPlayerReady(false);
    setIsPlaying(false);
    setDownloadQualities([]);
    setSelectedQuality('');
    
    if (searchTerm.trim()) {
      const newHistory = [searchTerm.trim(), ...searchHistory.filter(h => h !== searchTerm.trim())].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
    
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    
    if (!apiKey || apiKey === 'AIzaSyDemoKey') {
      setError('YouTube API key not configured. Please add your API key to .env.local');
      setLoading(false);
      return;
    }
    
    try {
      let allVideos: VideoData[] = [];
      let nextPageToken: string | undefined;
      let attempts = 0;
      const maxAttempts = 2;
      const seenIds = new Set<string>();

      while (attempts < maxAttempts && allVideos.length < 60) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(
          searchTerm
        )}&type=video&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('YouTube API Error:', errorData);
          
          if (errorData.error?.code === 403) {
            throw new Error('API quota exceeded. Please try again later or use your own API key.');
          }
          
          throw new Error(errorData.error?.message || 'Failed to fetch videos');
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
          break;
        }
        
        const formattedVideos = data.items
          .filter((item: any) => item.id.videoId)
          .map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.medium.url,
            publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString(),
            description: item.snippet.description,
          }))
          .filter((video: VideoData) => {
            if (seenIds.has(video.id)) {
              return false;
            }
            seenIds.add(video.id);
            return true;
          });
        
        allVideos = [...allVideos, ...formattedVideos];
        nextPageToken = data.nextPageToken;
        attempts++;
        
        if (allVideos.length >= 60) break;
      }
      
      if (allVideos.length === 0) {
        setError('No videos found. Try a different search term.');
        setVideos([]);
        setSelectedVideo(null);
        setLoading(false);
        return;
      }
      
      const limitedVideos = allVideos.slice(0, 60);
      setVideos(limitedVideos);
      if (limitedVideos.length > 0) {
        setSelectedVideo(limitedVideos[0].id);
        setIframeKey(prev => prev + 1);
        setIsPlaying(false);
        // Generate download options for the selected video
        generateDownloadOptions(limitedVideos[0].id);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search videos. Please try again.');
      setVideos([]);
      setSelectedVideo(null);
    } finally {
      setLoading(false);
    }
  };

  const generateDownloadOptions = (videoId: string) => {
    // This is a simulation of quality options
    // In a real implementation, you would fetch this from a download API
    const qualities: DownloadQuality[] = [
      { label: '4K (2160p)', value: '2160p', url: `https://example.com/download/${videoId}/2160p` },
      { label: '1440p (2K)', value: '1440p', url: `https://example.com/download/${videoId}/1440p` },
      { label: '1080p (Full HD)', value: '1080p', url: `https://example.com/download/${videoId}/1080p` },
      { label: '720p (HD)', value: '720p', url: `https://example.com/download/${videoId}/720p` },
      { label: '480p (SD)', value: '480p', url: `https://example.com/download/${videoId}/480p` },
      { label: '360p (Low)', value: '360p', url: `https://example.com/download/${videoId}/360p` },
    ];
    
    setDownloadQualities(qualities);
    setSelectedQuality(qualities[2].value); // Default to 1080p
  };

  const handleDownload = async (quality: string) => {
    const selected = downloadQualities.find(q => q.value === quality);
    if (!selected) return;

    setIsDownloading(true);
    setShowDownloadMenu(false);

    try {
      // Note: This is a simulation. In a real implementation, you would:
      // 1. Call a backend API that handles YouTube downloading
      // 2. Or use a third-party service API
      
      // Show download notification
      alert(`Downloading video in ${selected.label} quality...\n\nNote: This is a demo. In production, you would integrate with a real download service like y2mate, savefrom.net, or a custom backend API.`);
      
      // Simulate download
      // In production, you would initiate the actual download here
      console.log(`Downloading ${selectedVideo} in ${selected.label}`);
      
      // You can use window.open() to open a download URL
      // window.open(selected.url, '_blank');
      
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download video. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchVideos();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    searchVideos(suggestion);
  };

  const handleVideoSelect = (videoId: string) => {
    setSelectedVideo(videoId);
    setIsPlaying(true);
    setCurrentTime(0);
    setPlayerReady(false);
    setIframeKey(prev => prev + 1);
    // Generate download options for the selected video
    generateDownloadOptions(videoId);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (playerRef.current) {
      playerRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: isMuted ? 'unMute' : 'mute' }),
        '*'
      );
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const togglePlay = () => {
    if (playerRef.current) {
      playerRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: isPlaying ? 'pauseVideo' : 'playVideo' }),
        '*'
      );
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = percent * duration;
    
    if (playerRef.current) {
      playerRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seekTime, true] }),
        '*'
      );
    }
    setCurrentTime(seekTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-hide controls
  useEffect(() => {
    if (showControls) {
      if (controlsTimeout) clearTimeout(controlsTimeout);
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
    }
    return () => {
      if (controlsTimeout) clearTimeout(controlsTimeout);
    };
  }, [showControls]);

  // Build iframe URL
  const getIframeUrl = (videoId: string) => {
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
  };

  // Auto-play when a video is selected and player is ready
  useEffect(() => {
    if (playerReady && isPlaying && selectedVideo) {
      if (playerRef.current) {
        playerRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo' }),
          '*'
        );
      }
    }
  }, [playerReady, isPlaying, selectedVideo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-700/50 backdrop-blur-sm bg-gray-900/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <svg 
                className="w-8 h-8 text-red-500" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <h1 className="text-xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                Ad-Free Tube
              </h1>
              {isDemoMode && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                  Demo Mode
                </span>
              )}
            </div>
            
            <div className="flex-1 max-w-2xl mx-auto relative" ref={suggestionsRef}>
              <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchQuery.trim().length >= 2) {
                        setShowSuggestions(true);
                      }
                    }}
                    placeholder="Search videos (e.g., music, comedy, tutorials)..."
                    className="w-full px-4 py-2 pl-12 pr-12 bg-gray-800/50 border border-gray-700 rounded-full focus:outline-none focus:border-red-500 transition-colors backdrop-blur-sm"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-20 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1 bg-red-500 hover:bg-red-600 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                    disabled={loading || !searchQuery.trim()}
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>

              {/* Search Suggestions Dropdown */}
              {showSuggestions && (searchSuggestions.length > 0 || searchHistory.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                  {searchSuggestions.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-1 text-xs text-gray-400 font-medium">Suggestions</div>
                      {searchSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion.title)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-700/50 transition-colors flex items-center gap-3"
                        >
                          <Search className="w-4 h-4 text-gray-400" />
                          <span>{suggestion.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {searchHistory.length > 0 && (
                    <div className="border-t border-gray-700/50 py-2">
                      <div className="px-4 py-1 text-xs text-gray-400 font-medium">Recent Searches</div>
                      {searchHistory.slice(0, 5).map((item, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(item)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-700/50 transition-colors flex items-center gap-3"
                        >
                          <span className="text-gray-400">⏱</span>
                          <span>{item}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div 
              ref={containerRef}
              className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl shadow-red-500/10 group"
              onMouseMove={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
            >
              {selectedVideo ? (
                <>
                  <iframe
                    key={iframeKey}
                    ref={playerRef}
                    src={getIframeUrl(selectedVideo)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  
                  {/* Custom Controls Overlay */}
                  <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300 ${
                    showControls ? 'opacity-100' : 'opacity-0'
                  }`}>
                    {/* Progress Bar */}
                    <div 
                      ref={progressRef}
                      className="relative w-full h-1.5 bg-gray-600 rounded-full cursor-pointer mb-3 group/progress"
                      onClick={handleProgressClick}
                    >
                      <div 
                        className="absolute top-0 left-0 h-full bg-red-500 rounded-full transition-all duration-100"
                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                      />
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                        style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={togglePlay}
                          className="hover:text-red-500 transition-colors"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        
                        <button 
                          onClick={toggleMute}
                          className="hover:text-red-500 transition-colors"
                        >
                          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        
                        <span className="text-sm text-gray-300 font-mono">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* Download Button with Quality Menu */}
                        <div className="relative" ref={downloadMenuRef}>
                          <button
                            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                            className="hover:text-red-500 transition-colors flex items-center gap-1"
                            title="Download video"
                            disabled={!selectedVideo}
                          >
                            <Download className="w-5 h-5" />
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {showDownloadMenu && downloadQualities.length > 0 && (
                            <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-2 min-w-[200px] z-50">
                              <div className="text-xs font-medium text-gray-400 px-3 py-2 border-b border-gray-700">
                                Select Quality
                              </div>
                              {downloadQualities.map((quality) => (
                                <button
                                  key={quality.value}
                                  onClick={() => {
                                    setSelectedQuality(quality.value);
                                    handleDownload(quality.value);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-700/50 rounded-lg transition-colors flex items-center justify-between text-sm"
                                  disabled={isDownloading}
                                >
                                  <span>{quality.label}</span>
                                  {selectedQuality === quality.value && (
                                    <Check className="w-4 h-4 text-red-500" />
                                  )}
                                </button>
                              ))}
                              <div className="px-3 py-2 border-t border-gray-700 mt-1">
                                <p className="text-xs text-gray-500">
                                  ⚠️ Download may not work in browser
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={() => {
                            if (playerRef.current) {
                              playerRef.current.contentWindow?.postMessage(
                                JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }),
                                '*'
                              );
                            }
                            setCurrentTime(0);
                          }}
                          className="hover:text-red-500 transition-colors"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                        
                        <button 
                          onClick={toggleFullscreen}
                          className="hover:text-red-500 transition-colors"
                        >
                          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-900">
                  <svg 
                    className="w-24 h-24 text-red-500/30" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <p className="text-gray-400 mt-4">Search for a video to start watching</p>
                  <p className="text-sm text-gray-500 mt-2">No ads, just pure content</p>
                </div>
              )}
            </div>

            {/* Video Info with Download Options */}
            {selectedVideo && videos.find(v => v.id === selectedVideo) && (
              <div className="mt-4 p-4 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                <h2 className="text-xl font-semibold mb-2">
                  {videos.find(v => v.id === selectedVideo)?.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                  <span>{videos.find(v => v.id === selectedVideo)?.channelTitle}</span>
                  <span>•</span>
                  <span>{videos.find(v => v.id === selectedVideo)?.publishedAt}</span>
                  <span>•</span>
                  <button
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                {videos.find(v => v.id === selectedVideo)?.description && (
                  <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                    {videos.find(v => v.id === selectedVideo)?.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Video List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 max-h-[600px] overflow-y-auto">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                {videos.length > 0 ? `Results (${videos.length} videos)` : 'Search Results'}
              </h3>
              
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-40 h-24 bg-gray-700 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-700 rounded w-3/4" />
                        <div className="h-3 bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button 
                    onClick={() => searchVideos()}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : videos.length > 0 ? (
                <div className="space-y-3">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => handleVideoSelect(video.id)}
                      className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-all duration-300 ${
                        selectedVideo === video.id
                          ? 'bg-red-500/20 border border-red-500/30'
                          : 'hover:bg-gray-700/50'
                      }`}
                    >
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-40 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium line-clamp-2">
                          {video.title}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">{video.channelTitle}</p>
                        <p className="text-xs text-gray-500 mt-1">{video.publishedAt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Search for videos to get started</p>
                  <p className="text-sm text-gray-500 mt-2">Try searching for "music", "comedy", or "tutorials"</p>
                  
                  <div className="mt-6">
                    <p className="text-xs text-gray-500 mb-3">Popular Searches</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {POPULAR_SUGGESTIONS.slice(0, 8).map((term) => (
                        <button
                          key={term}
                          onClick={() => {
                            setSearchQuery(term);
                            searchVideos(term);
                          }}
                          className="px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-full text-xs transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
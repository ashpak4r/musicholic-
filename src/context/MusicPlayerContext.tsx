import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  Song,
  RepeatMode,
  LyricsData,
  LastPlayedInfo,
  AudioQualityTier,
  EQPresetName,
  StudioEQSettings,
} from '../types/music';
import { useAuth } from './AuthContext';
import {
  studioAudioEngine,
  DEFAULT_EQ_SETTINGS,
  EQ_PRESETS,
  AUDIO_TIERS,
} from '../utils/audioEqualizer';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface MusicPlayerContextType {
  // Playback state
  currentSong: Song | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;

  // Audio Quality & Studio EQ
  audioTier: AudioQualityTier;
  setAudioTier: (tier: AudioQualityTier) => void;
  audioQuality: string;
  audioBitrate: string;
  eqSettings: StudioEQSettings;
  setEQSettings: React.Dispatch<React.SetStateAction<StudioEQSettings>>;
  setEQBand: (bandIndex: number, gain: number) => void;
  setEQPreset: (preset: EQPresetName) => void;
  setPreamp: (gain: number) => void;
  toggleEQ: () => void;
  eqModalOpen: boolean;
  setEqModalOpen: (val: boolean) => void;
  toggleEqModal: () => void;

  // Queue state
  queue: Song[];
  queueIndex: number;
  suggestedQueue: Song[];
  isLoadingSuggestions: boolean;

  // Last Played & Resume
  lastPlayed: LastPlayedInfo | null;
  resumeLastPlayed: () => void;

  // Actions
  playSong: (
    song: Song,
    contextQueue?: Song[],
    startIndex?: number,
    startSeconds?: number,
  ) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;

  // Persistence & Library
  likedSongs: Song[];
  toggleLike: (song: Song) => void;
  isLiked: (songId: string) => boolean;
  recentlyPlayed: Song[];
  searchHistory: string[];
  addSearchHistory: (query: string) => void;
  removeSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  // UI Modals / Modes
  videoMode: boolean;
  setVideoMode: (val: boolean) => void;
  toggleVideoMode: () => void;
  lyricsOpen: boolean;
  setLyricsOpen: (val: boolean) => void;
  queueOpen: boolean;
  setQueueOpen: (val: boolean) => void;
  expandedPlayer: boolean;
  setExpandedPlayer: (val: boolean) => void;

  // Lyrics
  lyricsData: LyricsData | null;
  isLoadingLyrics: boolean;
  fetchLyrics: (song: Song) => void;

  // Error toast
  playerError: string | null;
  clearPlayerError: () => void;

  // Background listening mode
  backgroundMode: boolean;
  toggleBackgroundMode: () => void;
  backgroundToast: string | null;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

const STORAGE_KEYS = {
  LIKED: 'musicholic_liked_songs',
  RECENT: 'musicholic_recent_songs',
  SEARCHES: 'musicholic_search_history',
  VOLUME: 'musicholic_volume',
  LAST_PLAYED: 'musicholic_last_played',
  PLAY_HISTORY_COOLDOWN: 'musicholic_play_cooldown',
  AUDIO_TIER: 'musicholic_audio_tier',
  STUDIO_EQ: 'musicholic_studio_eq',
};

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, token, syncUserData, initialSyncData } = useAuth();

  // Playback state
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VOLUME);
    return saved !== null ? Number(saved) : 80;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

  // Audio Quality & Studio Equalizer State
  const [audioTier, setAudioTierState] = useState<AudioQualityTier>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIO_TIER);
      return (saved as AudioQualityTier) || 'hi-res-flac';
    } catch {
      return 'hi-res-flac';
    }
  });

  const [eqSettings, setEQSettings] = useState<StudioEQSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDIO_EQ);
      return saved ? JSON.parse(saved) : DEFAULT_EQ_SETTINGS;
    } catch {
      return DEFAULT_EQ_SETTINGS;
    }
  });

  const [eqModalOpen, setEqModalOpen] = useState<boolean>(false);

  // Queue state
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [suggestedQueue, setSuggestedQueue] = useState<Song[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);

  // Anti-repetition cooldown list (keeps track of last 25 played tracks to prevent loops)
  const [playCooldownIds, setPlayCooldownIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAY_HISTORY_COOLDOWN);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Last Played tracking
  const [lastPlayed, setLastPlayed] = useState<LastPlayedInfo | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAST_PLAYED);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Modals & Panels
  const [videoMode, setVideoMode] = useState<boolean>(false);
  const [lyricsOpen, setLyricsOpen] = useState<boolean>(false);
  const [queueOpen, setQueueOpen] = useState<boolean>(false);
  const [expandedPlayer, setExpandedPlayer] = useState<boolean>(false);

  // Lyrics
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);

  // Error tracking
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Persisted state
  const [likedSongs, setLikedSongs] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LIKED);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Background listening mode state (defaults to true)
  const [backgroundMode, setBackgroundMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('musicholic_bg_mode');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const backgroundModeRef = useRef<boolean>(true);
  backgroundModeRef.current = backgroundMode;

  const [backgroundToast, setBackgroundToast] = useState<string | null>(null);
  const bgToastTimerRef = useRef<any>(null);

  const toggleBackgroundMode = useCallback(() => {
    setBackgroundMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('musicholic_bg_mode', String(next));
      } catch (e) {
        console.error(e);
      }

      if (bgToastTimerRef.current) clearTimeout(bgToastTimerRef.current);
      if (next) {
        if (silentAudioRef.current) {
          silentAudioRef.current.play().catch(() => {});
        }
        setBackgroundToast('🎧 Background Play Active — Audio continues when you lock screen or switch apps');
      } else {
        if (silentAudioRef.current) {
          silentAudioRef.current.pause();
        }
        setBackgroundToast('⏸️ Background Play Disabled');
      }
      bgToastTimerRef.current = setTimeout(() => {
        setBackgroundToast(null);
      }, 4000);

      return next;
    });
  }, []);

  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECENT);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SEARCHES);
      return saved ? JSON.parse(saved) : ['Husn Anuv Jain', 'The Weeknd', 'Taylor Swift', 'Coldplay'];
    } catch {
      return [];
    }
  });

  // YouTube Player Ref & Background Audio Refs
  const ytPlayerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef<boolean>(false);
  const timeUpdateIntervalRef = useRef<any>(null);
  const lastMediaSessionUpdateRef = useRef<number>(0);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Automatic stream resolution & error recovery for songs with embed restrictions (Error 150/101/100)
  const fallbackAttemptsRef = useRef<Set<string>>(new Set());
  const resolvedWorkingIdsRef = useRef<Map<string, string>>(new Map());

  // Mirrors in refs for event callbacks
  const currentSongRef = useRef<Song | null>(null);
  currentSongRef.current = currentSong;
  const queueRef = useRef<Song[]>([]);
  queueRef.current = queue;
  const queueIndexRef = useRef<number>(-1);
  queueIndexRef.current = queueIndex;
  const repeatModeRef = useRef<RepeatMode>('off');
  repeatModeRef.current = repeatMode;
  const shuffleRef = useRef<boolean>(false);
  shuffleRef.current = shuffle;
  const suggestedQueueRef = useRef<Song[]>([]);
  suggestedQueueRef.current = suggestedQueue;
  const playCooldownIdsRef = useRef<string[]>([]);
  playCooldownIdsRef.current = playCooldownIds;
  const currentTimeRef = useRef<number>(0);
  currentTimeRef.current = currentTime;

  // Audio Quality Specs based on active tier
  const audioQuality = AUDIO_TIERS[audioTier]?.name || 'Hi-Res FLAC Master';
  const audioBitrate = AUDIO_TIERS[audioTier]?.bitrate || '9,216 kbps Raw Studio Stream';

  // Persist Audio Tier
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIO_TIER, audioTier);
    } catch (e) {
      console.error(e);
    }
  }, [audioTier]);

  // Persist Studio EQ and apply to Web Audio Engine
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDIO_EQ, JSON.stringify(eqSettings));
    } catch (e) {
      console.error(e);
    }
    studioAudioEngine.applySettings(eqSettings);
  }, [eqSettings]);

  // Studio EQ Actions
  const setAudioTier = useCallback((tier: AudioQualityTier) => {
    setAudioTierState(tier);
    // When changing tier, ensure highest stream quality is requested
    if (ytPlayerRef.current && isPlayerReadyRef.current) {
      try {
        if (typeof ytPlayerRef.current.setPlaybackQuality === 'function') {
          ytPlayerRef.current.setPlaybackQuality(tier === 'hi-res-flac' ? 'hd1080' : 'default');
        }
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  const setEQBand = useCallback((bandIndex: number, gain: number) => {
    studioAudioEngine.init();
    setEQSettings((prev) => {
      const newBands = [...prev.bands];
      newBands[bandIndex] = Math.max(-12, Math.min(12, gain));
      return {
        ...prev,
        preset: 'Custom',
        bands: newBands,
      };
    });
  }, []);

  const setEQPreset = useCallback((preset: EQPresetName) => {
    studioAudioEngine.init();
    setEQSettings((prev) => ({
      ...prev,
      preset,
      bands: [...EQ_PRESETS[preset]],
    }));
  }, []);

  const setPreamp = useCallback((gain: number) => {
    studioAudioEngine.init();
    setEQSettings((prev) => ({
      ...prev,
      preamp: Math.max(-12, Math.min(12, gain)),
    }));
  }, []);

  const toggleEQ = useCallback(() => {
    studioAudioEngine.init();
    setEQSettings((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  }, []);

  const toggleEqModal = useCallback(() => {
    studioAudioEngine.init();
    setEqModalOpen((prev) => !prev);
  }, []);

  // Merge server data when user logs in or initial sync arrives
  useEffect(() => {
    if (initialSyncData) {
      if (Array.isArray(initialSyncData.likedSongs) && initialSyncData.likedSongs.length > 0) {
        setLikedSongs(initialSyncData.likedSongs);
      }
      if (Array.isArray(initialSyncData.recentlyPlayed) && initialSyncData.recentlyPlayed.length > 0) {
        setRecentlyPlayed(initialSyncData.recentlyPlayed);
      }
      if (Array.isArray(initialSyncData.searchHistory) && initialSyncData.searchHistory.length > 0) {
        setSearchHistory(initialSyncData.searchHistory);
      }
      if (initialSyncData.lastPlayed) {
        setLastPlayed(initialSyncData.lastPlayed);
      }
    }
  }, [initialSyncData]);

  // Persist liked songs & sync to account
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(likedSongs));
    } catch (e) {
      console.error(e);
    }
  }, [likedSongs]);

  // Persist recently played & sync to account
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(recentlyPlayed));
    } catch (e) {
      console.error(e);
    }
  }, [recentlyPlayed]);

  // Persist searches
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SEARCHES, JSON.stringify(searchHistory));
    } catch (e) {
      console.error(e);
    }
  }, [searchHistory]);

  // Persist cooldown list
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.PLAY_HISTORY_COOLDOWN,
        JSON.stringify(playCooldownIds),
      );
    } catch (e) {
      console.error(e);
    }
  }, [playCooldownIds]);

  // Periodic server sync for logged-in user
  useEffect(() => {
    if (!token || !user) return;
    const timer = setTimeout(() => {
      syncUserData({
        likedSongs,
        recentlyPlayed,
        searchHistory,
        lastPlayed: lastPlayed || undefined,
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [likedSongs, recentlyPlayed, searchHistory, lastPlayed, token, user, syncUserData]);

  // Record playback into recently played & cooldown list
  const recordRecentPlay = useCallback((song: Song) => {
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((s) => s.id !== song.id);
      return [{ ...song, addedAt: Date.now() }, ...filtered].slice(0, 30);
    });

    // Add to anti-repetition cooldown list (max 25 recent IDs)
    setPlayCooldownIds((prev) => {
      const filtered = prev.filter((id) => id !== song.id);
      return [song.id, ...filtered].slice(0, 25);
    });
  }, []);

  // Update Last Played position periodically
  useEffect(() => {
    if (currentSong && currentTime > 2) {
      const info: LastPlayedInfo = {
        song: currentSong,
        position: Math.floor(currentTime),
        timestamp: Date.now(),
      };
      setLastPlayed(info);
      localStorage.setItem(STORAGE_KEYS.LAST_PLAYED, JSON.stringify(info));
    }
  }, [currentSong, currentTime]);

  // Fetch smart suggestions with anti-repetition filter
  const fetchSmartSuggestions = useCallback(async (song: Song) => {
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch(
        `/api/related?id=${encodeURIComponent(song.id)}&title=${encodeURIComponent(
          song.title,
        )}&artist=${encodeURIComponent(song.artist)}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          // Anti-repetition filter:
          // 1. Current song
          // 2. Songs already in current queue
          // 3. Songs in the recent cooldown list (last 20 tracks played)
          const currentQueueIds = new Set([
            song.id,
            ...queueRef.current.map((q) => q.id),
          ]);
          const cooldownSet = new Set(playCooldownIdsRef.current);

          // First try to filter strictly with cooldown
          let freshSuggestions = data.results.filter(
            (item: Song) => !currentQueueIds.has(item.id) && !cooldownSet.has(item.id),
          );

          // If strict filter removed almost all candidates, relax cooldown to avoid empty queue
          if (freshSuggestions.length < 3) {
            freshSuggestions = data.results.filter(
              (item: Song) => !currentQueueIds.has(item.id),
            );
          }

          setSuggestedQueue(freshSuggestions);
        }
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Fetch Lyrics for currently playing song
  const fetchLyrics = useCallback(async (song: Song) => {
    setIsLoadingLyrics(true);
    setLyricsData(null);
    try {
      const res = await fetch(
        `/api/lyrics?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(
          song.artist,
        )}`,
      );
      if (res.ok) {
        const data = await res.json();
        setLyricsData(data);
      } else {
        setLyricsData({ found: false });
      }
    } catch (err) {
      console.error('Lyrics error:', err);
      setLyricsData({ found: false });
    } finally {
      setIsLoadingLyrics(false);
    }
  }, []);

  // Clear player error
  const clearPlayerError = useCallback(() => setPlayerError(null), []);

  // Background audio wake-lock setup for mobile Safari / Chrome
  useEffect(() => {
    // Create a 1-second silent audio data URI loop
    // This keeps the HTML5 Audio pipeline alive in background tabs/screens on iOS/Android
    const silentAudio = document.createElement('audio');
    silentAudio.setAttribute('playsinline', '');
    silentAudio.setAttribute('loop', '');
    silentAudio.setAttribute('muted', '');
    // 1-sec base64 silent WAV
    silentAudio.src =
      'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    silentAudioRef.current = silentAudio;

    return () => {
      silentAudio.pause();
    };
  }, []);

  // Setup MediaSession API (Lock screen & background controls)
  const updateMediaSession = useCallback(
    (song: Song) => {
      if (!('mediaSession' in navigator)) return;

      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          album: 'MusicHolic',
          artwork: [
            { src: song.thumbnail, sizes: '96x96', type: 'image/jpeg' },
            { src: song.thumbnail, sizes: '128x128', type: 'image/jpeg' },
            { src: song.thumbnail, sizes: '192x192', type: 'image/jpeg' },
            { src: song.thumbnail, sizes: '256x256', type: 'image/jpeg' },
            { src: song.thumbnail, sizes: '512x512', type: 'image/jpeg' },
          ],
        });
      } catch (e) {
        console.warn('MediaSession metadata error:', e);
      }
    },
    [],
  );

  // Next Track logic (Intelligent recommendation + Anti-repetition)
  const nextTrack = useCallback(() => {
    if (repeatModeRef.current === 'one' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(0);
      ytPlayerRef.current.playVideo();
      return;
    }

    const currentIdx = queueIndexRef.current;
    const currentQ = queueRef.current;

    // 1. If there is an upcoming song in the user's manual queue
    if (currentIdx >= 0 && currentIdx < currentQ.length - 1) {
      let nextIdx = currentIdx + 1;
      if (shuffleRef.current && currentQ.length > currentIdx + 2) {
        const remainingCount = currentQ.length - (currentIdx + 1);
        const randomOffset = Math.floor(Math.random() * remainingCount);
        nextIdx = currentIdx + 1 + randomOffset;

        // Swap to preserve order
        const newQ = [...currentQ];
        const temp = newQ[currentIdx + 1];
        newQ[currentIdx + 1] = newQ[nextIdx];
        newQ[nextIdx] = temp;
        setQueue(newQ);
        nextIdx = currentIdx + 1;
      }

      setQueueIndex(nextIdx);
      const nextSong = currentQ[nextIdx];
      setCurrentSong(nextSong);
      recordRecentPlay(nextSong);
      fetchSmartSuggestions(nextSong);
      fetchLyrics(nextSong);
      updateMediaSession(nextSong);

      if (ytPlayerRef.current && isPlayerReadyRef.current) {
        const activeId = resolvedWorkingIdsRef.current.get(nextSong.id) || nextSong.id;
        ytPlayerRef.current.loadVideoById(activeId);
        ytPlayerRef.current.playVideo();
      }
      return;
    }

    // 2. Queue reached the end: Intelligently select next candidate from suggestions (YouTube Next Algorithm)
    const suggestions = suggestedQueueRef.current;
    if (suggestions.length > 0) {
      const nextSuggested = suggestions[0];
      const remainingSuggestions = suggestions.slice(1);
      setSuggestedQueue(remainingSuggestions);

      // Append to queue and advance index
      const updatedQueue = [...currentQ, nextSuggested];
      setQueue(updatedQueue);
      setQueueIndex(updatedQueue.length - 1);
      setCurrentSong(nextSuggested);
      recordRecentPlay(nextSuggested);
      fetchSmartSuggestions(nextSuggested);
      fetchLyrics(nextSuggested);
      updateMediaSession(nextSuggested);

      if (ytPlayerRef.current && isPlayerReadyRef.current) {
        const activeId = resolvedWorkingIdsRef.current.get(nextSuggested.id) || nextSuggested.id;
        ytPlayerRef.current.loadVideoById(activeId);
        ytPlayerRef.current.playVideo();
      }
      return;
    }

    // 2b. If suggestions were empty or still loading, query YouTube Next Algorithm on-demand
    if (currentSongRef.current) {
      const curSong = currentSongRef.current;
      fetch(
        `/api/related?id=${encodeURIComponent(curSong.id)}&title=${encodeURIComponent(
          curSong.title,
        )}&artist=${encodeURIComponent(curSong.artist)}`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.results && data.results.length > 0) {
            const currentQueueIds = new Set([
              curSong.id,
              ...queueRef.current.map((q) => q.id),
            ]);
            const candidate =
              data.results.find((s: Song) => !currentQueueIds.has(s.id)) ||
              data.results[0];

            if (candidate) {
              const updatedQueue = [...queueRef.current, candidate];
              setQueue(updatedQueue);
              setQueueIndex(updatedQueue.length - 1);
              setCurrentSong(candidate);
              recordRecentPlay(candidate);
              fetchSmartSuggestions(candidate);
              fetchLyrics(candidate);
              updateMediaSession(candidate);

              if (ytPlayerRef.current && isPlayerReadyRef.current) {
                const activeId = resolvedWorkingIdsRef.current.get(candidate.id) || candidate.id;
                ytPlayerRef.current.loadVideoById(activeId);
                ytPlayerRef.current.playVideo();
              }
            }
          }
        })
        .catch((e) => console.error('On-demand YouTube next track error:', e));
      return;
    }

    // 3. Repeat mode 'all'
    if (repeatModeRef.current === 'all' && currentQ.length > 0) {
      setQueueIndex(0);
      const firstSong = currentQ[0];
      setCurrentSong(firstSong);
      recordRecentPlay(firstSong);
      fetchSmartSuggestions(firstSong);
      fetchLyrics(firstSong);
      updateMediaSession(firstSong);

      if (ytPlayerRef.current && isPlayerReadyRef.current) {
        const activeId = resolvedWorkingIdsRef.current.get(firstSong.id) || firstSong.id;
        ytPlayerRef.current.loadVideoById(activeId);
        ytPlayerRef.current.playVideo();
      }
      return;
    }

    setIsPlaying(false);
  }, [fetchSmartSuggestions, fetchLyrics, recordRecentPlay, updateMediaSession]);

  // Previous Track logic
  const prevTrack = useCallback(() => {
    if (currentTimeRef.current > 3 && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(0);
      setCurrentTime(0);
      return;
    }

    const currentIdx = queueIndexRef.current;
    const currentQ = queueRef.current;

    if (currentIdx > 0) {
      const prevIdx = currentIdx - 1;
      setQueueIndex(prevIdx);
      const prevSong = currentQ[prevIdx];
      setCurrentSong(prevSong);
      recordRecentPlay(prevSong);
      fetchSmartSuggestions(prevSong);
      fetchLyrics(prevSong);
      updateMediaSession(prevSong);

      if (ytPlayerRef.current && isPlayerReadyRef.current) {
        ytPlayerRef.current.loadVideoById(prevSong.id);
        ytPlayerRef.current.playVideo();
      }
    } else if (ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(0);
      setCurrentTime(0);
    }
  }, [fetchSmartSuggestions, fetchLyrics, recordRecentPlay, updateMediaSession]);

  // Seek function
  const seekTo = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    currentTimeRef.current = seconds;
    if (ytPlayerRef.current && isPlayerReadyRef.current) {
      try {
        ytPlayerRef.current.seekTo(seconds, true);
      } catch (err) {
        console.error('Seek error:', err);
      }
    }
    // Update MediaSession position immediately on user seek
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration || 100,
          playbackRate: 1,
          position: Math.min(seconds, duration || 100),
        });
      } catch (e) {
        // Ignore
      }
    }
  }, [duration]);

  // Initialize YouTube Iframe Player with High Quality audio parameters
  useEffect(() => {
    let checkInterval: any = null;

    const setupPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      const playerContainer = document.getElementById('youtube-player-mount');
      if (!playerContainer || ytPlayerRef.current) return;

      ytPlayerRef.current = new window.YT.Player('youtube-player-mount', {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          iv_load_policy: 3,
          ...(typeof window !== 'undefined' &&
          window.location.origin &&
          window.location.origin !== 'null'
            ? { origin: window.location.origin }
            : {}),
        },
        events: {
          onReady: (event: any) => {
            isPlayerReadyRef.current = true;
            event.target.setVolume(volume);

            // Request highest audio quality stream
            try {
              if (typeof event.target.setPlaybackQuality === 'function') {
                event.target.setPlaybackQuality('hd1080');
              }
            } catch (e) {
              // Ignore
            }

            if (currentSongRef.current) {
              const activeId =
                resolvedWorkingIdsRef.current.get(currentSongRef.current.id) ||
                currentSongRef.current.id;
              event.target.loadVideoById(activeId);
              event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              // Playing
              setIsPlaying(true);
              setIsBuffering(false);
              const dur = event.target.getDuration() || 0;
              setDuration(dur);
              if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
              }
            } else if (event.data === 2) {
              // If browser throttles/pauses player while screen is locked/backgrounded and backgroundMode is active, auto-resume
              if (document.hidden && backgroundModeRef.current && currentSongRef.current) {
                setTimeout(() => {
                  try {
                    if (ytPlayerRef.current && isPlayerReadyRef.current) {
                      ytPlayerRef.current.playVideo();
                    }
                  } catch (e) {
                    // Ignore
                  }
                }, 150);
                return;
              }
              // Paused
              setIsPlaying(false);
              setIsBuffering(false);
              if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
              }
            } else if (event.data === 3) {
              // Buffering
              setIsBuffering(true);
            } else if (event.data === 0) {
              // Song ended
              nextTrack();
            }
          },
          onError: async (event: any) => {
            console.warn('YouTube Player error code:', event.data);
            setIsBuffering(false);
            const errCode = event.data;
            const song = currentSongRef.current;

            if (
              song &&
              (errCode === 101 ||
                errCode === 150 ||
                errCode === 100 ||
                errCode === 2 ||
                errCode === 5)
            ) {
              // Automatically resolve and switch to a playable alternative stream for THIS song
              if (!fallbackAttemptsRef.current.has(song.id)) {
                fallbackAttemptsRef.current.add(song.id);
                setPlayerError(`Connecting playable audio for "${song.title}"...`);

                try {
                  const res = await fetch(
                    `/api/song-alternative?title=${encodeURIComponent(
                      song.title,
                    )}&artist=${encodeURIComponent(
                      song.artist,
                    )}&excludeId=${encodeURIComponent(song.id)}`,
                  );
                  if (res.ok) {
                    const data = await res.json();
                    if (data.alternative && data.alternative.id) {
                      const altId = data.alternative.id;
                      resolvedWorkingIdsRef.current.set(song.id, altId);
                      const updatedSong: Song = {
                        ...song,
                        id: altId,
                        duration: data.alternative.duration || song.duration,
                      };
                      setCurrentSong(updatedSong);
                      currentSongRef.current = updatedSong;

                      if (ytPlayerRef.current && isPlayerReadyRef.current) {
                        setTimeout(() => {
                          try {
                            ytPlayerRef.current.loadVideoById(altId);
                            ytPlayerRef.current.playVideo();
                            setPlayerError(null);
                          } catch (e) {
                            console.error('Failed to load alternative stream:', e);
                            nextTrack();
                          }
                        }, 250);
                        return;
                      }
                    }
                  }
                } catch (e) {
                  console.error('Alternative stream resolution failed:', e);
                }
              }

              // Only if an alternative could not be resolved or already failed
              setPlayerError('Audio stream restricted. Skipping to next song...');
              setTimeout(() => {
                setPlayerError(null);
                nextTrack();
              }, 2000);
            }
          },
        },
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setupPlayer();
      };
    } else {
      setupPlayer();
    }

    checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player && !ytPlayerRef.current) {
        setupPlayer();
      }
    }, 500);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [nextTrack, volume]);

  // Connect MediaSession action handlers (PC, Android, iOS 14+)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        if (ytPlayerRef.current && isPlayerReadyRef.current) {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (ytPlayerRef.current && isPlayerReadyRef.current) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevTrack();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextTrack();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekTo(details.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        seekTo(Math.max(0, currentTimeRef.current - offset));
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        seekTo(currentTimeRef.current + offset);
      });
    } catch (e) {
      console.warn('MediaSession handler error:', e);
    }
  }, [nextTrack, prevTrack, seekTo]);

  // Silent audio wake-lock initialization
  useEffect(() => {
    try {
      const audio = new Audio(
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA',
      );
      audio.loop = true;
      audio.volume = 0.001;
      silentAudioRef.current = audio;
    } catch (e) {
      // Ignore
    }

    return () => {
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }
    };
  }, []);

  // Background playback architecture:
  // DO NOT treat document.hidden or visibilitychange as an intentional user pause!
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden / user switched apps / screen locked.
        // DO NOT pause YouTube playback! If user was playing and backgroundMode is on, ensure playback continues.
        if (isPlaying && backgroundMode && ytPlayerRef.current && isPlayerReadyRef.current) {
          try {
            // Keep silent audio playing so background task stays alive in WebKit & Chromium
            if (silentAudioRef.current) {
              silentAudioRef.current.play().catch(() => {});
            }
            // If YouTube paused itself due to visibility change, force resume
            if (ytPlayerRef.current.getPlayerState() === 2) {
              ytPlayerRef.current.playVideo();
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
    };
  }, [isPlaying, backgroundMode]);

  // Synchronize playback current time & MediaSession position state (throttled)
  useEffect(() => {
    if (isPlaying) {
      timeUpdateIntervalRef.current = setInterval(() => {
        if (ytPlayerRef.current && isPlayerReadyRef.current) {
          try {
            const time = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || 0;
            setCurrentTime(time);
            currentTimeRef.current = time;
            if (dur > 0 && dur !== duration) {
              setDuration(dur);
            }

            // Throttled MediaSession position update (every 3 seconds) to prevent CPU & battery drain
            const now = Date.now();
            if (now - lastMediaSessionUpdateRef.current > 3000) {
              lastMediaSessionUpdateRef.current = now;
              if (
                'mediaSession' in navigator &&
                'setPositionState' in navigator.mediaSession &&
                dur > 0
              ) {
                navigator.mediaSession.setPositionState({
                  duration: dur,
                  playbackRate: 1,
                  position: Math.min(time, dur),
                });
              }
            }
          } catch (e) {
            // Ignore temporary cross-origin read error
          }
        }
      }, 250);
    } else {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    }

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, [isPlaying, duration]);

  // Play Song Action
  const playSong = useCallback(
    (
      song: Song,
      contextQueue?: Song[],
      startIndex?: number,
      startSeconds?: number,
    ) => {
      setCurrentSong(song);
      setCurrentTime(startSeconds || 0);
      currentTimeRef.current = startSeconds || 0;
      setIsBuffering(true);
      recordRecentPlay(song);
      fetchSmartSuggestions(song);
      fetchLyrics(song);
      updateMediaSession(song);

      // Trigger silent audio wake-lock on user gesture
      if (silentAudioRef.current) {
        silentAudioRef.current.play().catch(() => {});
      }

      if (contextQueue && contextQueue.length > 0) {
        setQueue(contextQueue);
        const idx =
          startIndex !== undefined
            ? startIndex
            : contextQueue.findIndex((s) => s.id === song.id);
        setQueueIndex(idx >= 0 ? idx : 0);
      } else {
        setQueue([song]);
        setQueueIndex(0);
      }

      if (ytPlayerRef.current && isPlayerReadyRef.current) {
        try {
          const activeId = resolvedWorkingIdsRef.current.get(song.id) || song.id;
          ytPlayerRef.current.loadVideoById(activeId, startSeconds || 0);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } catch (err) {
          console.error('Error playing track:', err);
        }
      }
    },
    [fetchSmartSuggestions, fetchLyrics, recordRecentPlay, updateMediaSession],
  );

  // Resume Last Played Song
  const resumeLastPlayed = useCallback(() => {
    if (!lastPlayed) return;
    playSong(lastPlayed.song, [lastPlayed.song], 0, lastPlayed.position);
  }, [lastPlayed, playSong]);

  // Play / Pause toggle
  const togglePlayPause = useCallback(() => {
    if (!currentSong) return;

    if (ytPlayerRef.current && isPlayerReadyRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
          if (silentAudioRef.current) {
            silentAudioRef.current.pause();
          }
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          if (silentAudioRef.current) {
            silentAudioRef.current.play().catch(() => {});
          }
        }
      } catch (err) {
        console.error('Play/Pause error:', err);
      }
    } else {
      playSong(currentSong);
    }
  }, [currentSong, isPlaying, playSong]);

  // Volume
  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setVolumeState(clamped);
    localStorage.setItem(STORAGE_KEYS.VOLUME, clamped.toString());

    if (ytPlayerRef.current && isPlayerReadyRef.current) {
      try {
        ytPlayerRef.current.setVolume(clamped);
        if (clamped > 0 && isMuted) {
          ytPlayerRef.current.unMute();
          setIsMuted(false);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [isMuted]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (ytPlayerRef.current && isPlayerReadyRef.current) {
      try {
        if (isMuted) {
          ytPlayerRef.current.unMute();
          setIsMuted(false);
        } else {
          ytPlayerRef.current.mute();
          setIsMuted(true);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setIsMuted((prev) => !prev);
    }
  }, [isMuted]);

  // Toggle Shuffle
  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  // Toggle Repeat mode
  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  // Add to Queue
  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => [...prev, song]);
  }, []);

  // Remove from Queue
  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (index < queueIndexRef.current) {
        setQueueIndex((qi) => Math.max(0, qi - 1));
      }
      return next;
    });
  }, []);

  // Clear Queue
  const clearQueue = useCallback(() => {
    if (currentSongRef.current) {
      setQueue([currentSongRef.current]);
      setQueueIndex(0);
    } else {
      setQueue([]);
      setQueueIndex(-1);
    }
  }, []);

  // Like Song Toggle
  const toggleLike = useCallback((song: Song) => {
    setLikedSongs((prev) => {
      const exists = prev.some((s) => s.id === song.id);
      if (exists) {
        return prev.filter((s) => s.id !== song.id);
      } else {
        return [{ ...song, liked: true, addedAt: Date.now() }, ...prev];
      }
    });
  }, []);

  const isLiked = useCallback(
    (songId: string) => {
      return likedSongs.some((s) => s.id === songId);
    },
    [likedSongs],
  );

  // Search History Management
  const addSearchHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter(
        (q) => q.toLowerCase() !== trimmed.toLowerCase(),
      );
      return [trimmed, ...filtered].slice(0, 15);
    });
  }, []);

  const removeSearchHistory = useCallback((query: string) => {
    setSearchHistory((prev) => prev.filter((q) => q !== query));
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  const toggleVideoMode = useCallback(() => {
    setVideoMode((prev) => !prev);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowRight') {
        seekTo(Math.min(duration, currentTime + 5));
      } else if (e.code === 'ArrowLeft') {
        seekTo(Math.max(0, currentTime - 5));
      } else if (e.code === 'KeyM') {
        toggleMute();
      } else if (e.code === 'KeyN') {
        nextTrack();
      } else if (e.code === 'KeyP') {
        prevTrack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, seekTo, toggleMute, nextTrack, prevTrack, duration, currentTime]);

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        isBuffering,
        currentTime,
        duration,
        volume,
        isMuted,
        shuffle,
        repeatMode,
        audioTier,
        setAudioTier,
        audioQuality,
        audioBitrate,
        eqSettings,
        setEQSettings,
        setEQBand,
        setEQPreset,
        setPreamp,
        toggleEQ,
        eqModalOpen,
        setEqModalOpen,
        toggleEqModal,
        queue,
        queueIndex,
        suggestedQueue,
        isLoadingSuggestions,
        lastPlayed,
        resumeLastPlayed,
        playSong,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        addToQueue,
        removeFromQueue,
        clearQueue,
        likedSongs,
        toggleLike,
        isLiked,
        recentlyPlayed,
        searchHistory,
        addSearchHistory,
        removeSearchHistory,
        clearSearchHistory,
        videoMode,
        setVideoMode,
        toggleVideoMode,
        lyricsOpen,
        setLyricsOpen,
        queueOpen,
        setQueueOpen,
        expandedPlayer,
        setExpandedPlayer,
        lyricsData,
        isLoadingLyrics,
        fetchLyrics,
        playerError,
        clearPlayerError,
        backgroundMode,
        toggleBackgroundMode,
        backgroundToast,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};

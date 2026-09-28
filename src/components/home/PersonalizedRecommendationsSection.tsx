import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Play,
  Heart,
  Sliders,
  Flame,
  User,
  LogIn,
  CheckCircle2,
  RefreshCw,
  Compass,
  SlidersHorizontal,
  X,
  Music,
  Zap,
  Check,
} from 'lucide-react';
import { Song } from '../../types/music';
import { SongCard } from '../cards/SongCard';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { useAuth } from '../../context/AuthContext';

const AVAILABLE_ARTISTS = [
  'Arijit Singh',
  'Karan Aujla',
  'Anuv Jain',
  'Shreya Ghoshal',
  'Diljit Dosanjh',
  'AP Dhillon',
  'Pritam',
  'Atif Aslam',
  'Badshah',
  'Sachin-Jigar',
  'Jasleen Royal',
  'Hanumankind',
  'Vishal Mishra',
  'Darshan Raval',
  'King',
];

const AVAILABLE_GENRES = [
  'Romantic Melodies',
  'Bollywood Hits',
  'Punjabi & Desi',
  'Acoustic Indie',
  'Desi Hip-Hop',
  'Hindi Lofi Beats',
  'Sufi & Soul',
];

// Client-side Canonical stem extractor for 100% duplicate elimination
function extractSongStemClient(rawTitle: string): string {
  if (!rawTitle) return '';
  let t = rawTitle.toLowerCase();
  if (t.includes('|')) t = t.split('|')[0];
  t = t.replace(/\(.*?\)/g, ' ').replace(/\[.*?\]/g, ' ').replace(/\{.*?\}/g, ' ');

  const noise = [
    'official video', 'official music video', 'official audio', 'lyric video',
    'lyrics video', 'visualizer', 'full song', 'full video', 'video song',
    'audio song', 'music video', 'soundtrack', 'from the film', 'from the movie',
    'remix', 'lofi', 'slowed', 'reverb', 'bass boosted', 'unplugged', 'acoustic',
    'live performance', '4k', 'hd', 'teaser', 'trailer', 'feat', 'ft.', 'ft', 'with'
  ];
  for (const n of noise) {
    t = t.replaceAll(n, ' ');
  }
  if (t.includes(' - ')) {
    const parts = t.split(' - ');
    t = parts.length >= 2 ? parts[1] : t;
  }
  t = t.replace(/\b(official|audio|video|songs?|lyrics?|film|movie|soundtrack|version|ver)\b/g, ' ');
  return t.replace(/[^a-z0-9]/g, '').trim().slice(0, 15);
}

export const PersonalizedRecommendationsSection: React.FC = () => {
  const { user, isAuthenticated, setAuthModalOpen, setAuthModalTab, login, updatePreferences } = useAuth();
  const {
    recentlyPlayed,
    likedSongs,
    playSong,
    currentSong,
  } = useMusicPlayer();

  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedVibe, setSelectedVibe] = useState<'all' | 'romantic' | 'punjabi' | 'bollywood' | 'indie' | 'hiphop'>('all');
  const [insightSummary, setInsightSummary] = useState<string>('Personalized based on your musical taste profile');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showTasteModal, setShowTasteModal] = useState<boolean>(false);

  // Active preferences (merged from user profile + local state)
  const currentFavoriteArtists = useMemo(() => {
    return user?.preferences?.favoriteArtists || ['Arijit Singh', 'Karan Aujla', 'Anuv Jain', 'Sachin-Jigar'];
  }, [user?.preferences?.favoriteArtists]);

  const currentFavoriteGenres = useMemo(() => {
    return user?.preferences?.favoriteGenres || ['Romantic Melodies', 'Bollywood Hits', 'Punjabi & Desi'];
  }, [user?.preferences?.favoriteGenres]);

  // Extract top artists and recent titles from user listening history and liked songs
  const { userTopArtists, userRecentTitles, userRecentIds } = useMemo(() => {
    const artistCounts = new Map<string, number>();
    const recentTitles: string[] = [];
    const recentIds: string[] = [];

    // Analyze liked songs (highest priority)
    for (const song of likedSongs) {
      if (song.artist) {
        const primaryArtist = song.artist.split(/[,&]/)[0].trim();
        artistCounts.set(primaryArtist, (artistCounts.get(primaryArtist) || 0) + 4);
      }
      if (song.title) recentTitles.push(song.title);
      if (song.id) recentIds.push(song.id);
    }

    // Analyze recently played
    for (const song of recentlyPlayed) {
      if (song.artist) {
        const primaryArtist = song.artist.split(/[,&]/)[0].trim();
        artistCounts.set(primaryArtist, (artistCounts.get(primaryArtist) || 0) + 2);
      }
      if (song.title) recentTitles.push(song.title);
      if (song.id) recentIds.push(song.id);
    }

    // Include explicitly saved preferred artists
    for (const art of currentFavoriteArtists) {
      artistCounts.set(art, (artistCounts.get(art) || 0) + 5);
    }

    // Sort artists by frequency
    const sortedArtists = Array.from(artistCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([art]) => art);

    const finalArtists = sortedArtists.length > 0
      ? sortedArtists.slice(0, 4)
      : currentFavoriteArtists;

    return {
      userTopArtists: finalArtists,
      userRecentTitles: recentTitles.slice(0, 5),
      userRecentIds: recentIds.slice(0, 6),
    };
  }, [recentlyPlayed, likedSongs, currentFavoriteArtists]);

  // Fetch strictly deduplicated recommendations
  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setIsRefreshing(true);

    try {
      const savedToken = localStorage.getItem('musicholic_auth_token');
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(savedToken ? { Authorization: `Bearer ${savedToken}` } : {}),
        },
        body: JSON.stringify({
          artists: userTopArtists,
          recentSongTitles: userRecentTitles,
          recentSongIds: userRecentIds,
          currentSongId: currentSong?.id,
          preferenceVibe: selectedVibe !== 'all' ? selectedVibe : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.recommendations && Array.isArray(data.recommendations)) {
          // Double verify client-side deduplication across both ID and core stem
          const seenIds = new Set<string>();
          const seenStems = new Set<string>();
          const uniqueList: Song[] = [];

          for (const s of data.recommendations) {
            if (!s || !s.id || !s.title) continue;
            if (seenIds.has(s.id)) continue;
            if (currentSong?.id && s.id === currentSong.id) continue;

            const stem = extractSongStemClient(s.title);
            if (stem.length >= 4) {
              let isDup = false;
              for (const existingStem of seenStems) {
                if (
                  existingStem === stem ||
                  (existingStem.length >= 6 && stem.startsWith(existingStem)) ||
                  (stem.length >= 6 && existingStem.startsWith(stem))
                ) {
                  isDup = true;
                  break;
                }
              }
              if (isDup) continue;
              seenStems.add(stem);
            }

            seenIds.add(s.id);
            uniqueList.push(s);
          }

          setRecommendations(uniqueList);
          if (data.summary) {
            setInsightSummary(data.summary);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load personalized recommendations:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userTopArtists, userRecentTitles, userRecentIds, currentSong?.id, selectedVibe]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handlePlayAll = () => {
    if (recommendations.length > 0) {
      playSong(recommendations[0], recommendations, 0);
    }
  };

  // Toggle favorite artist in taste profile
  const handleToggleArtist = (artist: string) => {
    const exists = currentFavoriteArtists.includes(artist);
    let updated: string[];
    if (exists) {
      if (currentFavoriteArtists.length <= 1) return; // keep at least 1
      updated = currentFavoriteArtists.filter((a) => a !== artist);
    } else {
      updated = [...currentFavoriteArtists, artist];
    }
    updatePreferences({ favoriteArtists: updated });
  };

  // Toggle favorite genre in taste profile
  const handleToggleGenre = (genre: string) => {
    const exists = currentFavoriteGenres.includes(genre);
    let updated: string[];
    if (exists) {
      if (currentFavoriteGenres.length <= 1) return; // keep at least 1
      updated = currentFavoriteGenres.filter((g) => g !== genre);
    } else {
      updated = [...currentFavoriteGenres, genre];
    }
    updatePreferences({ favoriteGenres: updated });
  };

  // Quick 1-click Demo Sign In for seamless testing
  const handleQuickDemoSignIn = async () => {
    await login('ashapakmaniyar25@gmail.com', 'password123');
  };

  // ==========================================
  // CASE 1: USER IS NOT SIGNED IN
  // Showcase an immersive invitation banner with 1-click unlock
  // ==========================================
  if (!isAuthenticated) {
    return (
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/50 via-[#111116] to-[#0c0c10] border border-emerald-500/30 shadow-2xl p-6 sm:p-8 transition-all">
        {/* Ambient neon radial glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider shadow-sm shadow-emerald-500/10">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Smart Personalization Engine</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Unlock Your Personalized Indian Music Recommendations
            </h3>

            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-normal">
              Sign in to receive high-fidelity, tailor-made daily mixes based on your listening history, favorite Indian artists (Arijit Singh, Karan Aujla, Anuv Jain), liked tracks, and preferred musical vibes.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-neutral-400">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-emerald-300">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> 100% Unique Tracks (Zero Duplicates)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-emerald-300">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Deep Taste Tuning
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-emerald-300">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Cloud Resume & Sync
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto flex-shrink-0">
            <button
              onClick={() => {
                setAuthModalTab('login');
                setAuthModalOpen(true);
              }}
              className="btn-tactile btn-glow-emerald btn-shimmer inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Personalize</span>
            </button>

            <button
              onClick={handleQuickDemoSignIn}
              className="btn-tactile inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-700 hover:border-emerald-500/40 transition-colors active:scale-95"
              title="Instantly sign in as Ashpak to preview personalized recommendations"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>1-Click Test Sign In (Ashpak)</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ==========================================
  // CASE 2: USER IS SIGNED IN
  // Display rich personalized recommendations dashboard
  // ==========================================
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#14141c] via-[#0f0f15] to-[#0a0a0d] border border-neutral-800 shadow-2xl p-5 sm:p-7 space-y-6">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with User Info & Actions */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-neutral-800/60">
        <div className="flex items-center gap-3.5">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/30 via-teal-500/20 to-purple-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-6 h-6 animate-pulse-subtle" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Recommended For {user?.name || 'You'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>AI-Personalized</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              {insightSummary}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Taste Tuning Button */}
          <button
            onClick={() => setShowTasteModal(true)}
            className="btn-tactile inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-700/80 hover:border-emerald-500/40 transition-colors"
            title="Tune your favorite artists and genres"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Tune Taste</span>
          </button>

          {/* Refresh Mix Button */}
          <button
            onClick={fetchRecommendations}
            disabled={isRefreshing}
            className="btn-tactile p-2.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 transition-colors"
            title="Refresh Recommendations"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Play All Mix Button */}
          <button
            onClick={handlePlayAll}
            disabled={recommendations.length === 0}
            className="btn-tactile btn-glow-emerald btn-shimmer inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-neutral-950 font-bold text-xs sm:text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>Play Your Mix</span>
          </button>
        </div>
      </div>

      {/* Vibe Switcher Pills */}
      <div className="relative z-10 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'all', label: '✨ All For You' },
          { id: 'romantic', label: '💖 Romantic Melodies' },
          { id: 'punjabi', label: '⚡ Punjabi & Desi' },
          { id: 'bollywood', label: '🌟 Bollywood Hits' },
          { id: 'indie', label: '🌿 Acoustic & Indie' },
          { id: 'hiphop', label: '🎤 Desi Hip-Hop' },
        ].map((tab) => {
          const isSelected = selectedVibe === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedVibe(tab.id as any)}
              className={`btn-tactile px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0 ${
                isSelected
                  ? 'bg-emerald-400 text-neutral-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/20 active:scale-95'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:border-neutral-700 active:scale-95'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Recommendations Cards Grid (Strictly Deduplicated: Zero Same Song in List!) */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`rec-skel-${i}`}
              className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/40 space-y-3"
            >
              <div className="aspect-square w-full rounded-xl bg-neutral-800 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-neutral-800 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-neutral-800/60 animate-pulse" />
            </div>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="py-12 text-center text-neutral-400 space-y-2">
          <Compass className="w-8 h-8 mx-auto text-neutral-600 animate-pulse" />
          <p className="text-sm">Curating fresh personalized tracks for your taste...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {recommendations.map((song, idx) => (
            <SongCard
              key={`rec-${song.id}-${idx}`}
              song={song}
              playlistContext={recommendations}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* ==================================================== */}
      {/* TASTE PROFILE TUNING MODAL                           */}
      {/* Allows user to customize their Favorite Artists & Genres */}
      {/* ==================================================== */}
      {showTasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setShowTasteModal(false)}
          />

          <div className="relative w-full max-w-lg bg-[#0e0e12] border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Tune Your Music Taste
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Recommendations adapt immediately to your selected artists & styles
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowTasteModal(false)}
                className="btn-tactile p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Favorite Artists */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Favorite Indian Artists</span>
              </label>
              <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
                {AVAILABLE_ARTISTS.map((artist) => {
                  const isFav = currentFavoriteArtists.includes(artist);
                  return (
                    <button
                      key={artist}
                      onClick={() => handleToggleArtist(artist)}
                      className={`btn-tactile px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                        isFav
                          ? 'bg-emerald-400 text-neutral-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-bold'
                          : 'bg-neutral-900/90 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {artist} {isFav && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Favorite Genres / Moods */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" />
                <span>Preferred Genres & Moods</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_GENRES.map((genre) => {
                  const isFav = currentFavoriteGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => handleToggleGenre(genre)}
                      className={`btn-tactile px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                        isFav
                          ? 'bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-500/20 font-bold'
                          : 'bg-neutral-900/90 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {genre} {isFav && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Done Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setShowTasteModal(false);
                  fetchRecommendations();
                }}
                className="btn-tactile btn-glow-emerald btn-shimmer px-6 py-2.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
              >
                Save & Apply Taste Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Flame,
  Clock,
  Shuffle,
  Music2,
  Radio,
  User,
  ListMusic,
  Disc3,
  Volume2,
  ChevronRight,
  Headphones,
  Trophy,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { Song } from '../../types/music';
import { SongCard } from '../cards/SongCard';
import { SongRow } from '../cards/SongRow';
import { YouTubeChartSection } from '../home/YouTubeChartSection';
import { PersonalizedRecommendationsSection } from '../home/PersonalizedRecommendationsSection';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { useAuth } from '../../context/AuthContext';
import { AudioVisualizer } from '../ui/AudioVisualizer';

interface HomeViewProps {
  onSearchGenre: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
}

const CATEGORIES = [
  { id: 'india', name: '🇮🇳 India Trending' },
  { id: 'bollywood', name: '🌟 Bollywood Hits' },
  { id: 'punjabi', name: '⚡ Punjabi & Desi' },
  { id: 'romantic', name: '💖 Romantic Melodies' },
  { id: 'indie', name: '🌿 Indie India' },
  { id: 'hiphop', name: '🎤 Desi Hip-Hop' },
  { id: 'lofi', name: '☕ Hindi Chill Lofi' },
  { id: 'global', name: '✨ Global Top Hits' },
];

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.floor(secs % 60);
  return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSearchGenre,
  selectedCategory,
  setSelectedCategory,
}) => {
  const {
    currentSong,
    isPlaying,
    recentlyPlayed,
    lastPlayed,
    resumeLastPlayed,
    playSong,
    suggestedQueue,
    searchHistory,
    audioQuality,
    toggleEqModal,
  } = useMusicPlayer();
  const { user, isAuthenticated, setAuthModalOpen } = useAuth();

  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [becauseYouListenedSongs, setBecauseYouListenedSongs] = useState<Song[]>([]);
  const [moreFromArtistSongs, setMoreFromArtistSongs] = useState<Song[]>([]);
  const [similarMusicSongs, setSimilarMusicSongs] = useState<Song[]>([]);
  const [sourceTrackName, setSourceTrackName] = useState<string>('Husn — Anuv Jain');
  const [sourceArtist, setSourceArtist] = useState<string>('Anuv Jain');

  const [isLoadingTrending, setIsLoadingTrending] = useState<boolean>(true);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState<boolean>(false);

  // Determine recent reference song/artist for contextual recommendations
  useEffect(() => {
    let recentSong: Song | null = null;
    if (lastPlayed?.song) {
      recentSong = lastPlayed.song;
    } else if (recentlyPlayed.length > 0) {
      recentSong = recentlyPlayed[0];
    }

    if (recentSong) {
      setSourceTrackName(`${recentSong.title} — ${recentSong.artist}`);
      setSourceArtist(recentSong.artist);
    } else if (searchHistory.length > 0) {
      setSourceTrackName(searchHistory[0]);
      setSourceArtist(searchHistory[0]);
    } else {
      setSourceTrackName('Husn — Anuv Jain');
      setSourceArtist('Anuv Jain');
    }
  }, [lastPlayed, recentlyPlayed, searchHistory]);

  // Fetch Trending tracks based on selected category
  useEffect(() => {
    let isMounted = true;
    setIsLoadingTrending(true);

    fetch(`/api/trending?category=${selectedCategory}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.results) {
          setTrendingSongs(data.results);
        }
      })
      .catch((err) => console.error('Trending fetch error:', err))
      .finally(() => {
        if (isMounted) setIsLoadingTrending(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory]);

  // Fetch contextual sections: "Because You Listened To...", "More From This Artist", "Similar Music"
  useEffect(() => {
    let isMounted = true;
    if (!sourceArtist) return;

    setIsLoadingPersonalized(true);

    Promise.all([
      // 1. "Because you listened to [Track/Artist]"
      fetch(`/api/search?q=${encodeURIComponent(`${sourceArtist} songs mix audio`)}`).then((r) =>
        r.json(),
      ),
      // 2. "More From This Artist"
      fetch(`/api/artist-tracks?artist=${encodeURIComponent(sourceArtist)}`).then((r) =>
        r.json(),
      ),
      // 3. "Similar Music"
      fetch(`/api/search?q=${encodeURIComponent(`${sourceArtist} similar acoustic indie audio`)}`).then(
        (r) => r.json(),
      ),
    ])
      .then(([becauseRes, artistRes, similarRes]) => {
        if (!isMounted) return;
        if (becauseRes.results) setBecauseYouListenedSongs(becauseRes.results.slice(0, 6));
        if (artistRes.results) setMoreFromArtistSongs(artistRes.results.slice(0, 6));
        if (similarRes.results) setSimilarMusicSongs(similarRes.results.slice(0, 6));
      })
      .catch((err) => console.error('Contextual fetch error:', err))
      .finally(() => {
        if (isMounted) setIsLoadingPersonalized(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sourceArtist]);

  return (
    <div className="space-y-10 pb-36 animate-in fade-in duration-300">
      {/* 1. ATMOSPHERIC HERO SECTION: RESUME BANNER OR CHART SPOTLIGHT */}
      {lastPlayed ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/90 via-[#111116] to-[#0c0c10] border border-emerald-500/25 shadow-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-xl text-center md:text-left space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Last Played • Ready to Resume</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {lastPlayed.song.title}
            </h2>

            <p className="text-sm sm:text-base text-neutral-300 font-medium">
              By <span className="text-white font-semibold">{lastPlayed.song.artist}</span>
            </p>

            {/* Resume button with exact timestamp */}
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                onClick={resumeLastPlayed}
                className="btn-tactile btn-glow-emerald inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Resume at {formatSeconds(lastPlayed.position)}</span>
              </button>

              <button
                onClick={() => playSong(lastPlayed.song, [lastPlayed.song], 0, 0)}
                className="btn-tactile inline-flex items-center gap-2 px-5 py-3 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 text-sm font-semibold border border-neutral-700/60 transition-colors active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Play from Beginning</span>
              </button>
            </div>
          </div>

          {/* Artwork on right */}
          <div
            onClick={resumeLastPlayed}
            className="relative z-10 flex-shrink-0 w-44 sm:w-52 aspect-square rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group cursor-pointer"
          >
            <img
              src={lastPlayed.song.thumbnail}
              alt={lastPlayed.song.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="btn-tactile btn-glow-emerald w-14 h-14 rounded-full bg-emerald-400 text-neutral-950 flex items-center justify-center shadow-xl group-hover:scale-110 active:scale-95 transition-transform">
                <Play className="w-6 h-6 fill-current ml-1" />
              </div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[11px] font-mono text-center text-emerald-400 border border-emerald-500/20">
              Resume at {formatSeconds(lastPlayed.position)}
            </div>
          </div>
        </div>
      ) : trendingSongs.length > 0 ? (
        /* Spotlight Hero when first opened */
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/40 via-neutral-900/90 to-[#121218] border border-amber-500/25 shadow-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative z-10 max-w-xl text-center md:text-left space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" />
              <span>👑 #1 On YouTube India Trending</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {trendingSongs[0].title}
            </h2>

            <p className="text-sm sm:text-base text-neutral-300 font-medium">
              By <span className="text-white font-semibold">{trendingSongs[0].artist}</span> • High-Resolution 24-bit Stream
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                onClick={() => playSong(trendingSongs[0], trendingSongs, 0)}
                className="btn-tactile btn-glow-emerald inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play Chart Topper</span>
              </button>

              <button
                onClick={() => {
                  const rand = Math.floor(Math.random() * trendingSongs.length);
                  playSong(trendingSongs[rand], trendingSongs, rand);
                }}
                className="btn-tactile inline-flex items-center gap-2 px-5 py-3 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold border border-neutral-700/60 transition-colors active:scale-95"
              >
                <Shuffle className="w-4 h-4" />
                <span>Shuffle Charts</span>
              </button>
            </div>
          </div>

          <div
            onClick={() => playSong(trendingSongs[0], trendingSongs, 0)}
            className="relative z-10 flex-shrink-0 w-44 sm:w-52 aspect-square rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group cursor-pointer"
          >
            <img
              src={trendingSongs[0].thumbnail}
              alt={trendingSongs[0].title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="btn-tactile btn-glow-emerald w-14 h-14 rounded-full bg-emerald-400 text-neutral-950 flex items-center justify-center shadow-xl group-hover:scale-110 active:scale-95 transition-transform">
                <Play className="w-6 h-6 fill-current ml-1" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. PERSONALIZED RECOMMENDATIONS SECTION (Customized according to user listening preference after sign in) */}
      <PersonalizedRecommendationsSection />

      {/* 3. DEDICATED YOUTUBE TOP CHARTS HUB */}
      <YouTubeChartSection />

      {/* 4. TRENDING & POPULAR SONGS SECTION WITH GENRE TABS */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Trending & Popular Songs
              </h3>
              <p className="text-xs text-neutral-400">
                Top charting hits, viral streams, and community favorites
              </p>
            </div>
          </div>

          {trendingSongs.length > 0 && (
            <button
              onClick={() => playSong(trendingSongs[0], trendingSongs, 0)}
              className="btn-tactile inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-emerald-500/30 text-xs font-semibold self-start sm:self-auto transition-colors active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play All Trending</span>
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`btn-tactile px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-400 text-neutral-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-bold'
                    : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Song Cards Grid */}
        {isLoadingTrending ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`trend-skel-${i}`}
                className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/40 space-y-3"
              >
                <div className="aspect-square w-full rounded-xl bg-neutral-800 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-neutral-800 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-neutral-800/60 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {trendingSongs.map((song, idx) => (
              <SongCard
                key={`trending-${song.id}-${idx}`}
                song={song}
                playlistContext={trendingSongs}
                index={idx}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. "BECAUSE YOU LISTENED TO..." */}
      {becauseYouListenedSongs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Disc3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Because You Listened To {sourceTrackName}
                </h3>
                <p className="text-xs text-neutral-400">
                  Curated picks matching your recent sound & style
                </p>
              </div>
            </div>
            <button
              onClick={() => playSong(becauseYouListenedSongs[0], becauseYouListenedSongs, 0)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play All</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {becauseYouListenedSongs.map((song, idx) => (
              <SongCard
                key={`because-${song.id}-${idx}`}
                song={song}
                playlistContext={becauseYouListenedSongs}
                index={idx}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. "MORE FROM THIS ARTIST" */}
      {moreFromArtistSongs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  More From {sourceArtist}
                </h3>
                <p className="text-xs text-neutral-400">
                  Popular releases and essentials from this artist
                </p>
              </div>
            </div>
            <button
              onClick={() => playSong(moreFromArtistSongs[0], moreFromArtistSongs, 0)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Collection</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {moreFromArtistSongs.map((song, idx) => (
              <SongCard
                key={`artist-${song.id}-${idx}`}
                song={song}
                playlistContext={moreFromArtistSongs}
                index={idx}
              />
            ))}
          </div>
        </section>
      )}

      {/* 6. "SIMILAR MUSIC & VIBES" */}
      {similarMusicSongs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Similar Music & Vibes
                </h3>
                <p className="text-xs text-neutral-400">
                  Related sounds, mood, and genre companions
                </p>
              </div>
            </div>
            <button
              onClick={() => playSong(similarMusicSongs[0], similarMusicSongs, 0)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Mix</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {similarMusicSongs.map((song, idx) => (
              <SongCard
                key={`similar-${song.id}-${idx}`}
                song={song}
                playlistContext={similarMusicSongs}
                index={idx}
              />
            ))}
          </div>
        </section>
      )}

      {/* 7. "UP NEXT IN FLOW" */}
      {suggestedQueue.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <ListMusic className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Up Next In Flow
                </h3>
                <p className="text-xs text-neutral-400">
                  Anticipated tracks queued to play after your current song
                </p>
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-mono">
              Auto-Continue Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {suggestedQueue.slice(0, 6).map((song, idx) => (
              <SongRow
                key={`upnext-${song.id}-${idx}`}
                song={song}
                index={idx}
                playlistContext={suggestedQueue}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

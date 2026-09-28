import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Play,
  Pause,
  Flame,
  Globe2,
  TrendingUp,
  Sparkles,
  Heart,
  ListPlus,
  ChevronDown,
  ChevronUp,
  Radio,
  Star,
  Zap,
} from 'lucide-react';
import { ChartSong, ChartCategory, Song } from '../../types/music';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { AudioVisualizer } from '../ui/AudioVisualizer';

const CHART_TABS: { id: ChartCategory; label: string; icon: React.ReactNode; subtitle: string }[] = [
  {
    id: 'india',
    label: '🇮🇳 India Trending',
    icon: <Flame className="w-4 h-4" />,
    subtitle: 'Top #1 Trending & viral hits dominating YouTube India',
  },
  {
    id: 'bollywood',
    label: '🌟 Bollywood Top 50',
    icon: <Sparkles className="w-4 h-4" />,
    subtitle: 'Most streamed Bollywood & Hindi cinema chartbusters',
  },
  {
    id: 'punjabi',
    label: '⚡ Punjabi & Desi Beats',
    icon: <Zap className="w-4 h-4" />,
    subtitle: 'High-energy Punjabi, Desi hip-hop & club anthems',
  },
  {
    id: 'romantic',
    label: '💖 Romantic & Melodies',
    icon: <Trophy className="w-4 h-4" />,
    subtitle: 'Heart-touching Hindi romantic ballads & acoustic souls',
  },
  {
    id: 'global',
    label: '🌐 Global Hits',
    icon: <Globe2 className="w-4 h-4" />,
    subtitle: 'International Billboard & worldwide chartbusters',
  },
];

export const YouTubeChartSection: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlayPause,
    isLiked,
    toggleLike,
    addToQueue,
  } = useMusicPlayer();

  const [activeCategory, setActiveCategory] = useState<ChartCategory>('india');
  const [chartSongs, setChartSongs] = useState<ChartSong[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showFullChart, setShowFullChart] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/charts?category=${activeCategory}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.results) {
          setChartSongs(data.results);
        }
      })
      .catch((err) => console.error('Error fetching YouTube charts:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCategory]);

  const activeTabMeta = CHART_TABS.find((t) => t.id === activeCategory) || CHART_TABS[0];
  const topThree = chartSongs.slice(0, 3);
  const remainingSongs = showFullChart ? chartSongs.slice(3) : chartSongs.slice(3, 11);

  const handlePlaySong = (song: Song, index: number) => {
    if (currentSong?.id === song.id) {
      togglePlayPause();
    } else {
      playSong(song, chartSongs, index);
    }
  };

  const handlePlayAll = () => {
    if (chartSongs.length > 0) {
      playSong(chartSongs[0], chartSongs, 0);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#121218] via-[#0d0d12] to-[#09090c] border border-neutral-800/90 shadow-2xl p-5 sm:p-7 space-y-6">
      {/* Ambient background glow accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Section Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-neutral-800/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 via-emerald-500/20 to-teal-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-500/10">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                YouTube Top Charts
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live Charts
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400">
              {activeTabMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePlayAll}
            disabled={chartSongs.length === 0}
            className="btn-tactile btn-glow-emerald inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-neutral-950 font-bold text-xs sm:text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>Play Top Charts</span>
          </button>
        </div>
      </div>

      {/* Interactive Chart Category Tabs */}
      <div className="relative z-10 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CHART_TABS.map((tab) => {
          const isSelected = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`btn-tactile px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border flex-shrink-0 active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-r from-neutral-800 to-neutral-850 text-white border-emerald-500/50 shadow-md shadow-emerald-500/10'
                  : 'bg-neutral-900/60 hover:bg-neutral-800/80 text-neutral-400 border-neutral-800/80 hover:text-neutral-200'
              }`}
            >
              <span className={isSelected ? 'text-emerald-400' : 'text-neutral-400'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Top 3 Podium Cards */}
      {topThree.length >= 3 && !isLoading && (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((song, idx) => {
            const rank = idx + 1;
            const isPlayingThis = currentSong?.id === song.id && isPlaying;
            const isCurrentThis = currentSong?.id === song.id;
            const isGold = rank === 1;
            const isSilver = rank === 2;
            const isBronze = rank === 3;

            return (
              <div
                key={`podium-${song.id}-${rank}`}
                onClick={() => handlePlaySong(song, idx)}
                className={`group relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all duration-300 border flex flex-col justify-between ${
                  isGold
                    ? 'bg-gradient-to-b from-amber-950/30 via-neutral-900/90 to-neutral-900/60 border-amber-500/40 hover:border-amber-400 shadow-xl shadow-amber-500/10'
                    : isSilver
                    ? 'bg-gradient-to-b from-slate-900/40 via-neutral-900/90 to-neutral-900/60 border-neutral-700/80 hover:border-neutral-500 shadow-xl'
                    : 'bg-gradient-to-b from-amber-950/20 via-neutral-900/90 to-neutral-900/60 border-amber-800/40 hover:border-amber-600 shadow-xl'
                }`}
              >
                {/* Ambient Top Glow */}
                <div
                  className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40 ${
                    isGold ? 'bg-amber-400' : isSilver ? 'bg-slate-300' : 'bg-amber-600'
                  }`}
                />

                <div className="relative z-10 flex items-start justify-between gap-3 mb-3">
                  {/* Rank Crown / Number */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-mono font-black text-sm shadow-md ${
                        isGold
                          ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-amber-500/30'
                          : isSilver
                          ? 'bg-gradient-to-br from-neutral-200 to-neutral-400 text-black shadow-white/20'
                          : 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-amber-900/30'
                      }`}
                    >
                      #{rank}
                    </span>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isGold
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {song.badge || 'Top Hit'}
                    </span>
                  </div>

                  {/* Soundwave or Duration */}
                  {isCurrentThis ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                      <AudioVisualizer isPlaying={isPlayingThis} bars={3} size="sm" />
                      <span>{isPlayingThis ? 'NOW PLAYING' : 'PAUSED'}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-neutral-400">
                      {song.duration}
                    </span>
                  )}
                </div>

                {/* Artwork & Details */}
                <div className="relative z-10 flex items-center gap-3.5 my-1">
                  <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-800 shadow-md group">
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                          isGold
                            ? 'bg-amber-400 text-black group-hover:scale-110'
                            : 'bg-white text-black group-hover:scale-110'
                        }`}
                      >
                        {isPlayingThis ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-sm sm:text-base truncate group-hover:text-emerald-400 transition-colors">
                      {song.title}
                    </h3>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {song.artist}
                    </p>
                    {song.views && (
                      <span className="text-[11px] text-neutral-500 font-mono block mt-1">
                        {song.views}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom Meta */}
                <div className="relative z-10 pt-3 mt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Peak #{song.peak || rank}</span>
                    {song.weeksOnChart && (
                      <span className="text-neutral-500">• {song.weeksOnChart} wks</span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(song);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isLiked(song.id)
                        ? 'text-rose-500 hover:text-rose-400'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                    title={isLiked(song.id) ? 'Liked' : 'Like'}
                  >
                    <Heart className={`w-4 h-4 ${isLiked(song.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranked Stream Table (#4 through #10 or #20) */}
      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 px-3 pb-1 border-b border-neutral-800/40">
          <div className="flex items-center gap-6">
            <span className="w-6 text-center">#</span>
            <span>Title & Artist</span>
          </div>
          <div className="hidden sm:flex items-center gap-8">
            <span>Chart Status</span>
            <span>Audio Stream</span>
            <span className="w-14 text-right">Duration</span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="h-14 rounded-xl bg-neutral-900/60 animate-pulse border border-neutral-800/40"
              />
            ))}
          </div>
        ) : (
          remainingSongs.map((song, idx) => {
            const actualIndex = idx + 3;
            const rank = song.rank || actualIndex + 1;
            const isCurrentThis = currentSong?.id === song.id;
            const isPlayingThis = isCurrentThis && isPlaying;
            const liked = isLiked(song.id);

            return (
              <div
                key={`chart-row-${song.id}-${actualIndex}`}
                onClick={() => handlePlaySong(song, actualIndex)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                  isCurrentThis
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                    : 'bg-neutral-900/40 hover:bg-neutral-800/60 border-neutral-800/50 hover:border-neutral-700/70'
                }`}
              >
                {/* Left: Rank & Title */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                  <span
                    className={`w-6 text-center font-mono font-bold text-sm ${
                      isCurrentThis ? 'text-emerald-400' : 'text-neutral-500 group-hover:text-neutral-300'
                    }`}
                  >
                    {rank < 10 ? `0${rank}` : rank}
                  </span>

                  <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800 shadow">
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                      {isPlayingThis ? (
                        <AudioVisualizer isPlaying={isPlayingThis} bars={3} size="sm" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-white fill-current ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4
                      className={`font-semibold text-sm truncate ${
                        isCurrentThis
                          ? 'text-emerald-400'
                          : 'text-neutral-100 group-hover:text-white'
                      }`}
                    >
                      {song.title}
                    </h4>
                    <p className="text-xs text-neutral-400 truncate">
                      {song.artist}
                    </p>
                  </div>
                </div>

                {/* Right: Meta & Actions */}
                <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                  {/* Movement badge */}
                  <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] text-neutral-400 w-24">
                    {song.movement === 'up' ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>▲ Peak #{song.peak || rank}</span>
                      </span>
                    ) : (
                      <span className="text-neutral-500 flex items-center gap-0.5">
                        <span>• Peak #{song.peak || rank}</span>
                      </span>
                    )}
                  </div>

                  {/* Quality Stream Badge */}
                  <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold">
                    {song.badge || 'FLAC 96k'}
                  </span>

                  {/* Duration */}
                  <span className="text-xs font-mono text-neutral-400 w-12 text-right">
                    {song.duration}
                  </span>

                  {/* Quick Add to Queue */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToQueue(song);
                    }}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    title="Add to Queue"
                  >
                    <ListPlus className="w-4 h-4" />
                  </button>

                  {/* Like Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(song);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      liked
                        ? 'text-rose-500 hover:text-rose-400'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                    title={liked ? 'Liked' : 'Like'}
                  >
                    <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Show Full Chart Toggle Button */}
      {chartSongs.length > 10 && (
        <div className="relative z-10 pt-2 text-center">
          <button
            onClick={() => setShowFullChart(!showFullChart)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold transition-all"
          >
            <span>{showFullChart ? 'Show Top 10 Only' : `View Full Top ${chartSongs.length} Chart`}</span>
            {showFullChart ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </section>
  );
};

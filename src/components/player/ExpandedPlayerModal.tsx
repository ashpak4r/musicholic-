import React, { useState } from 'react';
import {
  ChevronDown,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  Mic2,
  Video,
  Sparkles,
  Sliders,
  Radio,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { AudioVisualizer } from '../ui/AudioVisualizer';
import { AudioQualityBadge } from '../ui/AudioQualityBadge';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const ExpandedPlayerModal: React.FC = () => {
  const {
    expandedPlayer,
    setExpandedPlayer,
    currentSong,
    isPlaying,
    currentTime,
    duration,
    seekTo,
    togglePlayPause,
    nextTrack,
    prevTrack,
    shuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    isLiked,
    toggleLike,
    lyricsOpen,
    setLyricsOpen,
    videoMode,
    toggleVideoMode,
    toggleEqModal,
    eqModalOpen,
    eqSettings,
    backgroundMode,
    toggleBackgroundMode,
  } = useMusicPlayer();

  if (!expandedPlayer || !currentSong) return null;

  const liked = isLiked(currentSong.id);

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] text-neutral-100 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-bottom duration-300">
      {/* Background ambient blur */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none blur-3xl scale-125"
        style={{
          backgroundImage: `url(${currentSong.thumbnail})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 max-w-4xl w-full mx-auto">
        <button
          onClick={() => setExpandedPlayer(false)}
          className="p-2 -ml-2 rounded-full hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
          aria-label="Collapse player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center">
          <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold block">
            Playing From MusicHolic
          </span>
          <span className="text-xs text-neutral-400 font-medium">
            Smart Continuous Stream
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleBackgroundMode}
            className={`btn-tactile p-2 rounded-full transition-all relative hover:scale-105 active:scale-90 ${
              backgroundMode
                ? 'function-btn-active btn-glow-emerald bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-500/25'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title={
              backgroundMode
                ? 'Background Audio: ON (Screen lock playback active)'
                : 'Enable Background Audio'
            }
          >
            <Radio className="w-5 h-5" />
            {backgroundMode && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={toggleEqModal}
            className={`btn-tactile p-2 rounded-full transition-all relative hover:scale-105 active:scale-90 ${
              eqModalOpen || eqSettings.enabled
                ? 'function-btn-active btn-glow-cyan bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Studio Equalizer & Hi-Res Audio"
          >
            <Sliders className="w-5 h-5" />
            {eqSettings.enabled && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={toggleVideoMode}
            className={`btn-tactile p-2 rounded-full transition-all hover:scale-105 active:scale-90 ${
              videoMode
                ? 'function-btn-active-purple btn-glow-purple bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-md shadow-purple-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title={videoMode ? 'Disable Video Mode' : 'Watch Official Video'}
          >
            <Video className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 max-w-lg w-full mx-auto py-2">
        {/* Artwork view with glowing border */}
        <div className="relative w-full max-w-xs sm:max-w-sm aspect-square rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 group mb-6">
          <img
            src={currentSong.thumbnail}
            alt={currentSong.title}
            className={`w-full h-full object-cover transition-transform duration-700 ${
              isPlaying ? 'scale-105' : 'scale-100'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

          {/* Soundwave badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
            <AudioVisualizer isPlaying={isPlaying} bars={4} size="md" />
            <span className="text-xs font-semibold text-neutral-200">
              {isPlaying ? 'Playing High-Res' : 'Paused'}
            </span>
          </div>

          <div className="absolute top-4 right-4">
            <AudioQualityBadge />
          </div>
        </div>

        {/* Title & Artist info */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="min-w-0 pr-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate leading-tight">
              {currentSong.title}
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 truncate mt-1">
              {currentSong.artist}
            </p>
          </div>
          <button
            onClick={() => toggleLike(currentSong)}
            className={`btn-tactile p-3 rounded-full transition-all active:scale-90 ${
              liked
                ? 'btn-glow-rose text-rose-500 hover:text-rose-400 bg-rose-500/10 shadow-sm shadow-rose-500/25'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-6 h-6 ${liked ? 'fill-rose-500 animate-heart-pop' : ''}`} />
          </button>
        </div>

        {/* Scrubber / Progress Bar */}
        <div className="w-full mb-4">
          <div className="relative group py-2">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-neutral-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="w-full flex items-center justify-between px-2 mb-6">
          <button
            onClick={toggleShuffle}
            className={`btn-tactile p-2.5 rounded-full transition-all active:scale-90 ${
              shuffle
                ? 'function-btn-active text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={prevTrack}
            className="btn-tactile p-3 rounded-full text-neutral-300 hover:text-emerald-400 hover:bg-neutral-800 hover:scale-110 active:scale-90 transition-all"
            title="Previous Track"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={togglePlayPause}
            className="btn-tactile btn-glow-emerald btn-shimmer w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-emerald-400 text-neutral-950 flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:bg-emerald-300 hover:scale-110 active:scale-90 transition-all border border-emerald-300/40"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
            ) : (
              <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="btn-tactile p-3 rounded-full text-neutral-300 hover:text-emerald-400 hover:bg-neutral-800 hover:scale-110 active:scale-90 transition-all"
            title="Next Track"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`btn-tactile p-2.5 rounded-full transition-all relative active:scale-90 ${
              repeatMode !== 'off'
                ? 'function-btn-active text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Volume & Extra Tools */}
        <div className="w-full flex items-center justify-between text-neutral-400 px-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLyricsOpen(!lyricsOpen)}
              className={`btn-tactile flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                lyricsOpen
                  ? 'function-btn-active-purple btn-glow-purple bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <Mic2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Lyrics</span>
            </button>

            <button
              onClick={toggleEqModal}
              className={`btn-tactile flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                eqSettings.enabled
                  ? 'function-btn-active btn-glow-cyan bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>{eqSettings.enabled ? `EQ: ${eqSettings.preset}` : 'Studio EQ'}</span>
            </button>

            <button
              onClick={toggleBackgroundMode}
              className={`btn-tactile flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                backgroundMode
                  ? 'function-btn-active btn-glow-emerald bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              }`}
              title="Plays music continuously when screen is locked"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>{backgroundMode ? 'Background ON' : 'Background OFF'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="btn-tactile p-1.5 hover:text-white hover:bg-neutral-800 rounded-full transition-colors active:scale-90"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 hover:text-emerald-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 pb-6 text-center text-xs text-neutral-500">
        Swipe down or tap arrow to minimize
      </div>
    </div>
  );
};

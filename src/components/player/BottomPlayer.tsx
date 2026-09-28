import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  ListMusic,
  Mic2,
  Video,
  Maximize2,
  AlertCircle,
  Loader2,
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

export const BottomPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    isBuffering,
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
    queueOpen,
    setQueueOpen,
    lyricsOpen,
    setLyricsOpen,
    videoMode,
    toggleVideoMode,
    setExpandedPlayer,
    queue,
    queueIndex,
    playerError,
    clearPlayerError,
    toggleEqModal,
    eqModalOpen,
    eqSettings,
    backgroundMode,
    toggleBackgroundMode,
    backgroundToast,
  } = useMusicPlayer();

  const [isHovered, setIsHovered] = useState(false);

  if (!currentSong) return null;

  const liked = isLiked(currentSong.id);
  const upcomingCount = Math.max(0, queue.length - 1 - queueIndex);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Toast Alert for Player Errors */}
      {playerError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-amber-950/90 text-amber-200 border border-amber-700/80 shadow-2xl flex items-center gap-2 text-xs font-medium backdrop-blur-md animate-in fade-in slide-in-from-bottom duration-200">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{playerError}</span>
          <button
            onClick={clearPlayerError}
            className="ml-2 text-amber-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Fixed Bottom Player Bar */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-0 inset-x-0 z-40 bg-[#0c0c0f]/95 backdrop-blur-2xl border-t border-neutral-800/80 text-neutral-100 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] select-none"
      >
        {/* Mobile Top Scrubbing Bar */}
        <div className="sm:hidden absolute top-0 inset-x-0 h-1 bg-neutral-800 overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          {/* Left: Song Artwork & Details */}
          <div
            onClick={() => {
              if (window.innerWidth < 640) {
                setExpandedPlayer(true);
              }
            }}
            className="flex items-center gap-3 min-w-0 sm:w-1/4 cursor-pointer sm:cursor-default"
          >
            <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-800 shadow-md group">
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedPlayer(true);
                }}
                title="Expand full player"
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-2">
                <h4
                  title={currentSong.title}
                  className="font-semibold text-xs sm:text-sm text-neutral-100 truncate hover:text-emerald-400 transition-colors cursor-pointer"
                  onClick={() => setExpandedPlayer(true)}
                >
                  {currentSong.title}
                </h4>
                {isPlaying && (
                  <div className="hidden sm:block">
                    <AudioVisualizer isPlaying={isPlaying} bars={3} size="sm" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p
                  title={currentSong.artist}
                  className="text-[11px] sm:text-xs text-neutral-400 truncate"
                >
                  {currentSong.artist}
                </p>
                <div className="hidden lg:block">
                  <AudioQualityBadge compact />
                </div>
              </div>
            </div>

            {/* Like button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike(currentSong);
              }}
              aria-label={liked ? 'Unlike' : 'Like'}
              className={`btn-tactile hidden sm:flex p-2 rounded-full transition-all hover:scale-115 active:scale-90 ${
                liked
                  ? 'btn-glow-rose text-rose-500 hover:text-rose-400 bg-rose-500/10 shadow-sm shadow-rose-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500 animate-heart-pop' : ''}`} />
            </button>
          </div>

          {/* Center: Controls & Scrubber */}
          <div className="flex-1 max-w-xl flex flex-col items-center">
            {/* Buttons Row */}
            <div className="flex items-center gap-3 sm:gap-5">
              {/* Shuffle */}
              <button
                onClick={toggleShuffle}
                className={`btn-tactile hidden sm:flex p-2 rounded-xl transition-all active:scale-90 ${
                  shuffle
                    ? 'function-btn-active text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Prev */}
              <button
                onClick={prevTrack}
                className="btn-tactile p-2 sm:p-2.5 rounded-full text-neutral-300 hover:text-emerald-400 hover:bg-neutral-800 hover:scale-110 active:scale-90 transition-all"
                title="Previous Track"
                aria-label="Previous track"
              >
                <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </button>

              {/* Play / Pause button */}
              <button
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="btn-tactile btn-glow-emerald btn-shimmer w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-400 text-neutral-950 flex items-center justify-center shadow-xl shadow-emerald-500/35 hover:bg-emerald-300 hover:scale-110 active:scale-90 transition-all border border-emerald-300/40"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isBuffering ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={nextTrack}
                className="btn-tactile p-2 sm:p-2.5 rounded-full text-neutral-300 hover:text-emerald-400 hover:bg-neutral-800 hover:scale-110 active:scale-90 transition-all"
                title="Next (Intelligently queued)"
                aria-label="Next track"
              >
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </button>

              {/* Repeat */}
              <button
                onClick={toggleRepeat}
                className={`btn-tactile hidden sm:flex p-2 rounded-xl transition-all relative active:scale-90 ${
                  repeatMode !== 'off'
                    ? 'function-btn-active text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Desktop Scrubber Bar */}
            <div className="hidden sm:flex items-center gap-3 w-full mt-1.5">
              <span className="text-[11px] font-mono text-neutral-400 w-9 text-right">
                {formatTime(currentTime)}
              </span>

              <div className="relative flex-1 group py-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="w-full h-1 bg-neutral-800 group-hover:h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-400 focus:outline-none transition-all"
                  aria-label="Playback progress"
                />
              </div>

              <span className="text-[11px] font-mono text-neutral-400 w-9">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right: Actions, Volume & Panels */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 sm:w-1/4">
            {/* Mobile Expand Trigger */}
            <button
              onClick={() => setExpandedPlayer(true)}
              className="sm:hidden p-2 rounded-lg text-neutral-400 hover:text-white active:scale-90 transition-transform"
              title="Expand player"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Video Mode Toggle */}
            <button
              onClick={toggleVideoMode}
              title={videoMode ? 'Hide Video' : 'Watch Official Music Video'}
              className={`btn-tactile hidden sm:flex p-2 rounded-xl transition-all hover:scale-105 active:scale-90 ${
                videoMode
                  ? 'function-btn-active-purple btn-glow-purple bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Video className="w-4 h-4" />
            </button>

            {/* Lyrics Toggle */}
            <button
              onClick={() => setLyricsOpen(!lyricsOpen)}
              title="Lyrics"
              className={`btn-tactile hidden sm:flex p-2 rounded-xl transition-all hover:scale-105 active:scale-90 ${
                lyricsOpen
                  ? 'function-btn-active-purple btn-glow-purple bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Mic2 className="w-4 h-4" />
            </button>

            {/* Background Play Toggle */}
            <button
              onClick={toggleBackgroundMode}
              title={
                backgroundMode
                  ? 'Background Play: ACTIVE (Music plays with screen locked)'
                  : 'Enable Background Play'
              }
              className={`btn-tactile p-2 rounded-xl transition-all relative hover:scale-105 active:scale-90 ${
                backgroundMode
                  ? 'function-btn-active btn-glow-emerald bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Radio className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {backgroundMode && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
              )}
            </button>

            {/* Studio Equalizer & Hi-Res Mode */}
            <button
              onClick={toggleEqModal}
              title={eqSettings.enabled ? `Studio EQ: ${eqSettings.preset}` : 'Studio Equalizer'}
              className={`btn-tactile p-2 rounded-xl transition-all relative hover:scale-105 active:scale-90 ${
                eqModalOpen || eqSettings.enabled
                  ? 'function-btn-active btn-glow-cyan bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Sliders className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {eqSettings.enabled && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
              )}
            </button>

            {/* Queue Toggle with Badge */}
            <button
              onClick={() => setQueueOpen(!queueOpen)}
              title="Queue"
              className={`btn-tactile relative p-2 rounded-xl transition-all hover:scale-105 active:scale-90 ${
                queueOpen
                  ? 'function-btn-active bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <ListMusic className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {upcomingCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-[10px] font-bold text-black min-w-4 text-center">
                  {upcomingCount}
                </span>
              )}
            </button>

            {/* Volume Control */}
            <div className="hidden md:flex items-center gap-2 pl-1">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 50 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-20 h-1 bg-neutral-800 hover:h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-400 focus:outline-none transition-all"
                aria-label="Volume"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Background Play Toast */}
      {backgroundToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 border border-emerald-500/40 text-neutral-100 text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-bottom duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{backgroundToast}</span>
        </div>
      )}
    </>
  );
};

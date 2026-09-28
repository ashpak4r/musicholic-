import React, { useState } from 'react';
import { Play, Pause, Heart, ListPlus, MoreVertical, Music2 } from 'lucide-react';
import { Song } from '../../types/music';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { AudioVisualizer } from '../ui/AudioVisualizer';

interface SongCardProps {
  song: Song;
  playlistContext?: Song[];
  index?: number;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  playlistContext,
  index,
}) => {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlayPause,
    isLiked,
    toggleLike,
    addToQueue,
  } = useMusicPlayer();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isCurrent = currentSong?.id === song.id;
  const liked = isLiked(song.id);

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicked inside options menu, ignore
    if ((e.target as HTMLElement).closest('.card-action-btn')) return;

    if (isCurrent) {
      togglePlayPause();
    } else {
      playSong(song, playlistContext, index);
    }
  };

  const handlePlayButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlayPause();
    } else {
      playSong(song, playlistContext, index);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col p-3 rounded-2xl cursor-pointer transition-all duration-300 ${
        isCurrent
          ? 'bg-neutral-800/80 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/40'
          : 'bg-neutral-900/60 hover:bg-neutral-850 hover:bg-neutral-800/60 border border-neutral-800/40 hover:border-neutral-700/60'
      }`}
    >
      {/* Artwork container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-800 shadow-md">
        {/* Fallback placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
            <Music2 className="w-8 h-8 animate-pulse" />
          </div>
        )}

        <img
          src={song.thumbnail}
          alt={song.title}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />

        {/* Dark gradient shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Duration badge */}
        {song.duration && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-mono font-medium text-neutral-300 border border-white/10">
            {song.duration}
          </span>
        )}

        {/* Currently playing badge */}
        {isCurrent && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500/90 backdrop-blur-md text-[10px] font-semibold tracking-wide uppercase text-black flex items-center gap-1.5 shadow-lg">
            <AudioVisualizer isPlaying={isPlaying} bars={3} size="sm" />
            <span>{isPlaying ? 'Playing' : 'Paused'}</span>
          </div>
        )}

        {/* Play / Pause button overlay on hover */}
        <button
          onClick={handlePlayButtonClick}
          aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
          className={`btn-tactile btn-glow-emerald absolute right-3 bottom-3 w-11 h-11 rounded-full bg-emerald-400 text-neutral-950 flex items-center justify-center shadow-xl shadow-emerald-500/30 transform transition-all duration-200 ${
            isCurrent
              ? 'opacity-100 scale-100'
              : 'opacity-0 translate-y-2 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'
          } hover:scale-110 hover:bg-emerald-300 active:scale-90`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Quick Like button on top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(song);
          }}
          aria-label="Like"
          className={`card-action-btn btn-tactile absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-90 ${
            liked
              ? 'bg-rose-500/20 text-rose-400 opacity-100 shadow-lg shadow-rose-500/20'
              : 'bg-black/50 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500 text-rose-500 animate-heart-pop' : ''}`} />
        </button>
      </div>

      {/* Title & Artist */}
      <div className="mt-3 flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-1">
          <h4
            title={song.title}
            className={`font-semibold text-sm truncate leading-snug transition-colors ${
              isCurrent ? 'text-emerald-400' : 'text-neutral-100 group-hover:text-white'
            }`}
          >
            {song.title}
          </h4>

          {/* More options menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="card-action-btn btn-tactile p-1 text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-neutral-800 active:scale-90"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div
                  className="absolute right-0 bottom-full mb-1 z-50 w-40 rounded-xl bg-neutral-900 border border-neutral-800 p-1 shadow-2xl text-xs backdrop-blur-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      addToQueue(song);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
                  >
                    <ListPlus className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Add to Queue</span>
                  </button>
                  <button
                    onClick={() => {
                      toggleLike(song);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        liked ? 'text-rose-400 fill-rose-400' : 'text-neutral-400'
                      }`}
                    />
                    <span>{liked ? 'Liked' : 'Like Song'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <p
          title={song.artist}
          className="text-xs text-neutral-400 truncate mt-1 hover:text-neutral-300 transition-colors"
        >
          {song.artist}
        </p>
      </div>
    </div>
  );
};

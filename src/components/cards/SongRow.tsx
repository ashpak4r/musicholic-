import React from 'react';
import { Play, Pause, Heart, ListPlus } from 'lucide-react';
import { Song } from '../../types/music';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { AudioVisualizer } from '../ui/AudioVisualizer';

interface SongRowProps {
  song: Song;
  index: number;
  playlistContext?: Song[];
}

export const SongRow: React.FC<SongRowProps> = ({
  song,
  index,
  playlistContext,
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

  const isCurrent = currentSong?.id === song.id;
  const liked = isLiked(song.id);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.row-action-btn')) return;

    if (isCurrent) {
      togglePlayPause();
    } else {
      playSong(song, playlistContext, index);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
        isCurrent
          ? 'bg-neutral-800/80 text-emerald-400'
          : 'hover:bg-neutral-850 hover:bg-neutral-800/50 text-neutral-300'
      }`}
    >
      {/* Index or Play icon */}
      <div className="w-6 flex items-center justify-center text-xs font-mono text-neutral-500">
        {isCurrent ? (
          <AudioVisualizer isPlaying={isPlaying} bars={3} size="sm" />
        ) : (
          <>
            <span className="group-hover:hidden">{index + 1}</span>
            <button
              aria-label="Play song"
              className="hidden group-hover:flex text-white hover:scale-110 transition-transform"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail */}
      <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
        <img
          src={song.thumbnail}
          alt={song.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {isCurrent && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            {isPlaying ? (
              <Pause className="w-4 h-4 text-emerald-400 fill-current" />
            ) : (
              <Play className="w-4 h-4 text-emerald-400 fill-current" />
            )}
          </div>
        )}
      </div>

      {/* Title & Artist */}
      <div className="flex-1 min-w-0 pr-2">
        <h4
          title={song.title}
          className={`font-medium text-sm truncate leading-snug ${
            isCurrent ? 'text-emerald-400 font-semibold' : 'text-neutral-100 group-hover:text-white'
          }`}
        >
          {song.title}
        </h4>
        <p
          title={song.artist}
          className="text-xs text-neutral-400 truncate mt-0.5 group-hover:text-neutral-300"
        >
          {song.artist}
        </p>
      </div>

      {/* Action buttons (Like & Add to Queue) */}
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(song);
          }}
          title={liked ? 'Remove from Liked' : 'Save to Liked'}
          className={`row-action-btn btn-tactile p-1.5 rounded-lg transition-all hover:scale-110 active:scale-90 ${
            liked
              ? 'text-rose-500'
              : 'text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500 animate-heart-pop' : ''}`} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            addToQueue(song);
          }}
          title="Add to queue"
          className="row-action-btn btn-tactile p-1.5 rounded-lg text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-neutral-800 transition-all hover:scale-110 active:scale-90"
        >
          <ListPlus className="w-4 h-4" />
        </button>

        {/* Duration */}
        <span className="w-12 text-right text-xs font-mono text-neutral-400">
          {song.duration}
        </span>
      </div>
    </div>
  );
};

import React from 'react';
import {
  X,
  Trash2,
  Sparkles,
  Music2,
  Play,
  Plus,
  Radio,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { AudioVisualizer } from '../ui/AudioVisualizer';

export const QueueDrawer: React.FC = () => {
  const {
    queueOpen,
    setQueueOpen,
    currentSong,
    isPlaying,
    queue,
    queueIndex,
    suggestedQueue,
    isLoadingSuggestions,
    playSong,
    removeFromQueue,
    clearQueue,
    addToQueue,
  } = useMusicPlayer();

  if (!queueOpen) return null;

  const upcomingQueue = queue.slice(queueIndex + 1);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={() => setQueueOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 max-w-full bg-[#0e0e11] border-l border-neutral-800 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/80">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-neutral-100">Play Queue</h3>
          </div>
          <div className="flex items-center gap-2">
            {upcomingQueue.length > 0 && (
              <button
                onClick={clearQueue}
                title="Clear Queue"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800/80 transition-colors text-xs flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={() => setQueueOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Now Playing */}
          {currentSong ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                  Now Playing
                </span>
                <AudioVisualizer isPlaying={isPlaying} bars={3} size="sm" />
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-900 border border-emerald-500/20 shadow-md">
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-neutral-100 truncate">
                    {currentSong.title}
                  </h4>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {currentSong.artist}
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-400 pr-1">
                  {currentSong.duration}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <Music2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No track currently playing</p>
            </div>
          )}

          {/* Up Next in User Queue */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs uppercase font-bold tracking-wider text-neutral-400">
                Next In Queue ({upcomingQueue.length})
              </span>
            </div>

            {upcomingQueue.length === 0 ? (
              <div className="py-4 px-3 rounded-xl bg-neutral-900/40 border border-dashed border-neutral-800 text-center">
                <p className="text-xs text-neutral-500">
                  Your manual queue is empty.
                </p>
                <p className="text-[11px] text-neutral-600 mt-1">
                  MusicHolic will automatically play smart suggestions below.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {upcomingQueue.map((song, idx) => {
                  const actualIndex = queueIndex + 1 + idx;
                  return (
                    <div
                      key={`${song.id}-${idx}`}
                      className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-neutral-900 transition-colors"
                    >
                      <button
                        onClick={() => playSong(song, queue, actualIndex)}
                        className="w-10 h-10 rounded-lg overflow-hidden relative flex-shrink-0 bg-neutral-800"
                      >
                        <img
                          src={song.thumbnail}
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-3.5 h-3.5 text-white fill-current" />
                        </div>
                      </button>

                      <div
                        onClick={() => playSong(song, queue, actualIndex)}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <h5 className="text-xs font-medium text-neutral-200 truncate group-hover:text-emerald-400 transition-colors">
                          {song.title}
                        </h5>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {song.artist}
                        </p>
                      </div>

                      <span className="text-[11px] font-mono text-neutral-500">
                        {song.duration}
                      </span>

                      <button
                        onClick={() => removeFromQueue(actualIndex)}
                        title="Remove from queue"
                        className="p-1 rounded-md text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Smart Autoplay & Suggestions */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs uppercase font-bold tracking-wider text-neutral-300">
                Next Suggested Tracks
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mb-3">
              Intelligently curated based on your current vibe & artist
            </p>

            {isLoadingSuggestions ? (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-12 rounded-xl bg-neutral-900/60 animate-pulse"
                  />
                ))}
              </div>
            ) : suggestedQueue.length === 0 ? (
              <p className="text-xs text-neutral-500 italic py-2">
                Play a song to load recommended next tracks.
              </p>
            ) : (
              <div className="space-y-1.5">
                {suggestedQueue.map((song) => (
                  <div
                    key={song.id}
                    className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-neutral-900/80 transition-colors border border-transparent hover:border-neutral-800"
                  >
                    <button
                      onClick={() => playSong(song)}
                      className="w-10 h-10 rounded-lg overflow-hidden relative flex-shrink-0 bg-neutral-800"
                    >
                      <img
                        src={song.thumbnail}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-3.5 h-3.5 text-white fill-current" />
                      </div>
                    </button>

                    <div
                      onClick={() => playSong(song)}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <h5 className="text-xs font-medium text-neutral-200 truncate group-hover:text-emerald-400 transition-colors">
                        {song.title}
                      </h5>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {song.artist}
                      </p>
                    </div>

                    <button
                      onClick={() => addToQueue(song)}
                      title="Add to up next"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

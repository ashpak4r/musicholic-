import React, { useState } from 'react';
import { Heart, Clock, Play, Shuffle, Sparkles, ShieldCheck, UserPlus, Cloud } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { useAuth } from '../../context/AuthContext';
import { SongRow } from '../cards/SongRow';

interface LibraryViewProps {
  onDiscoverClick: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onDiscoverClick }) => {
  const { likedSongs, recentlyPlayed, playSong } = useMusicPlayer();
  const { user, isAuthenticated, setAuthModalOpen, setAuthModalTab } = useAuth();
  const [activeTab, setActiveTab] = useState<'liked' | 'recent'>('liked');

  const currentList = activeTab === 'liked' ? likedSongs : recentlyPlayed;

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Your Library
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Manage your saved songs and listening history
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-2xl border border-neutral-800">
          <button
            onClick={() => setActiveTab('liked')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'liked'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Liked Songs ({likedSongs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'recent'
                ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>History ({recentlyPlayed.length})</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {isAuthenticated && user ? (
        <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              Connected to <strong>{user.email}</strong> • Listening history and liked tracks synced to your account.
            </span>
          </div>
          <span className="hidden sm:inline-block font-mono text-[10px] text-emerald-400/80 uppercase">
            Active
          </span>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-neutral-300">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              Currently storing library on this browser. Create an account to sync across all your devices.
            </span>
          </div>
          <button
            onClick={() => {
              setAuthModalTab('register');
              setAuthModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all whitespace-nowrap"
          >
            Sign Up to Sync
          </button>
        </div>
      )}

      {/* Action Bar (if has songs) */}
      {currentList.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => playSong(currentList[0], currentList, 0)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            <span>Play All</span>
          </button>

          <button
            onClick={() => {
              const randIdx = Math.floor(Math.random() * currentList.length);
              playSong(currentList[randIdx], currentList, randIdx);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-200 font-semibold text-xs border border-neutral-800 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>
        </div>
      )}

      {/* Song List Content */}
      {currentList.length === 0 ? (
        <div className="text-center py-20 bg-neutral-900/40 rounded-3xl border border-dashed border-neutral-800/80 p-8 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-neutral-800/60 flex items-center justify-center mx-auto text-neutral-500">
            {activeTab === 'liked' ? (
              <Heart className="w-8 h-8 text-rose-500/50" />
            ) : (
              <Clock className="w-8 h-8 text-emerald-500/50" />
            )}
          </div>

          <h3 className="text-lg font-bold text-neutral-200">
            {activeTab === 'liked'
              ? 'No liked songs yet'
              : 'No listening history yet'}
          </h3>

          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {activeTab === 'liked'
              ? 'Tap the heart icon on any song to save it here for quick listening anytime.'
              : 'Songs you play will automatically appear here so you can easily return to them.'}
          </p>

          <button
            onClick={onDiscoverClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discover Trending Music</span>
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {currentList.map((song, idx) => (
            <SongRow
              key={`${activeTab}-${song.id}-${idx}`}
              song={song}
              index={idx}
              playlistContext={currentList}
            />
          ))}
        </div>
      )}
    </div>
  );
};

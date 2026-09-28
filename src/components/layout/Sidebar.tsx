import React from 'react';
import {
  Home,
  Search,
  Library,
  Heart,
  Clock,
  Flame,
  Radio,
  Sparkles,
  Keyboard,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface SidebarProps {
  currentTab: 'home' | 'search' | 'library';
  setCurrentTab: (tab: 'home' | 'search' | 'library') => void;
  onSelectCategory?: (category: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onSelectCategory,
}) => {
  const { likedSongs, recentlyPlayed } = useMusicPlayer();

  return (
    <aside className="hidden lg:flex w-64 flex-col justify-between bg-[#0c0c0f] border-r border-neutral-800/80 p-5 flex-shrink-0 select-none">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-3">
            Menu
          </span>
          <nav className="mt-2 space-y-1">
            <button
              onClick={() => setCurrentTab('home')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'home'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Discover Home</span>
            </button>

            <button
              onClick={() => setCurrentTab('search')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'search'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Search className="w-5 h-5" />
              <span>Search Music</span>
            </button>

            <button
              onClick={() => setCurrentTab('library')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'library'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Library className="w-5 h-5" />
              <span>Your Library</span>
            </button>
          </nav>
        </div>

        {/* Your Collections */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-3">
            My Music
          </span>
          <div className="mt-2 space-y-1">
            <button
              onClick={() => setCurrentTab('library')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-105 transition-transform">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                </div>
                <span>Liked Songs</span>
              </div>
              <span className="text-xs font-mono text-neutral-500 group-hover:text-neutral-400">
                {likedSongs.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('library')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span>Recently Played</span>
              </div>
              <span className="text-xs font-mono text-neutral-500 group-hover:text-neutral-400">
                {recentlyPlayed.length}
              </span>
            </button>
          </div>
        </div>

        {/* Hot Genres & Vibes */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-3">
            Trending Genres
          </span>
          <div className="mt-2 space-y-1">
            {[
              { id: 'pop', name: 'Pop Hits', icon: Sparkles },
              { id: 'hiphop', name: 'Hip-Hop / Rap', icon: Flame },
              { id: 'lofi', name: 'Chill Lofi Beats', icon: Radio },
              { id: 'rnb', name: 'R&B & Soul', icon: Heart },
              { id: 'rock', name: 'Rock & Alt', icon: Flame },
            ].map((genre) => {
              const Icon = genre.icon;
              return (
                <button
                  key={genre.id}
                  onClick={() => {
                    setCurrentTab('home');
                    if (onSelectCategory) onSelectCategory(genre.id);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors"
                >
                  <Icon className="w-4 h-4 text-neutral-500" />
                  <span>{genre.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer & Shortcut Info */}
      <div className="pt-4 border-t border-neutral-850">
        <div className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 text-[11px] text-neutral-400 space-y-1.5">
          <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
            <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Shortcuts</span>
          </div>
          <div className="flex justify-between">
            <span>Play / Pause</span>
            <kbd className="px-1 py-0.5 rounded bg-neutral-800 font-mono text-[10px]">
              Space
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Next / Prev</span>
            <kbd className="px-1 py-0.5 rounded bg-neutral-800 font-mono text-[10px]">
              N / P
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Mute</span>
            <kbd className="px-1 py-0.5 rounded bg-neutral-800 font-mono text-[10px]">
              M
            </kbd>
          </div>
        </div>

        <p className="text-[11px] text-neutral-600 text-center mt-3 font-medium">
          MusicHolic • Crafted with precision
        </p>
      </div>
    </aside>
  );
};

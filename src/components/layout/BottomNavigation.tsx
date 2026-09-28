import React from 'react';
import { Home, Search, Library, ListMusic } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface BottomNavigationProps {
  currentTab: 'home' | 'search' | 'library';
  setCurrentTab: (tab: 'home' | 'search' | 'library') => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  setCurrentTab,
}) => {
  const { queueOpen, setQueueOpen, queue, queueIndex } = useMusicPlayer();
  const upcomingCount = Math.max(0, queue.length - 1 - queueIndex);

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[#09090b]/95 backdrop-blur-xl border-t border-neutral-800/80 px-2 py-2 flex items-center justify-around">
      <button
        onClick={() => setCurrentTab('home')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
          currentTab === 'home'
            ? 'text-emerald-400 font-bold'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px]">Home</span>
      </button>

      <button
        onClick={() => setCurrentTab('search')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
          currentTab === 'search'
            ? 'text-emerald-400 font-bold'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px]">Search</span>
      </button>

      <button
        onClick={() => setCurrentTab('library')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
          currentTab === 'library'
            ? 'text-emerald-400 font-bold'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Library className="w-5 h-5" />
        <span className="text-[10px]">Library</span>
      </button>

      <button
        onClick={() => setQueueOpen(!queueOpen)}
        className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
          queueOpen
            ? 'text-emerald-400 font-bold'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <ListMusic className="w-5 h-5" />
        {upcomingCount > 0 && (
          <span className="absolute top-0 right-3 px-1 rounded-full bg-emerald-500 text-[9px] font-bold text-black min-w-3.5 text-center">
            {upcomingCount}
          </span>
        )}
        <span className="text-[10px]">Queue</span>
      </button>
    </nav>
  );
};

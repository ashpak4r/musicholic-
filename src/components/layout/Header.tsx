import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Music4,
  History,
  TrendingUp,
  Sparkles,
  ArrowRight,
  User,
  LogOut,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  currentTab: 'home' | 'search' | 'library';
  setCurrentTab: (tab: 'home' | 'search' | 'library') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onExecuteSearch: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  searchQuery,
  setSearchQuery,
  onExecuteSearch,
}) => {
  const { searchHistory, addSearchHistory, removeSearchHistory, likedSongs, recentlyPlayed } =
    useMusicPlayer();
  const { user, isAuthenticated, logout, setAuthModalOpen, setAuthModalTab } = useAuth();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete fetch
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/suggest?q=${encodeURIComponent(searchQuery)}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.suggestions) {
            setSuggestions(data.suggestions);
          }
        }
      } catch (err) {
        console.error('Suggest error:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCurrentTab('search');
        searchInputRef.current?.focus();
        setShowDropdown(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    addSearchHistory(searchQuery);
    setShowDropdown(false);
    setCurrentTab('search');
    onExecuteSearch(searchQuery);
  };

  const handleSelectSuggestion = (s: string) => {
    setSearchQuery(s);
    addSearchHistory(s);
    setShowDropdown(false);
    setCurrentTab('search');
    onExecuteSearch(s);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#09090b]/85 backdrop-blur-xl border-b border-neutral-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Brand Logo */}
      <div
        onClick={() => setCurrentTab('home')}
        className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
          <div className="w-full h-full bg-[#09090b] rounded-[14px] flex items-center justify-center">
            <Music4 className="w-5 h-5 text-emerald-400 group-hover:rotate-6 transition-transform" />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
              Music<span className="text-emerald-400">Holic</span>
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              PRO
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 font-medium -mt-0.5">
            by Ashpak
          </p>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="relative flex-1 max-w-xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search songs, artists, albums, or vibes..."
              className="w-full pl-10 pr-20 py-2 sm:py-2.5 rounded-full bg-neutral-900/90 border border-neutral-800 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                }}
                className="absolute right-10 p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 absolute right-3 px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-500 bg-neutral-800 border border-neutral-700/60">
              ⌘K
            </kbd>
          </div>
        </form>

        {/* Search Suggestions & History Dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 bg-[#0e0e12] border border-neutral-800 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden backdrop-blur-xl"
          >
            {/* Live Autocomplete suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-2">
                <div className="px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>Suggestions</span>
                </div>
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSuggestion(s)}
                    className="flex items-center justify-between px-4 py-2 hover:bg-neutral-850 hover:bg-neutral-800/60 cursor-pointer text-sm text-neutral-200 hover:text-emerald-400 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Search className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{s}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
                  </div>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {searchHistory.length > 0 && (
              <div>
                <div className="px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3 h-3" />
                    <span>Recent Searches</span>
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {searchHistory.slice(0, 6).map((item, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center justify-between px-4 py-2 hover:bg-neutral-800/60 cursor-pointer text-sm text-neutral-300 transition-colors"
                    >
                      <div
                        onClick={() => handleSelectSuggestion(item)}
                        className="flex-1 flex items-center gap-2.5"
                      >
                        <History className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="group-hover:text-white">{item}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSearchHistory(item);
                        }}
                        className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            {!searchQuery && (
              <div className="pt-2 border-t border-neutral-800/60">
                <div className="px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span>Popular Trending Searches</span>
                </div>
                <div className="flex flex-wrap gap-1.5 px-4 py-2">
                  {[
                    'Husn Anuv Jain',
                    'The Weeknd',
                    'Taylor Swift',
                    'Billie Eilish',
                    'Coldplay',
                    'Kendrick Lamar',
                    'Bruno Mars',
                    'Dua Lipa',
                    'Lofi Chill',
                  ].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleSelectSuggestion(tag)}
                      className="px-2.5 py-1 rounded-full text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-emerald-400 border border-neutral-800 hover:border-emerald-500/30 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Desktop Nav Links & User Authentication */}
      <div className="flex items-center gap-2">
        <nav className="hidden md:flex items-center gap-1.5 mr-2">
          <button
            onClick={() => setCurrentTab('home')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
              currentTab === 'home'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setCurrentTab('search')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
              currentTab === 'search'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setCurrentTab('library')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
              currentTab === 'library'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Your Library
          </button>
        </nav>

        {/* User Account / Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          {isAuthenticated && user ? (
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-all"
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-emerald-500/30 object-cover"
              />
              <span className="hidden sm:inline text-xs font-semibold text-neutral-200 max-w-[100px] truncate">
                {user.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
            </button>
          ) : (
            <button
              onClick={() => {
                setAuthModalTab('login');
                setAuthModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* User Profile Dropdown */}
          {showUserMenu && isAuthenticated && user && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0e0e12] border border-neutral-800 p-2 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in duration-150">
              <div className="px-3 py-2 border-b border-neutral-800/80">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5">{user.email}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Cloud Sync Active</span>
                </div>
              </div>

              <div className="py-1 text-xs text-neutral-400 space-y-1">
                <div className="px-3 py-1.5 flex justify-between">
                  <span>Liked Tracks</span>
                  <span className="font-mono text-neutral-200">{likedSongs.length}</span>
                </div>
                <div className="px-3 py-1.5 flex justify-between">
                  <span>History</span>
                  <span className="font-mono text-neutral-200">{recentlyPlayed.length}</span>
                </div>
              </div>

              <div className="pt-1 border-t border-neutral-800/80">
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

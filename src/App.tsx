import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { MusicPlayerProvider } from './context/MusicPlayerContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { BottomPlayer } from './components/player/BottomPlayer';
import { QueueDrawer } from './components/player/QueueDrawer';
import { LyricsModal } from './components/player/LyricsModal';
import { ExpandedPlayerModal } from './components/player/ExpandedPlayerModal';
import { StudioEQModal } from './components/player/StudioEQModal';
import { YouTubeEmbedContainer } from './components/player/YouTubeEmbedContainer';
import { AuthModal } from './components/auth/AuthModal';
import { HomeView } from './components/views/HomeView';
import { SearchView } from './components/views/SearchView';
import { LibraryView } from './components/views/LibraryView';
import { Song } from './types/music';

function MusicHolicApp() {
  const [currentTab, setCurrentTab] = useState<'home' | 'search' | 'library'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('india');

  const handleExecuteSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCategoryFromSidebar = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentTab('home');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onExecuteSearch={handleExecuteSearch}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onSelectCategory={handleSelectCategoryFromSidebar}
        />

        {/* Scrollable Center Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 h-[calc(100vh-65px)]">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'home' && (
              <HomeView
                onSearchGenre={(genre) => {
                  setSearchQuery(genre);
                  setCurrentTab('search');
                  handleExecuteSearch(genre);
                }}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
              />
            )}

            {currentTab === 'search' && (
              <SearchView
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                isSearching={isSearching}
                onExecuteSearch={handleExecuteSearch}
              />
            )}

            {currentTab === 'library' && (
              <LibraryView onDiscoverClick={() => setCurrentTab('home')} />
            )}
          </div>
        </main>
      </div>

      {/* Background YouTube Audio / Video Embed Container */}
      <YouTubeEmbedContainer />

      {/* Bottom Fixed Music Player */}
      <BottomPlayer />

      {/* Mobile Bottom Navigation */}
      <BottomNavigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      {/* Queue Drawer Slide-over */}
      <QueueDrawer />

      {/* Synced Karaoke Lyrics Modal */}
      <LyricsModal />

      {/* Expanded Fullscreen Player Modal */}
      <ExpandedPlayerModal />

      {/* Studio Equalizer & Hi-Res Audio Modal */}
      <StudioEQModal />

      {/* User Authentication Modal */}
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MusicPlayerProvider>
        <MusicHolicApp />
      </MusicPlayerProvider>
    </AuthProvider>
  );
}

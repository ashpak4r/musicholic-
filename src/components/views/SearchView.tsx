import React, { useState, useEffect } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Sparkles,
  Music2,
  TrendingUp,
  History,
  X,
  Radio,
  Play,
  Filter,
} from 'lucide-react';
import { Song } from '../../types/music';
import { SongCard } from '../cards/SongCard';
import { SongRow } from '../cards/SongRow';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface SearchViewProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: Song[];
  isSearching: boolean;
  onExecuteSearch: (q: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  onExecuteSearch,
}) => {
  const { searchHistory, addSearchHistory, removeSearchHistory, playSong } =
    useMusicPlayer();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'songs' | 'artists'>('all');
  const [relatedSuggestions, setRelatedSuggestions] = useState<Song[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  // When search results update, fetch smart related recommendations for the next tracks
  useEffect(() => {
    if (searchResults.length > 0) {
      const topResult = searchResults[0];
      setIsLoadingRelated(true);
      fetch(
        `/api/related?id=${encodeURIComponent(topResult.id)}&title=${encodeURIComponent(
          topResult.title,
        )}&artist=${encodeURIComponent(topResult.artist)}`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.results) {
            setRelatedSuggestions(data.results.slice(0, 10));
          }
        })
        .catch((e) => console.error(e))
        .finally(() => setIsLoadingRelated(false));
    } else {
      setRelatedSuggestions([]);
    }
  }, [searchResults]);

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    addSearchHistory(tag);
    onExecuteSearch(tag);
  };

  const filteredResults = searchResults.filter((song) => {
    if (filterType === 'all') return true;
    if (filterType === 'songs') return song.durationSeconds < 600; // Standard songs
    if (filterType === 'artists') return song.title.toLowerCase().includes(song.artist.toLowerCase());
    return true;
  });

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-300">
      {/* Search Input Bar (in view) */}
      <div className="max-w-2xl">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-4">
          Search MusicHolic
        </h2>
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                addSearchHistory(searchQuery);
                onExecuteSearch(searchQuery);
              }
            }}
            placeholder="Search by song title, singer, band, or genre..."
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-base text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 shadow-xl transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
              }}
              className="absolute right-4 p-1 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* If No Query Yet: Show Recent Searches & Popular Suggestions */}
      {!searchQuery && searchResults.length === 0 && (
        <div className="space-y-8">
          {/* User's Searched Songs / History */}
          {searchHistory.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm uppercase font-bold tracking-wider text-neutral-400">
                  Your Recent Searches
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-sm text-neutral-200 border border-neutral-800 hover:border-neutral-700 transition-colors group cursor-pointer"
                  >
                    <span onClick={() => handleTagClick(item)}>{item}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSearchHistory(item);
                      }}
                      className="text-neutral-500 hover:text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Popular Trending Searches */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm uppercase font-bold tracking-wider text-neutral-400">
                Popular Searches
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { title: 'The Weeknd', vibe: 'R&B / Synthpop', color: 'from-amber-600/30' },
                { title: 'Taylor Swift', vibe: 'Pop / Acoustic', color: 'from-sky-600/30' },
                { title: 'Billie Eilish', vibe: 'Dark Pop / Alt', color: 'from-emerald-600/30' },
                { title: 'Coldplay', vibe: 'Stadium Rock / Britpop', color: 'from-purple-600/30' },
                { title: 'Kendrick Lamar', vibe: 'Hip-Hop / West Coast', color: 'from-red-600/30' },
                { title: 'Bruno Mars', vibe: 'Funk / Pop / Soul', color: 'from-orange-600/30' },
                { title: 'Dua Lipa', vibe: 'Disco Pop / Dance', color: 'from-pink-600/30' },
                { title: 'Lofi Chill Beats', vibe: 'Study / Relax / Sleep', color: 'from-teal-600/30' },
              ].map((item) => (
                <div
                  key={item.title}
                  onClick={() => handleTagClick(item.title)}
                  className={`p-4 rounded-2xl bg-gradient-to-br ${item.color} to-neutral-900 border border-neutral-800/80 hover:border-emerald-500/40 cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-lg`}
                >
                  <h4 className="font-bold text-white text-base leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">{item.vibe}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Loading Indicator */}
      {isSearching && (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 text-neutral-400">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Searching MusicHolic catalog...</p>
        </div>
      )}

      {/* Search Results */}
      {!isSearching && searchResults.length > 0 && (
        <div className="space-y-8">
          {/* Controls Bar: Filters & View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
            <div className="flex items-center gap-1.5">
              {(['all', 'songs', 'artists'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    filterType === type
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">
                {filteredResults.length} tracks found
              </span>
              <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-neutral-800 text-emerald-400'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="List View"
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-neutral-800 text-emerald-400'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results Grid or List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredResults.map((song, idx) => (
                <SongCard
                  key={song.id}
                  song={song}
                  index={idx}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredResults.map((song, idx) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={idx}
                />
              ))}
            </div>
          )}

          {/* Related / Suggested Songs Section below search results */}
          {relatedSuggestions.length > 0 && (
            <section className="pt-8 border-t border-neutral-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Suggested & Next Track Recommendations
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Relevant songs inspired by your search
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => playSong(relatedSuggestions[0], relatedSuggestions, 0)}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Mix</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {relatedSuggestions.map((song, idx) => (
                  <SongCard
                    key={`related-${song.id}-${idx}`}
                    song={song}
                    playlistContext={relatedSuggestions}
                    index={idx}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* No Results Found */}
      {!isSearching && searchQuery && searchResults.length === 0 && (
        <div className="text-center py-16 text-neutral-500 space-y-3">
          <Music2 className="w-12 h-12 mx-auto opacity-30" />
          <h4 className="text-lg font-semibold text-neutral-300">
            No results found for &ldquo;{searchQuery}&rdquo;
          </h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Try checking for spelling errors, searching by artist name, or explore trending genres.
          </p>
        </div>
      )}
    </div>
  );
};

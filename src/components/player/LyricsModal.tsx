import React, { useMemo, useEffect, useRef } from 'react';
import { X, Mic2, RefreshCw } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { SyncedLyricLine } from '../../types/music';

// Parse LRC formatted lyrics: "[01:23.45] Lyric text"
function parseLrc(lrcString: string): SyncedLyricLine[] {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const result: SyncedLyricLine[] = [];

  const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{2,3})?\]/g;

  for (const line of lines) {
    timeRegex.lastIndex = 0;
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millis = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const totalSeconds = minutes * 60 + seconds + millis / 1000;
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        result.push({ time: totalSeconds, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export const LyricsModal: React.FC = () => {
  const {
    lyricsOpen,
    setLyricsOpen,
    currentSong,
    currentTime,
    lyricsData,
    isLoadingLyrics,
    fetchLyrics,
  } = useMusicPlayer();

  const activeLineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedSyncedLyrics = useMemo(() => {
    if (lyricsData?.syncedLyrics) {
      return parseLrc(lyricsData.syncedLyrics);
    }
    return [];
  }, [lyricsData]);

  // Find index of current line
  const activeLineIndex = useMemo(() => {
    if (parsedSyncedLyrics.length === 0) return -1;
    let activeIdx = -1;
    for (let i = 0; i < parsedSyncedLyrics.length; i++) {
      if (currentTime >= parsedSyncedLyrics[i].time - 0.3) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }, [parsedSyncedLyrics, currentTime]);

  // Auto-scroll active line to center
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex]);

  if (!lyricsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl h-[85vh] max-h-[700px] bg-gradient-to-b from-neutral-900 to-[#0a0a0c] border border-neutral-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Mic2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-100">
                {currentSong ? currentSong.title : 'Lyrics'}
              </h3>
              <p className="text-xs text-neutral-400">
                {currentSong ? currentSong.artist : 'MusicHolic Sing-Along'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentSong && (
              <button
                onClick={() => fetchLyrics(currentSong)}
                disabled={isLoadingLyrics}
                title="Reload Lyrics"
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoadingLyrics ? 'animate-spin' : ''}`}
                />
              </button>
            )}
            <button
              onClick={() => setLyricsOpen(false)}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lyrics Body */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-6 py-12 text-center select-text"
        >
          {isLoadingLyrics ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-neutral-400">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm font-medium">Fetching synced lyrics...</p>
            </div>
          ) : !lyricsData?.found || (!lyricsData.syncedLyrics && !lyricsData.plainLyrics) ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3 text-neutral-500">
              <Mic2 className="w-12 h-12 stroke-[1.5] opacity-40 text-neutral-400" />
              <p className="text-base font-medium text-neutral-300">
                Lyrics not found for this track
              </p>
              <p className="text-xs text-neutral-500 max-w-xs">
                Enjoy the rhythm and beat! You can also check alternative song titles or official videos.
              </p>
            </div>
          ) : parsedSyncedLyrics.length > 0 ? (
            /* Synced Karaoke Style Lyrics */
            <div className="space-y-6 max-w-lg mx-auto py-8">
              {parsedSyncedLyrics.map((line, idx) => {
                const isActive = idx === activeLineIndex;
                const isPast = idx < activeLineIndex;
                return (
                  <div
                    key={idx}
                    ref={isActive ? activeLineRef : null}
                    className={`transition-all duration-300 font-medium ${
                      isActive
                        ? 'text-2xl sm:text-3xl text-emerald-300 font-bold scale-105 drop-shadow-[0_0_16px_rgba(16,185,129,0.35)]'
                        : isPast
                        ? 'text-base sm:text-lg text-neutral-500 hover:text-neutral-300 cursor-pointer'
                        : 'text-base sm:text-lg text-neutral-400 opacity-60 hover:opacity-90'
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Plain Text Lyrics */
            <div className="max-w-md mx-auto whitespace-pre-line text-base text-neutral-300 leading-relaxed font-normal py-6">
              {lyricsData.plainLyrics}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { X, Minimize2, Video } from 'lucide-react';

export const YouTubeEmbedContainer: React.FC = () => {
  const { videoMode, setVideoMode, currentSong } = useMusicPlayer();

  // If video mode is enabled, show as a sleek floating Picture-in-Picture window
  // If video mode is disabled, keep off-screen with standard dimensions so the YouTube player audio continues uninterrupted without triggering 1x1 embed restrictions
  return (
    <div
      className={`fixed transition-all duration-300 z-50 ${
        videoMode && currentSong
          ? 'bottom-28 right-6 w-80 sm:w-96 aspect-video bg-black rounded-2xl shadow-2xl ring-1 ring-neutral-700/80 overflow-hidden'
          : 'fixed -left-[9999px] top-0 w-80 sm:w-96 aspect-video pointer-events-none opacity-100 z-0'
      }`}
    >
      {videoMode && currentSong && (
        <div className="absolute top-0 inset-x-0 h-9 bg-gradient-to-b from-black/90 to-transparent z-10 flex items-center justify-between px-3 text-white">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Video className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate max-w-[200px]">{currentSong.title}</span>
          </div>
          <button
            onClick={() => setVideoMode(false)}
            title="Minimize Video"
            className="p-1 rounded-md hover:bg-white/20 transition-colors text-neutral-300 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* The YouTube iframe binds to this element */}
      <div id="youtube-player-mount" className="w-full h-full" />
    </div>
  );
};

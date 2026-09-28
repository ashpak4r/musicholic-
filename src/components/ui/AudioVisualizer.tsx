import React from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  bars?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  bars = 4,
  size = 'md',
}) => {
  const heightClasses = {
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-6',
  };

  const widthClasses = {
    sm: 'w-0.5',
    md: 'w-1',
    lg: 'w-1.5',
  };

  const animationDelays = ['0ms', '200ms', '400ms', '150ms', '300ms', '100ms'];

  return (
    <div className={`flex items-end gap-1 ${heightClasses[size]}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`${widthClasses[size]} rounded-full bg-emerald-400 transition-all duration-300 ${
            isPlaying ? 'animate-pulse' : 'h-1 opacity-50'
          }`}
          style={{
            height: isPlaying
              ? `${Math.max(25, (Math.sin(i * 1.5) * 0.5 + 0.5) * 100)}%`
              : '25%',
            animationDuration: isPlaying ? `${0.6 + (i % 3) * 0.25}s` : '0s',
            animationDelay: animationDelays[i % animationDelays.length],
          }}
        />
      ))}
    </div>
  );
};

import React, { useState } from 'react';
import { Sparkles, Info, ShieldCheck, Sliders } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { AUDIO_TIERS } from '../../utils/audioEqualizer';

export const AudioQualityBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { audioTier, setEqModalOpen, eqSettings } = useMusicPlayer();
  const [showInfo, setShowInfo] = useState(false);

  const config = AUDIO_TIERS[audioTier] || AUDIO_TIERS['hi-res-flac'];

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowInfo(!showInfo)}
        title="Audio Quality Stream Details & Studio EQ"
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all border ${
          config.isLossless
            ? 'text-[10px] bg-gradient-to-r from-amber-500/15 to-emerald-500/15 text-amber-300 border-amber-500/40 hover:border-amber-400 shadow-sm'
            : compact
            ? 'text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
            : 'text-xs bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-emerald-500/40 hover:text-white'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            config.isLossless ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
        />
        <span className="font-mono font-bold tracking-tight">
          {compact
            ? config.isLossless
              ? 'FLAC 96k'
              : config.badge
            : `${config.badge} • ${config.bitDepth.split(' ')[0]}`}
        </span>
        {eqSettings.enabled && (
          <span className="w-1 h-1 rounded-full bg-emerald-400" title="Studio EQ Active" />
        )}
        <Info className="w-3 h-3 text-neutral-400" />
      </button>

      {/* Technical Spec Popover */}
      {showInfo && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowInfo(false)}
          />
          <div className="absolute bottom-full right-0 sm:left-0 sm:right-auto mb-2 w-72 p-3.5 rounded-2xl bg-[#0e0e12] border border-neutral-800 text-neutral-200 text-xs shadow-2xl z-50 backdrop-blur-xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{config.name}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  config.isLossless
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {config.isLossless ? '24-BIT FLAC' : 'VERIFIED'}
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
              {config.description}
            </p>

            <div className="space-y-1.5 font-mono text-[11px] bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800 mb-3">
              <div className="flex justify-between">
                <span className="text-neutral-500">Resolution:</span>
                <span className="text-neutral-200 font-semibold">{config.bitDepth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Bitrate:</span>
                <span className="text-emerald-400 font-semibold">{config.bitrate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Audio Codec:</span>
                <span className="text-neutral-200">{config.codec}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Dynamic Range:</span>
                <span className="text-emerald-400">{config.dynamicRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Studio EQ:</span>
                <span className={eqSettings.enabled ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
                  {eqSettings.enabled ? `${eqSettings.preset} (Active)` : 'Bypassed'}
                </span>
              </div>
            </div>

            {/* Direct Open Studio EQ Button */}
            <button
              onClick={() => {
                setShowInfo(false);
                setEqModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Configure Studio EQ & FLAC</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

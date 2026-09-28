import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  X,
  RotateCcw,
  Volume2,
  Waves,
  Disc3,
  Check,
  ShieldCheck,
  Zap,
  Radio,
  Headphones,
  SlidersHorizontal,
} from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import {
  EQ_FREQUENCIES,
  EQ_FREQ_LABELS,
  EQ_PRESETS,
  AUDIO_TIERS,
  generateEQCurvePath,
} from '../../utils/audioEqualizer';
import { EQPresetName, AudioQualityTier } from '../../types/music';

export const StudioEQModal: React.FC = () => {
  const {
    eqModalOpen,
    setEqModalOpen,
    eqSettings,
    setEQBand,
    setEQPreset,
    setPreamp,
    toggleEQ,
    setEQSettings,
    audioTier,
    setAudioTier,
  } = useMusicPlayer();

  const [activeTab, setActiveTab] = useState<'eq' | 'quality'>('eq');

  if (!eqModalOpen) return null;

  const currentTierConfig = AUDIO_TIERS[audioTier];
  const { path: curvePath, fillPath: curveFillPath } = generateEQCurvePath(
    eqSettings.bands,
    eqSettings.preamp,
    420,
    110,
  );

  const presetsList: EQPresetName[] = [
    'Master Tape',
    'Bass Boost',
    'Vocal Clarity',
    'Flat / Studio Ref',
    'Treble Air',
    'Electronic',
    'Acoustic',
    'Rock / Metal',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => setEqModalOpen(false)}
      />

      <div className="relative z-10 w-full max-w-2xl bg-[#0c0c10] border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/80 bg-neutral-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base tracking-tight">Studio Equalizer</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Pro DSP
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                10-Band Parametric EQ & High-Resolution FLAC Pipeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* EQ Master Bypass Switch */}
            <button
              onClick={toggleEQ}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                eqSettings.enabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/10'
                  : 'bg-neutral-900 border-neutral-700/60 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  eqSettings.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
                }`}
              />
              <span>{eqSettings.enabled ? 'EQ Active' : 'EQ Bypass'}</span>
            </button>

            <button
              onClick={() => setEqModalOpen(false)}
              className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              aria-label="Close Equalizer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Equalizer vs Hi-Res Audio Tiers */}
        <div className="flex border-b border-neutral-800 px-5 bg-neutral-950/60">
          <button
            onClick={() => setActiveTab('eq')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'eq'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>10-Band Studio EQ</span>
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'quality'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Disc3 className="w-4 h-4 text-emerald-400" />
            <span>Hi-Res Audio & FLAC Mode</span>
            {audioTier === 'hi-res-flac' && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                LOSSLESS
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'eq' && (
            <>
              {/* Presets Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Acoustic Presets</span>
                  </span>
                  {eqSettings.preset !== 'Flat / Studio Ref' && (
                    <button
                      onClick={() => setEQPreset('Flat / Studio Ref')}
                      className="text-[11px] text-neutral-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Flat</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {presetsList.map((preset) => {
                    const isSelected = eqSettings.preset === preset;
                    return (
                      <button
                        key={preset}
                        onClick={() => setEQPreset(preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                            : 'bg-neutral-900/80 text-neutral-400 border border-neutral-800/80 hover:bg-neutral-800 hover:text-neutral-200'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Frequency Response Curve Graph */}
              <div className="relative rounded-2xl bg-[#08080b] border border-neutral-800/90 p-3 overflow-hidden shadow-inner">
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 mb-1 px-1">
                  <span>+12 dB</span>
                  <span className="text-emerald-400/80 font-semibold">
                    {eqSettings.enabled ? `${eqSettings.preset} Curve` : 'Flat (Bypassed)'}
                  </span>
                  <span>-12 dB</span>
                </div>

                <div className="relative w-full h-24">
                  {/* Grid Lines */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-neutral-800/60 dashed" />
                  <div className="absolute inset-x-0 top-2 border-b border-neutral-900/50" />
                  <div className="absolute inset-x-0 bottom-2 border-b border-neutral-900/50" />

                  <svg
                    viewBox="0 0 420 110"
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                  >
                    <defs>
                      <linearGradient id="eqGlowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="eqStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="50%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>

                    {/* Gradient area fill */}
                    {curveFillPath && (
                      <path
                        d={curveFillPath}
                        fill="url(#eqGlowGradient)"
                        className="transition-all duration-150"
                      />
                    )}

                    {/* Curve line */}
                    {curvePath && (
                      <path
                        d={curvePath}
                        fill="none"
                        stroke="url(#eqStrokeGradient)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-150 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      />
                    )}
                  </svg>
                </div>
              </div>

              {/* 10-Band Graphic Fader Section */}
              <div className="rounded-2xl bg-neutral-900/50 border border-neutral-800/80 p-4">
                <div className="grid grid-cols-10 gap-1.5 sm:gap-2 items-center">
                  {EQ_FREQUENCIES.map((freq, idx) => {
                    const gain = eqSettings.bands[idx] || 0;
                    return (
                      <div
                        key={freq}
                        className="flex flex-col items-center gap-2"
                      >
                        {/* Gain dB Indicator */}
                        <span
                          className={`text-[10px] font-mono font-bold transition-colors ${
                            gain > 0
                              ? 'text-emerald-400'
                              : gain < 0
                              ? 'text-amber-400'
                              : 'text-neutral-500'
                          }`}
                        >
                          {gain > 0 ? `+${gain}` : gain}
                        </span>

                        {/* Vertical Slider */}
                        <div className="relative h-32 flex items-center justify-center">
                          <input
                            type="range"
                            min="-12"
                            max="12"
                            step="1"
                            value={gain}
                            disabled={!eqSettings.enabled}
                            onChange={(e) => setEQBand(idx, Number(e.target.value))}
                            className="h-28 w-2 appearance-none bg-neutral-800 rounded-full cursor-pointer accent-emerald-400 focus:outline-none transition-all [writing-mode:vertical-lr] [direction:rtl] disabled:opacity-40"
                            aria-label={`Frequency ${EQ_FREQ_LABELS[idx]}`}
                          />
                        </div>

                        {/* Frequency Label */}
                        <span className="text-[10px] font-mono text-neutral-400 text-center tracking-tighter truncate w-full">
                          {EQ_FREQ_LABELS[idx]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preamp Gain & Studio Enhancements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Preamp Control */}
                <div className="p-3.5 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Preamp Gain</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {eqSettings.preamp > 0 ? `+${eqSettings.preamp} dB` : `${eqSettings.preamp} dB`}
                      </span>
                      {eqSettings.preamp !== 0 && (
                        <button
                          onClick={() => setPreamp(0)}
                          className="text-[10px] text-neutral-400 hover:text-white"
                        >
                          0dB
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={eqSettings.preamp}
                    disabled={!eqSettings.enabled}
                    onChange={(e) => setPreamp(Number(e.target.value))}
                    className="w-full h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-emerald-400 focus:outline-none disabled:opacity-40"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Adjusts input gain before filter stages to prevent clipping.
                  </p>
                </div>

                {/* Studio Acoustic Enhancers */}
                <div className="p-3.5 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-2.5">
                  <span className="text-xs font-semibold text-neutral-200 block">
                    Acoustic Enhancers
                  </span>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Headphones className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-xs text-neutral-300">3D Spatial Soundstage</span>
                    </div>
                    <button
                      onClick={() =>
                        setEQSettings((prev) => ({
                          ...prev,
                          spatialAudio: !prev.spatialAudio,
                        }))
                      }
                      className={`w-9 h-5 rounded-full transition-colors relative ${
                        eqSettings.spatialAudio ? 'bg-emerald-500' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                          eqSettings.spatialAudio ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs text-neutral-300">Sub-Bass Harmonics</span>
                    </div>
                    <button
                      onClick={() =>
                        setEQSettings((prev) => ({
                          ...prev,
                          bassBoost: !prev.bassBoost,
                        }))
                      }
                      className={`w-9 h-5 rounded-full transition-colors relative ${
                        eqSettings.bassBoost ? 'bg-emerald-500' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                          eqSettings.bassBoost ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'quality' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border border-emerald-500/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <h4 className="font-bold text-white text-sm">
                        High-Resolution Lossless Audio Pipeline
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed mt-1">
                      MusicHolic bypasses standard downsampling, requesting the pure original broadcast master stream. When Hi-Res FLAC is selected, audio delivers up to 24-bit / 96kHz resolution with expanded studio headroom.
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold whitespace-nowrap">
                    Active: {currentTierConfig.badge}
                  </span>
                </div>
              </div>

              {/* Audio Tiers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(AUDIO_TIERS) as AudioQualityTier[]).map((tierKey) => {
                  const tier = AUDIO_TIERS[tierKey];
                  const isSelected = audioTier === tierKey;

                  return (
                    <div
                      key={tierKey}
                      onClick={() => setAudioTier(tierKey)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-neutral-850 border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                          : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              tier.isLossless
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {tier.badge}
                          </span>
                          <span className="font-semibold text-white text-sm">
                            {tier.name}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-neutral-400 leading-snug mb-3">
                        {tier.description}
                      </p>

                      <div className="space-y-1 font-mono text-[11px] bg-black/40 p-2 rounded-xl border border-neutral-800/80">
                        <div className="flex justify-between text-neutral-400">
                          <span>Resolution:</span>
                          <span className="text-neutral-200 font-semibold">{tier.bitDepth}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>Stream Bitrate:</span>
                          <span className="text-emerald-400 font-semibold">{tier.bitrate}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>Dynamic Range:</span>
                          <span className="text-neutral-200">{tier.dynamicRange}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">
              Engine: Web Audio DSP • {currentTierConfig.codec}
            </span>
          </div>

          <button
            onClick={() => setEqModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};

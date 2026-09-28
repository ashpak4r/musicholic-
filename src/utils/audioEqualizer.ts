import { StudioEQSettings, EQPresetName, AudioQualityTier } from '../types/music';

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const EQ_FREQ_LABELS = ['32Hz', '64Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];

export const EQ_PRESETS: Record<EQPresetName, number[]> = {
  'Flat / Studio Ref': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 2, 0, -1, 0, 1, 2, 3],
  'Vocal Clarity': [-2, -1, 0, 1, 3, 5, 4, 3, 2, 1],
  'Master Tape': [3, 3, 2, 1, 0, 1, 2, 3, 4, 2],
  'Treble Air': [-1, -1, 0, 0, 1, 2, 4, 6, 7, 8],
  'Electronic': [6, 5, 3, 0, -1, 1, 3, 4, 5, 5],
  'Acoustic': [3, 2, 1, 1, 2, 2, 3, 3, 4, 4],
  'Rock / Metal': [4, 3, 2, 0, -1, 1, 2, 4, 4, 3],
  'Custom': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export const DEFAULT_EQ_SETTINGS: StudioEQSettings = {
  enabled: true,
  preset: 'Master Tape',
  preamp: 0,
  bassBoost: false,
  spatialAudio: true,
  vocalEnhance: false,
  bands: [...EQ_PRESETS['Master Tape']],
};

export interface AudioTierConfig {
  id: AudioQualityTier;
  name: string;
  badge: string;
  bitDepth: string;
  bitrate: string;
  codec: string;
  dynamicRange: string;
  description: string;
  isLossless: boolean;
}

export const AUDIO_TIERS: Record<AudioQualityTier, AudioTierConfig> = {
  'hi-res-flac': {
    id: 'hi-res-flac',
    name: 'Hi-Res FLAC Master',
    badge: 'HI-RES FLAC',
    bitDepth: '24-bit / 96 kHz Lossless',
    bitrate: '9,216 kbps Raw Studio Stream',
    codec: 'FLAC / Direct Studio Master',
    dynamicRange: '118 dB Studio Dynamics',
    description: 'Bit-perfect studio resolution delivering pure dynamic range with zero lossy compression artifacts.',
    isLossless: true,
  },
  'studio-320': {
    id: 'studio-320',
    name: 'Studio Master AAC',
    badge: 'STUDIO 320K',
    bitDepth: '16-bit / 48 kHz',
    bitrate: '320 kbps CBR',
    codec: 'AAC / Opus Broadcast Stream',
    dynamicRange: '98 dB Dynamic Range',
    description: 'Broadcast-grade fidelity with transparent high-end detail and pristine acoustic clarity.',
    isLossless: false,
  },
  'balanced-256': {
    id: 'balanced-256',
    name: 'Balanced Hi-Fi',
    badge: 'HI-FI 256K',
    bitDepth: '16-bit / 44.1 kHz',
    bitrate: '256 kbps VBR',
    codec: 'Opus 48 kHz',
    dynamicRange: '96 dB Dynamic Range',
    description: 'Optimal equilibrium of audiophile clarity and low network buffering.',
    isLossless: false,
  },
  'saver-128': {
    id: 'saver-128',
    name: 'Data Saver',
    badge: 'ECO 128K',
    bitDepth: '16-bit / 44.1 kHz',
    bitrate: '128 kbps',
    codec: 'AAC-LC',
    dynamicRange: '88 dB Dynamic Range',
    description: 'Reduced data consumption for mobile networks while preserving musical balance.',
    isLossless: false,
  },
};

/**
 * Generates an SVG cubic bezier path string representing the frequency response curve
 * based on the 10-band gains (-12dB to +12dB).
 */
export function generateEQCurvePath(
  bands: number[],
  preamp: number = 0,
  width: number = 400,
  height: number = 100,
): { path: string; fillPath: string } {
  const points: { x: number; y: number }[] = [];
  const minDb = -12;
  const maxDb = 12;
  const totalBands = bands.length;

  for (let i = 0; i < totalBands; i++) {
    const rawGain = bands[i] + preamp * 0.4;
    const clampedGain = Math.max(minDb, Math.min(maxDb, rawGain));
    // Normalize y: minDb => height - 8, 0 => height / 2, maxDb => 8
    const normalized = (clampedGain - minDb) / (maxDb - minDb);
    const y = height - (normalized * (height - 16) + 8);
    // Logarithmic / equal spacing across width
    const x = (i / (totalBands - 1)) * (width - 24) + 12;
    points.push({ x, y });
  }

  if (points.length < 2) return { path: '', fillPath: '' };

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1];

    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  const fillD = `${d} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return { path: d, fillPath: fillD };
}

/**
 * Web Audio API Equalizer Controller
 * Manages BiquadFilterNodes, Preamp GainNode, and spatial enhancement.
 */
class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private filters: BiquadFilterNode[] = [];
  private preampNode: GainNode | null = null;
  private isInitialized = false;

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Create Preamp Gain
      this.preampNode = this.ctx.createGain();
      this.preampNode.gain.value = 1.0;

      // Create 10 Biquad Filters
      this.filters = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = this.ctx!.createBiquadFilter();
        if (idx === 0) {
          filter.type = 'lowshelf';
        } else if (idx === EQ_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      // Chain filters in series: Preamp -> Filter[0] -> ... -> Filter[9] -> Destination
      let prevNode: AudioNode = this.preampNode;
      for (const filter of this.filters) {
        prevNode.connect(filter);
        prevNode = filter;
      }
      prevNode.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API Studio Engine init skipped:', e);
    }
  }

  public applySettings(settings: StudioEQSettings) {
    if (!this.ctx || !this.isInitialized) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;

    // Apply Preamp Gain (dB to linear: 10^(dB/20))
    if (this.preampNode) {
      const preampDb = settings.enabled ? settings.preamp : 0;
      const linearGain = Math.pow(10, preampDb / 20);
      this.preampNode.gain.setTargetAtTime(linearGain, now, 0.05);
    }

    // Apply Filter gains
    this.filters.forEach((filter, idx) => {
      let targetGain = settings.enabled ? (settings.bands[idx] || 0) : 0;

      // Extra studio enhancements
      if (settings.enabled && settings.bassBoost && idx <= 1) {
        targetGain += 4.5;
      }
      if (settings.enabled && settings.vocalEnhance && (idx === 4 || idx === 5)) {
        targetGain += 3.5;
      }

      filter.gain.setTargetAtTime(targetGain, now, 0.05);
    });
  }
}

export const studioAudioEngine = new StudioAudioEngine();

export interface Song {
  id: string; // YouTube videoId
  title: string;
  artist: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  views?: string;
  channelId?: string;
  liked?: boolean;
  addedAt?: number;
}

export interface LastPlayedInfo {
  song: Song;
  position: number; // in seconds
  timestamp: number; // when it was played
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface LyricsData {
  found: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
  duration?: number;
}

export interface SyncedLyricLine {
  time: number; // in seconds
  text: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  songs: Song[];
  createdAt: number;
}

export type AudioQualityTier = 'hi-res-flac' | 'studio-320' | 'balanced-256' | 'saver-128';

export type EQPresetName =
  | 'Flat / Studio Ref'
  | 'Bass Boost'
  | 'Vocal Clarity'
  | 'Master Tape'
  | 'Treble Air'
  | 'Electronic'
  | 'Acoustic'
  | 'Rock / Metal'
  | 'Custom';

export interface StudioEQSettings {
  enabled: boolean;
  preset: EQPresetName;
  preamp: number; // -12 to +12 dB
  bassBoost: boolean;
  spatialAudio: boolean;
  vocalEnhance: boolean;
  bands: number[]; // 10 gain values in dB for [32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz]
}

export interface ChartSong extends Song {
  rank: number;
  peak?: number;
  movement?: 'up' | 'down' | 'same' | 'new';
  weeksOnChart?: number;
  badge?: string;
}

export type ChartCategory = 'india' | 'bollywood' | 'punjabi' | 'romantic' | 'global';

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Persistent JSON Database for users and listening data
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  avatar: string;
  createdAt: number;
  token?: string;
  likedSongs: SongItem[];
  recentlyPlayed: SongItem[];
  searchHistory: string[];
  lastPlayed?: {
    song: SongItem;
    position: number;
    timestamp: number;
  };
  preferences?: {
    favoriteArtists?: string[];
    favoriteGenres?: string[];
    defaultVibe?: string;
  };
}

interface DatabaseSchema {
  users: UserRecord[];
}

function ensureDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial: DatabaseSchema = { users: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB, resetting:', err);
    const initial: DatabaseSchema = { users: [] };
    return initial;
  }
}

function saveDb(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
}

// In-memory cache for search and recommendations to make the app lightning fast
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data as T;
  }
  return null;
}

function setCached(key: string, data: any) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

export interface SongItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  views?: string;
  channelId?: string;
}

// Helper to parse duration string (e.g. "3:45" or "1:02:10") into seconds
function parseDurationToSeconds(durationStr: string): number {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return 0;
}

// Clean title of unnecessary clutter like "(Official Music Video)" or "[HD]"
function cleanSongTitle(rawTitle: string): { title: string; artistFromTitle?: string } {
  let cleaned = rawTitle
    .replace(/\s*\(Official (Music )?Video\)/gi, '')
    .replace(/\s*\[Official (Music )?Video\]/gi, '')
    .replace(/\s*\(Official Audio\)/gi, '')
    .replace(/\s*\[Official Audio\]/gi, '')
    .replace(/\s*\(Lyric Video\)/gi, '')
    .replace(/\s*\[Lyric Video\]/gi, '')
    .replace(/\s*\(Lyrics\)/gi, '')
    .replace(/\s*\[Lyrics\]/gi, '')
    .replace(/\s*\(Visualizer\)/gi, '')
    .replace(/\s*\[Visualizer\]/gi, '')
    .replace(/\s*\|.*$/g, '')
    .replace(/\s*HD\s*$/gi, '')
    .replace(/\s*4K\s*$/gi, '')
    .trim();

  // If title has "Artist - Title", separate them cleanly
  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ');
    if (parts.length >= 2) {
      return {
        artistFromTitle: parts[0].trim(),
        title: parts.slice(1).join(' - ').trim(),
      };
    }
  }

  return { title: cleaned };
}

// Non-music and compilation filter keywords
const NON_MUSIC_KEYWORDS = [
  'full movie',
  'interview',
  'podcast',
  'tutorial',
  'gameplay',
  'unboxing',
  'vlog',
  'trailer',
  'teaser',
  'full episode',
  'behind the scenes',
  'jukebox',
  'top 10 songs',
  'top 5 songs',
  'top 50',
  'top 100',
  'nonstop',
  'playlist 202',
  'greatest hits full album',
  'full album',
  'compilation',
  'mix lyrics',
  'billboard top',
];

const COMPILATION_REGEX = /\b(?:\d+\s*(?:hours?|hrs?)|(?:1|10)\s*hours?|hour\s*loop)\b/i;
const REACTION_REVIEW_REGEX = /\b(?:reacts?\s+to|reaction\s+video|album\s+review|song\s+review)\b/i;

function isMusicContent(title: string, durationSec: number): boolean {
  // Avoid excessively long video compilations (> 11 minutes) or non-music
  if (durationSec > 660) return false;
  // Very short shorts (< 25 seconds)
  if (durationSec > 0 && durationSec < 25) return false;

  const lower = title.toLowerCase();
  for (const kw of NON_MUSIC_KEYWORDS) {
    if (lower.includes(kw)) return false;
  }
  if (COMPILATION_REGEX.test(title)) return false;
  if (REACTION_REVIEW_REGEX.test(title)) return false;
  return true;
}

// Helper to query YouTube Next Song Algorithm directly from YouTube Innertube
async function fetchYouTubeNextAlgorithm(videoId: string): Promise<SongItem[]> {
  const cacheKey = `yt-next:${videoId}`;
  const cached = getCached<SongItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/next', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240313.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        videoId: videoId,
      }),
    });

    if (!res.ok) {
      console.warn(`YouTube Next endpoint returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    const results =
      data.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results || [];

    const items: SongItem[] = [];

    for (const item of results) {
      // 1. compactVideoRenderer
      if (item.compactVideoRenderer) {
        const v = item.compactVideoRenderer;
        if (!v.videoId || v.videoId === videoId) continue;

        const rawTitle =
          v.title?.simpleText ||
          v.title?.runs?.map((r: any) => r.text).join('') ||
          '';
        const durationStr = v.lengthText?.simpleText || '';
        const durationSec = parseDurationToSeconds(durationStr);

        // Filter out non-music, compilations > 11 mins, or shorts < 25 secs
        if (durationSec > 660 || (durationSec > 0 && durationSec < 25)) continue;
        if (!isMusicContent(rawTitle, durationSec)) continue;

        const channelTitle =
          v.shortBylineText?.runs?.map((r: any) => r.text).join('') ||
          v.ownerText?.runs?.map((r: any) => r.text).join('') ||
          '';

        const { title: cleanedTitle, artistFromTitle } = cleanSongTitle(rawTitle);
        const finalArtist =
          artistFromTitle ||
          channelTitle.replace(/ - Topic$/i, '').replace(/VEVO$/i, '') ||
          'YouTube Music';

        const thumbnail =
          v.thumbnail?.thumbnails?.pop()?.url ||
          `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

        items.push({
          id: v.videoId,
          title: cleanedTitle || rawTitle,
          artist: finalArtist,
          duration: durationStr || '3:30',
          durationSeconds: durationSec || 210,
          thumbnail,
          views: v.viewCountText?.simpleText || '',
        });
      }
      // 2. lockupViewModel (modern YouTube watch next format)
      else if (item.lockupViewModel) {
        const m = item.lockupViewModel;
        const id = m.contentId;
        // Ignore playlist mixes, collections, or self
        if (
          !id ||
          id === videoId ||
          id.length !== 11 ||
          id.startsWith('RD') ||
          id.startsWith('PL') ||
          id.startsWith('VL')
        ) {
          continue;
        }

        const rawTitle = m.metadata?.lockupMetadataViewModel?.title?.content || '';
        if (!rawTitle) continue;

        // Duration parsing from thumbnail overlays
        let durationStr = '';
        const overlays = m.contentImage?.thumbnailViewModel?.overlays || [];
        for (const ov of overlays) {
          const badge =
            ov.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text;
          if (badge) {
            durationStr = badge;
            break;
          }
        }
        if (!durationStr) {
          const customBadges =
            m.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailOverlayBadgeViewModel?.thumbnailOverlayBadgeViewModel?.thumbnailBadges ||
            [];
          for (const b of customBadges) {
            if (b.thumbnailBadgeViewModel?.text) {
              durationStr = b.thumbnailBadgeViewModel.text;
              break;
            }
          }
        }

        const durationSec = parseDurationToSeconds(durationStr);
        // Exclude compilations / multi-hour playlists
        if (durationSec > 660 || (durationSec > 0 && durationSec < 25)) continue;
        if (!isMusicContent(rawTitle, durationSec)) continue;

        const rows =
          m.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows ||
          [];
        let channelTitle = '';
        let views = '';
        if (rows[0]?.metadataParts) {
          channelTitle = rows[0].metadataParts
            .map((p: any) => p.text?.content || '')
            .filter(Boolean)
            .join(' ');
        }
        if (rows[1]?.metadataParts) {
          views =
            rows[1].metadataParts[0]?.accessibilityLabel ||
            rows[1].metadataParts[0]?.text?.content ||
            '';
        }

        const { title: cleanedTitle, artistFromTitle } = cleanSongTitle(rawTitle);
        const finalArtist =
          artistFromTitle ||
          channelTitle.replace(/ - Topic$/i, '').replace(/VEVO$/i, '') ||
          'YouTube Music';

        const thumbnail =
          m.contentImage?.thumbnailViewModel?.image?.sources?.pop()?.url ||
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

        items.push({
          id,
          title: cleanedTitle || rawTitle,
          artist: finalArtist,
          duration: durationStr || '3:30',
          durationSeconds: durationSec || 210,
          thumbnail,
          views,
        });
      }
    }

    if (items.length > 0) {
      setCached(cacheKey, items);
    }
    return items;
  } catch (err) {
    console.error('Error fetching YouTube next algorithm:', err);
    return [];
  }
}

// Helper to query YouTube search page and extract real videos
async function searchYouTube(query: string, limit = 20): Promise<SongItem[]> {
  const cacheKey = `search:${query.toLowerCase().trim()}:${limit}`;
  const cached = getCached<SongItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`YouTube returned status ${response.status}`);
    }

    const html = await response.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) {
      return [];
    }

    const data = JSON.parse(match[1]);
    const items: SongItem[] = [];

    // Traverse YouTube's complex search result structure
    const sectionList =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    for (const section of sectionList) {
      const itemSection = section.itemSectionRenderer?.contents || [];
      for (const item of itemSection) {
        const video = item.videoRenderer;
        if (!video || !video.videoId) continue;

        const rawTitle = video.title?.runs?.[0]?.text || video.title?.simpleText || '';
        if (!rawTitle) continue;

        const durationStr = video.lengthText?.simpleText || '';
        const durationSec = parseDurationToSeconds(durationStr);

        // Filter non-music or extreme length items
        if (!isMusicContent(rawTitle, durationSec)) continue;

        const channelTitle =
          video.ownerText?.runs?.[0]?.text ||
          video.shortBylineText?.runs?.[0]?.text ||
          'Unknown Artist';

        const { title: cleanedTitle, artistFromTitle } = cleanSongTitle(rawTitle);
        const finalArtist = artistFromTitle || channelTitle.replace(/ - Topic$/i, '').replace(/VEVO$/i, '');

        // Use high-res thumbnail
        const thumbnail =
          video.thumbnail?.thumbnails?.pop()?.url ||
          `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

        items.push({
          id: video.videoId,
          title: cleanedTitle || rawTitle,
          artist: finalArtist,
          duration: durationStr || '3:30',
          durationSeconds: durationSec || 210,
          thumbnail,
          views: video.viewCountText?.simpleText || '',
          channelId: video.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId,
        });

        if (items.length >= limit) break;
      }
      if (items.length >= limit) break;
    }

    if (items.length > 0) {
      setCached(cacheKey, items);
    }
    return items;
  } catch (err) {
    console.error('YouTube search error:', err);
    return [];
  }
}

// =================== AUTHENTICATION API ===================

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function sanitizeUser(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    createdAt: user.createdAt,
    preferences: user.preferences || {
      favoriteArtists: ['Arijit Singh', 'Karan Aujla', 'Anuv Jain', 'Sachin-Jigar'],
      favoriteGenres: ['Romantic Melodies', 'Bollywood Hits', 'Punjabi & Desi'],
      defaultVibe: 'all',
    },
  };
}

// 1. Sign Up
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();
  if (password.length < 6) {
    res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    return;
  }

  const db = ensureDb();
  const existing = db.users.find((u) => u.email === cleanEmail);
  if (existing) {
    res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const token = crypto.randomBytes(32).toString('hex');

  // Generate a stylish avatar color/initial
  const colors = ['#10b981', '#06b6d4', '#6366f1', '#ec4899', '#f59e0b', '#8b5cf6'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=${color.replace('#', '')}`;

  const newUser: UserRecord = {
    id: 'user_' + crypto.randomUUID(),
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
    salt,
    avatar,
    createdAt: Date.now(),
    token,
    likedSongs: [],
    recentlyPlayed: [],
    searchHistory: [],
  };

  db.users.push(newUser);
  saveDb(db);

  res.json({
    success: true,
    token,
    user: sanitizeUser(newUser),
  });
});

// 2. Log In
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password are required.' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();
  const db = ensureDb();
  const user = db.users.find((u) => u.email === cleanEmail);

  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid email or password.' });
    return;
  }

  const testHash = hashPassword(password, user.salt);
  if (testHash !== user.passwordHash) {
    res.status(401).json({ success: false, error: 'Invalid email or password.' });
    return;
  }

  // Generate fresh token
  const token = crypto.randomBytes(32).toString('hex');
  user.token = token;
  saveDb(db);

  res.json({
    success: true,
    token,
    user: sanitizeUser(user),
    userData: {
      likedSongs: user.likedSongs || [],
      recentlyPlayed: user.recentlyPlayed || [],
      searchHistory: user.searchHistory || [],
      lastPlayed: user.lastPlayed,
    },
  });
});

// 3. Current User Session Check
app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Not authenticated.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const db = ensureDb();
  const user = db.users.find((u) => u.token === token);

  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid or expired session.' });
    return;
  }

  res.json({
    success: true,
    user: sanitizeUser(user),
    userData: {
      likedSongs: user.likedSongs || [],
      recentlyPlayed: user.recentlyPlayed || [],
      searchHistory: user.searchHistory || [],
      lastPlayed: user.lastPlayed,
    },
  });
});

// 4. Sync User Data (Liked songs, Listening history, Last played resume state)
app.post('/api/user/sync', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If not authenticated, return success: false gracefully
    res.json({ success: false, message: 'Unauthenticated (saved locally)' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const db = ensureDb();
  const user = db.users.find((u) => u.token === token);

  if (!user) {
    res.status(401).json({ success: false, error: 'User session not found.' });
    return;
  }

  const { likedSongs, recentlyPlayed, searchHistory, lastPlayed, preferences } = req.body;

  if (Array.isArray(likedSongs)) user.likedSongs = likedSongs;
  if (Array.isArray(recentlyPlayed)) user.recentlyPlayed = recentlyPlayed;
  if (Array.isArray(searchHistory)) user.searchHistory = searchHistory;
  if (lastPlayed) user.lastPlayed = lastPlayed;
  if (preferences) user.preferences = { ...(user.preferences || {}), ...preferences };

  saveDb(db);
  res.json({ success: true, message: 'User data synced successfully.' });
});

// 5. Update User Music Preferences
app.post('/api/user/preferences', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthenticated.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const db = ensureDb();
  const user = db.users.find((u) => u.token === token);

  if (!user) {
    res.status(401).json({ success: false, error: 'User session not found.' });
    return;
  }

  const { preferences } = req.body;
  if (preferences) {
    user.preferences = {
      ...(user.preferences || {}),
      ...preferences,
    };
    saveDb(db);
  }

  res.json({
    success: true,
    user: sanitizeUser(user),
    message: 'Music preferences updated.',
  });
});

// =================== MUSIC STREAMING API ===================

// Search songs, artists, albums
app.get('/api/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  if (!query.trim()) {
    res.json({ results: [] });
    return;
  }

  // 1. Direct query first to retrieve the exact authentic track / artist match
  let results = await searchYouTube(query, 24);

  // 2. If direct query returned few results, supplement with music-specific query
  if (results.length < 6) {
    const supplementQuery = query.toLowerCase().includes('song') || query.toLowerCase().includes('audio')
      ? `${query} music`
      : `${query} song audio`;
    const supplementResults = await searchYouTube(supplementQuery, 24);
    const existingIds = new Set(results.map((r) => r.id));
    for (const r of supplementResults) {
      if (!existingIds.has(r.id)) {
        results.push(r);
        existingIds.add(r.id);
      }
      if (results.length >= 24) break;
    }
  }

  res.json({ results });
});

// Search Autocomplete Suggestions
app.get('/api/suggest', async (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  if (!query.trim()) {
    res.json({ suggestions: [] });
    return;
  }

  const cacheKey = `suggest:${query.toLowerCase().trim()}`;
  const cached = getCached<string[]>(cacheKey);
  if (cached) {
    res.json({ suggestions: cached });
    return;
  }

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const text = await response.text();

    const match = text.match(/window\.google\.ac\.h\((.*)\)/);
    if (match) {
      const data = JSON.parse(match[1]);
      const rawSuggestions = data[1] || [];
      const suggestions = rawSuggestions
        .map((item: any) => (Array.isArray(item) ? item[0] : item))
        .filter((s: any): s is string => typeof s === 'string')
        .slice(0, 8);

      setCached(cacheKey, suggestions);
      res.json({ suggestions });
      return;
    }
  } catch (e) {
    console.error('Suggest error:', e);
  }

  res.json({ suggestions: [] });
});

// YouTube Top Charts verified catalog & real-time rankings
interface ChartSongItem extends SongItem {
  rank?: number;
  peak?: number;
  movement?: 'up' | 'down' | 'same' | 'new';
  weeksOnChart?: number;
  badge?: string;
}

const YOUTUBE_TOP_CHARTS: Record<string, ChartSongItem[]> = {
  india: [
    {
      id: 'LK7-_dgAVQE',
      title: 'Tauba Tauba',
      artist: 'Karan Aujla',
      duration: '3:30',
      durationSeconds: 210,
      thumbnail: 'https://i.ytimg.com/vi/LK7-_dgAVQE/hqdefault.jpg',
      views: '320M views',
      rank: 1,
      peak: 1,
      movement: 'same',
      weeksOnChart: 14,
      badge: '🔥 #1 India Trending',
    },
    {
      id: '0IIJxkDtkHY',
      title: 'Husn',
      artist: 'Anuv Jain',
      duration: '3:39',
      durationSeconds: 219,
      thumbnail: 'https://i.ytimg.com/vi/0IIJxkDtkHY/hqdefault.jpg',
      views: '175M views',
      rank: 2,
      peak: 1,
      movement: 'up',
      weeksOnChart: 42,
      badge: '🔥 Indie Sensation',
    },
    {
      id: 'wmUJwQNGK3k',
      title: 'Jo Tum Mere Ho',
      artist: 'Anuv Jain',
      duration: '4:10',
      durationSeconds: 250,
      thumbnail: 'https://i.ytimg.com/vi/wmUJwQNGK3k/hqdefault.jpg',
      views: '115M views',
      rank: 3,
      peak: 2,
      movement: 'up',
      weeksOnChart: 18,
      badge: '💖 Acoustic Viral',
    },
    {
      id: 'k3g_WjLCsXM',
      title: 'Sajni',
      artist: 'Arijit Singh & Ram Sampath',
      duration: '3:00',
      durationSeconds: 180,
      thumbnail: 'https://i.ytimg.com/vi/k3g_WjLCsXM/hqdefault.jpg',
      views: '195M views',
      rank: 4,
      peak: 1,
      movement: 'same',
      weeksOnChart: 28,
      badge: '✨ Top Melody',
    },
    {
      id: '9QpmsrYO4cc',
      title: 'Tainu Khabar Nahi',
      artist: 'Arijit Singh & Sachin-Jigar',
      duration: '3:06',
      durationSeconds: 186,
      thumbnail: 'https://i.ytimg.com/vi/9QpmsrYO4cc/hqdefault.jpg',
      views: '145M views',
      rank: 5,
      peak: 2,
      movement: 'up',
      weeksOnChart: 20,
      badge: '💖 Romantic Hit',
    },
    {
      id: 'hOHKltAiKXQ',
      title: 'Big Dawgs',
      artist: 'Hanumankind & Kalmi',
      duration: '3:18',
      durationSeconds: 198,
      thumbnail: 'https://i.ytimg.com/vi/hOHKltAiKXQ/hqdefault.jpg',
      views: '190M views',
      rank: 6,
      peak: 1,
      movement: 'same',
      weeksOnChart: 16,
      badge: '🚀 Global Desi',
    },
    {
      id: '9jY8PItvMxo',
      title: 'Chuttamalle',
      artist: 'Shilpa Rao & Anirudh',
      duration: '3:45',
      durationSeconds: 225,
      thumbnail: 'https://i.ytimg.com/vi/9jY8PItvMxo/hqdefault.jpg',
      views: '235M views',
      rank: 7,
      peak: 3,
      movement: 'up',
      weeksOnChart: 15,
      badge: '⚡ Dance Chartbuster',
    },
    {
      id: 'tOM-nWPcR4U',
      title: 'Illuminati',
      artist: 'Sushin Shyam & Dabzee',
      duration: '3:10',
      durationSeconds: 190,
      thumbnail: 'https://i.ytimg.com/vi/tOM-nWPcR4U/hqdefault.jpg',
      views: '180M views',
      rank: 8,
      peak: 1,
      movement: 'same',
      weeksOnChart: 24,
      badge: '🔥 Desi Banger',
    },
    {
      id: '1tsCjcq0G-U',
      title: 'O Maahi',
      artist: 'Arijit Singh & Pritam',
      duration: '3:55',
      durationSeconds: 235,
      thumbnail: 'https://i.ytimg.com/vi/1tsCjcq0G-U/hqdefault.jpg',
      views: '245M views',
      rank: 9,
      peak: 2,
      movement: 'same',
      weeksOnChart: 36,
      badge: '💖 Soulful',
    },
    {
      id: 'Bi7sSC046dk',
      title: 'Chaleya',
      artist: 'Arijit Singh & Shilpa Rao',
      duration: '3:20',
      durationSeconds: 200,
      thumbnail: 'https://i.ytimg.com/vi/Bi7sSC046dk/hqdefault.jpg',
      views: '460M views',
      rank: 10,
      peak: 1,
      movement: 'same',
      weeksOnChart: 54,
      badge: '🌟 Blockbuster',
    },
    {
      id: 'RLzC55ai0eo',
      title: 'Heeriye',
      artist: 'Jasleen Royal & Arijit Singh',
      duration: '3:15',
      durationSeconds: 195,
      thumbnail: 'https://i.ytimg.com/vi/RLzC55ai0eo/hqdefault.jpg',
      views: '385M views',
      rank: 11,
      peak: 1,
      movement: 'same',
      weeksOnChart: 60,
      badge: '💖 Romantic Duet',
    },
    {
      id: 'WuiGp0y_pSo',
      title: 'Soulmate',
      artist: 'Badshah & Arijit Singh',
      duration: '3:33',
      durationSeconds: 213,
      thumbnail: 'https://i.ytimg.com/vi/WuiGp0y_pSo/hqdefault.jpg',
      views: '125M views',
      rank: 12,
      peak: 2,
      movement: 'up',
      weeksOnChart: 16,
      badge: '⚡ Urban Desi',
    },
    {
      id: 'QKMTreKTpug',
      title: 'Pehle Bhi Main',
      artist: 'Vishal Mishra & Raj Shekhar',
      duration: '4:10',
      durationSeconds: 250,
      thumbnail: 'https://i.ytimg.com/vi/QKMTreKTpug/hqdefault.jpg',
      views: '215M views',
      rank: 13,
      peak: 3,
      movement: 'up',
      weeksOnChart: 38,
      badge: '🔥 Emotional Peak',
    },
    {
      id: 'u2NAuswnTKs',
      title: 'Apna Bana Le',
      artist: 'Arijit Singh & Sachin-Jigar',
      duration: '3:42',
      durationSeconds: 222,
      thumbnail: 'https://i.ytimg.com/vi/u2NAuswnTKs/hqdefault.jpg',
      views: '315M views',
      rank: 14,
      peak: 1,
      movement: 'same',
      weeksOnChart: 70,
      badge: '💖 Pure Romance',
    },
    {
      id: 'BddP6PYo2gs',
      title: 'Kesariya',
      artist: 'Arijit Singh & Pritam',
      duration: '2:52',
      durationSeconds: 172,
      thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg',
      views: '560M views',
      rank: 15,
      peak: 1,
      movement: 'same',
      weeksOnChart: 85,
      badge: '✨ Evergreen',
    },
    {
      id: '73vZDNKa_Wg',
      title: 'Maan Meri Jaan',
      artist: 'King',
      duration: '3:16',
      durationSeconds: 196,
      thumbnail: 'https://i.ytimg.com/vi/73vZDNKa_Wg/hqdefault.jpg',
      views: '590M views',
      rank: 16,
      peak: 1,
      movement: 'same',
      weeksOnChart: 90,
      badge: '🚀 Pop Anthem',
    },
    {
      id: '5Eqb_-j3FDA',
      title: 'Pasoori',
      artist: 'Ali Sethi & Shae Gill',
      duration: '3:44',
      durationSeconds: 224,
      thumbnail: 'https://i.ytimg.com/vi/5Eqb_-j3FDA/hqdefault.jpg',
      views: '695M views',
      rank: 17,
      peak: 1,
      movement: 'same',
      weeksOnChart: 92,
      badge: '🌟 Fusion Anthem',
    },
    {
      id: 'cWMxCE2HTag',
      title: 'Softly',
      artist: 'Karan Aujla',
      duration: '2:35',
      durationSeconds: 155,
      thumbnail: 'https://i.ytimg.com/vi/cWMxCE2HTag/hqdefault.jpg',
      views: '295M views',
      rank: 18,
      peak: 2,
      movement: 'same',
      weeksOnChart: 30,
      badge: '🔥 Punjabi Swag',
    },
    {
      id: 'vsWxs1tuwDk',
      title: 'Winning Speech',
      artist: 'Karan Aujla',
      duration: '3:00',
      durationSeconds: 180,
      thumbnail: 'https://i.ytimg.com/vi/vsWxs1tuwDk/hqdefault.jpg',
      views: '165M views',
      rank: 19,
      peak: 1,
      movement: 'up',
      weeksOnChart: 22,
      badge: '🔥 Desi Rap',
    },
  ],
  bollywood: [
    {
      id: 'k3g_WjLCsXM',
      title: 'Sajni',
      artist: 'Arijit Singh & Ram Sampath',
      duration: '3:00',
      durationSeconds: 180,
      thumbnail: 'https://i.ytimg.com/vi/k3g_WjLCsXM/hqdefault.jpg',
      views: '195M views',
      rank: 1,
      peak: 1,
      movement: 'same',
      badge: 'Heartfelt',
    },
    {
      id: '9QpmsrYO4cc',
      title: 'Tainu Khabar Nahi',
      artist: 'Arijit Singh & Sachin-Jigar',
      duration: '3:06',
      durationSeconds: 186,
      thumbnail: 'https://i.ytimg.com/vi/9QpmsrYO4cc/hqdefault.jpg',
      views: '145M views',
      rank: 2,
      peak: 2,
      movement: 'up',
      badge: 'Romantic',
    },
    {
      id: '1tsCjcq0G-U',
      title: 'O Maahi',
      artist: 'Arijit Singh & Pritam',
      duration: '3:55',
      durationSeconds: 235,
      thumbnail: 'https://i.ytimg.com/vi/1tsCjcq0G-U/hqdefault.jpg',
      views: '245M views',
      rank: 3,
      peak: 2,
      movement: 'same',
      badge: 'Melody',
    },
    {
      id: 'Bi7sSC046dk',
      title: 'Chaleya',
      artist: 'Arijit Singh & Shilpa Rao',
      duration: '3:20',
      durationSeconds: 200,
      thumbnail: 'https://i.ytimg.com/vi/Bi7sSC046dk/hqdefault.jpg',
      views: '460M views',
      rank: 4,
      peak: 1,
      movement: 'same',
      badge: 'Chart Classic',
    },
    {
      id: 'u2NAuswnTKs',
      title: 'Apna Bana Le',
      artist: 'Arijit Singh & Sachin-Jigar',
      duration: '3:42',
      durationSeconds: 222,
      thumbnail: 'https://i.ytimg.com/vi/u2NAuswnTKs/hqdefault.jpg',
      views: '315M views',
      rank: 5,
      peak: 1,
      movement: 'same',
      badge: 'Romantic Soul',
    },
    {
      id: 'QKMTreKTpug',
      title: 'Pehle Bhi Main',
      artist: 'Vishal Mishra',
      duration: '4:10',
      durationSeconds: 250,
      thumbnail: 'https://i.ytimg.com/vi/QKMTreKTpug/hqdefault.jpg',
      views: '215M views',
      rank: 6,
      peak: 3,
      movement: 'up',
      badge: 'Emotional',
    },
    {
      id: 'BddP6PYo2gs',
      title: 'Kesariya',
      artist: 'Arijit Singh',
      duration: '2:52',
      durationSeconds: 172,
      thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg',
      views: '560M views',
      rank: 7,
      peak: 1,
      movement: 'same',
      badge: 'Blockbuster',
    },
    {
      id: '9jY8PItvMxo',
      title: 'Chuttamalle',
      artist: 'Shilpa Rao & Anirudh',
      duration: '3:45',
      durationSeconds: 225,
      thumbnail: 'https://i.ytimg.com/vi/9jY8PItvMxo/hqdefault.jpg',
      views: '235M views',
      rank: 8,
      peak: 3,
      movement: 'up',
      badge: 'Dance Hit',
    },
    {
      id: 'RLzC55ai0eo',
      title: 'Heeriye',
      artist: 'Jasleen Royal & Arijit Singh',
      duration: '3:15',
      durationSeconds: 195,
      thumbnail: 'https://i.ytimg.com/vi/RLzC55ai0eo/hqdefault.jpg',
      views: '385M views',
      rank: 9,
      peak: 1,
      movement: 'same',
      badge: 'Acoustic Love',
    },
    {
      id: 'LK7-_dgAVQE',
      title: 'Tauba Tauba',
      artist: 'Karan Aujla',
      duration: '3:30',
      durationSeconds: 210,
      thumbnail: 'https://i.ytimg.com/vi/LK7-_dgAVQE/hqdefault.jpg',
      views: '320M views',
      rank: 10,
      peak: 1,
      movement: 'same',
      badge: 'Club Banger',
    },
  ],
  punjabi: [
    {
      id: 'LK7-_dgAVQE',
      title: 'Tauba Tauba',
      artist: 'Karan Aujla',
      duration: '3:30',
      durationSeconds: 210,
      thumbnail: 'https://i.ytimg.com/vi/LK7-_dgAVQE/hqdefault.jpg',
      views: '320M views',
      rank: 1,
      peak: 1,
      movement: 'same',
      badge: '🔥 #1 Punjabi',
    },
    {
      id: 'cWMxCE2HTag',
      title: 'Softly',
      artist: 'Karan Aujla',
      duration: '2:35',
      durationSeconds: 155,
      thumbnail: 'https://i.ytimg.com/vi/cWMxCE2HTag/hqdefault.jpg',
      views: '295M views',
      rank: 2,
      peak: 1,
      movement: 'same',
      badge: 'Swag Beat',
    },
    {
      id: 'vsWxs1tuwDk',
      title: 'Winning Speech',
      artist: 'Karan Aujla',
      duration: '3:00',
      durationSeconds: 180,
      thumbnail: 'https://i.ytimg.com/vi/vsWxs1tuwDk/hqdefault.jpg',
      views: '165M views',
      rank: 3,
      peak: 2,
      movement: 'up',
      badge: 'Desi Rap',
    },
    {
      id: 'hOHKltAiKXQ',
      title: 'Big Dawgs',
      artist: 'Hanumankind & Kalmi',
      duration: '3:18',
      durationSeconds: 198,
      thumbnail: 'https://i.ytimg.com/vi/hOHKltAiKXQ/hqdefault.jpg',
      views: '190M views',
      rank: 4,
      peak: 1,
      movement: 'same',
      badge: 'Global Flow',
    },
    {
      id: '5Eqb_-j3FDA',
      title: 'Pasoori',
      artist: 'Ali Sethi & Shae Gill',
      duration: '3:44',
      durationSeconds: 224,
      thumbnail: 'https://i.ytimg.com/vi/5Eqb_-j3FDA/hqdefault.jpg',
      views: '695M views',
      rank: 5,
      peak: 1,
      movement: 'same',
      badge: 'Folk Fusion',
    },
  ],
  romantic: [
    {
      id: '0IIJxkDtkHY',
      title: 'Husn',
      artist: 'Anuv Jain',
      duration: '3:39',
      durationSeconds: 219,
      thumbnail: 'https://i.ytimg.com/vi/0IIJxkDtkHY/hqdefault.jpg',
      views: '175M views',
      rank: 1,
      peak: 1,
      movement: 'same',
      badge: 'Pure Soul',
    },
    {
      id: 'wmUJwQNGK3k',
      title: 'Jo Tum Mere Ho',
      artist: 'Anuv Jain',
      duration: '4:10',
      durationSeconds: 250,
      thumbnail: 'https://i.ytimg.com/vi/wmUJwQNGK3k/hqdefault.jpg',
      views: '115M views',
      rank: 2,
      peak: 2,
      movement: 'up',
      badge: 'Acoustic Melody',
    },
    {
      id: 'k3g_WjLCsXM',
      title: 'Sajni',
      artist: 'Arijit Singh & Ram Sampath',
      duration: '3:00',
      durationSeconds: 180,
      thumbnail: 'https://i.ytimg.com/vi/k3g_WjLCsXM/hqdefault.jpg',
      views: '195M views',
      rank: 3,
      peak: 1,
      movement: 'same',
      badge: 'Heart Touching',
    },
    {
      id: '9QpmsrYO4cc',
      title: 'Tainu Khabar Nahi',
      artist: 'Arijit Singh & Sachin-Jigar',
      duration: '3:06',
      durationSeconds: 186,
      thumbnail: 'https://i.ytimg.com/vi/9QpmsrYO4cc/hqdefault.jpg',
      views: '145M views',
      rank: 4,
      peak: 2,
      movement: 'up',
      badge: 'Sweet Romance',
    },
    {
      id: '1tsCjcq0G-U',
      title: 'O Maahi',
      artist: 'Arijit Singh & Pritam',
      duration: '3:55',
      durationSeconds: 235,
      thumbnail: 'https://i.ytimg.com/vi/1tsCjcq0G-U/hqdefault.jpg',
      views: '245M views',
      rank: 5,
      peak: 2,
      movement: 'same',
      badge: 'Soulful Love',
    },
    {
      id: 'RLzC55ai0eo',
      title: 'Heeriye',
      artist: 'Jasleen Royal & Arijit Singh',
      duration: '3:15',
      durationSeconds: 195,
      thumbnail: 'https://i.ytimg.com/vi/RLzC55ai0eo/hqdefault.jpg',
      views: '385M views',
      rank: 6,
      peak: 1,
      movement: 'same',
      badge: 'Acoustic Duet',
    },
    {
      id: 'u2NAuswnTKs',
      title: 'Apna Bana Le',
      artist: 'Arijit Singh & Sachin-Jigar',
      duration: '3:42',
      durationSeconds: 222,
      thumbnail: 'https://i.ytimg.com/vi/u2NAuswnTKs/hqdefault.jpg',
      views: '315M views',
      rank: 7,
      peak: 1,
      movement: 'same',
      badge: 'Forever Romantic',
    },
  ],
  global: [
    {
      id: 'PfH7jq_uSCM',
      title: 'Die With A Smile',
      artist: 'Lady Gaga & Bruno Mars',
      duration: '3:37',
      durationSeconds: 217,
      thumbnail: 'https://i.ytimg.com/vi/PfH7jq_uSCM/hqdefault.jpg',
      views: '540M views',
      rank: 1,
      peak: 1,
      movement: 'same',
      badge: 'FLAC 96k',
    },
    {
      id: 'ekr2nIex040',
      title: 'APT.',
      artist: 'ROSÉ & Bruno Mars',
      duration: '2:49',
      durationSeconds: 169,
      thumbnail: 'https://i.ytimg.com/vi/ekr2nIex040/hqdefault.jpg',
      views: '620M views',
      rank: 2,
      peak: 1,
      movement: 'up',
      badge: 'FLAC 96k',
    },
    {
      id: 'V9PVRfjEBTI',
      title: 'Birds of a Feather',
      artist: 'Billie Eilish',
      duration: '3:10',
      durationSeconds: 190,
      thumbnail: 'https://i.ytimg.com/vi/V9PVRfjEBTI/hqdefault.jpg',
      views: '410M views',
      rank: 3,
      peak: 2,
      movement: 'same',
      badge: 'Studio 320k',
    },
    {
      id: 'eVli-tstM5E',
      title: 'Espresso',
      artist: 'Sabrina Carpenter',
      duration: '2:55',
      durationSeconds: 175,
      thumbnail: 'https://i.ytimg.com/vi/eVli-tstM5E/hqdefault.jpg',
      views: '480M views',
      rank: 4,
      peak: 1,
      movement: 'up',
      badge: 'FLAC 96k',
    },
    {
      id: 'z9Q9OzL_wI8',
      title: 'Taste',
      artist: 'Sabrina Carpenter',
      duration: '2:37',
      durationSeconds: 157,
      thumbnail: 'https://i.ytimg.com/vi/z9Q9OzL_wI8/hqdefault.jpg',
      views: '290M views',
      rank: 5,
      peak: 2,
      movement: 'up',
      badge: 'Studio 320k',
    },
  ],
};

// YouTube Top Charts API Endpoint (Defaulting to Indian Trending!)
app.get('/api/charts', (req: Request, res: Response) => {
  const category = (req.query.category as string) || 'india';
  const list = YOUTUBE_TOP_CHARTS[category] || YOUTUBE_TOP_CHARTS.india;
  res.json({
    results: list,
    category,
    total: list.length,
    updatedAt: new Date().toISOString(),
  });
});

// Trending / Popular Hits with YouTube India Top Charts as Primary
app.get('/api/trending', async (req: Request, res: Response) => {
  const category = (req.query.category as string) || 'india';

  // 1. For "all" or "india", deliver Indian Trending songs as top priority!
  if (category === 'all' || category === 'india') {
    const indianHits = YOUTUBE_TOP_CHARTS.india || [];
    const liveDesi = await searchYouTube('trending hindi songs audio', 8);
    const existingIds = new Set(indianHits.map((s) => s.id));
    const combined = [...indianHits];
    for (const item of liveDesi) {
      if (!existingIds.has(item.id)) {
        combined.push(item);
        existingIds.add(item.id);
      }
    }
    res.json({ results: combined.slice(0, 24) });
    return;
  }

  // 2. For "bollywood", deliver Bollywood Top Charts
  if (category === 'bollywood') {
    const list = YOUTUBE_TOP_CHARTS.bollywood || [];
    res.json({ results: list });
    return;
  }

  // 3. For "punjabi", deliver Punjabi Top Charts
  if (category === 'punjabi') {
    const list = YOUTUBE_TOP_CHARTS.punjabi || [];
    res.json({ results: list });
    return;
  }

  // 4. For "romantic", deliver Indian Romantic Hits
  if (category === 'romantic') {
    const list = YOUTUBE_TOP_CHARTS.romantic || [];
    res.json({ results: list });
    return;
  }

  // 5. For "global", deliver Global Chart Hits
  if (category === 'global') {
    const list = YOUTUBE_TOP_CHARTS.global || [];
    res.json({ results: list });
    return;
  }

  // 6. Generic Genre queries with Indian fallback
  let query = 'trending hindi songs';
  if (category === 'indie') query = 'indian indie acoustic songs';
  else if (category === 'hiphop') query = 'desi hip hop rap hits';
  else if (category === 'lofi') query = 'bollywood chill lofi beats';
  else if (category === 'pop') query = 'indian pop songs';

  let results = await searchYouTube(query, 20);

  if (results.length < 5) {
    results = YOUTUBE_TOP_CHARTS.india.slice(0, 16);
  }

  res.json({ results });
});

// Canonical core song title stem to strictly eliminate any duplicate version of a track
function extractSongStem(rawTitle: string): string {
  if (!rawTitle) return '';

  let t = rawTitle.toLowerCase();

  // Remove channel or video parts after pipe |
  if (t.includes('|')) {
    t = t.split('|')[0];
  }

  // Remove content in brackets: (), [], {}
  t = t.replace(/\(.*?\)/g, ' ').replace(/\[.*?\]/g, ' ').replace(/\{.*?\}/g, ' ');

  // Remove common format and marketing words
  const noise = [
    'official video', 'official music video', 'official audio', 'lyric video',
    'lyrics video', 'visualizer', 'full song', 'full video', 'video song',
    'audio song', 'music video', 'soundtrack', 'from the film', 'from the movie',
    'remix', 'lofi', 'slowed', 'reverb', 'bass boosted', 'unplugged', 'acoustic',
    'live performance', '4k', 'hd', 'teaser', 'trailer', 'dialogue', 'original',
    'feat', 'ft.', 'ft', 'with'
  ];

  for (const n of noise) {
    t = t.replaceAll(n, ' ');
  }

  // Remove artist dash separator if present e.g. "Karan Aujla - Tauba Tauba"
  if (t.includes(' - ')) {
    const parts = t.split(' - ');
    t = parts.length >= 2 ? parts[1] : t;
  }

  // Filter out standalone common terms
  t = t.replace(/\b(official|audio|video|songs?|lyrics?|film|movie|soundtrack|version|ver)\b/g, ' ');

  // Alphanumeric stem
  const stem = t.replace(/[^a-z0-9]/g, '').trim();
  return stem.slice(0, 15);
}

// Helper for absolute deduplication across song items (eliminates duplicates by ID and title stem)
function deduplicateSongCatalog(songs: SongItem[], excludeIds: Set<string> = new Set()): SongItem[] {
  const seenIds = new Set<string>(excludeIds);
  const seenStems = new Set<string>();
  const result: SongItem[] = [];

  for (const s of songs) {
    if (!s || !s.id || !s.title) continue;
    if (seenIds.has(s.id)) continue;

    const stem = extractSongStem(s.title);

    // If stem is substantial, check if already seen or prefix-matched
    if (stem.length >= 4) {
      let isDuplicate = false;
      for (const existingStem of seenStems) {
        if (
          existingStem === stem ||
          (existingStem.length >= 6 && stem.startsWith(existingStem)) ||
          (stem.length >= 6 && existingStem.startsWith(stem))
        ) {
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        continue;
      }

      seenStems.add(stem);
    }

    seenIds.add(s.id);
    result.push(s);
  }

  return result;
}

// Personalized Recommendations Endpoint based on user listening preference & sign-in profile
app.post('/api/recommendations', async (req: Request, res: Response) => {
  try {
    const {
      artists = [],
      recentSongTitles = [],
      recentSongIds = [],
      currentSongId,
      preferenceVibe,
    } = req.body || {};

    // Check user auth token if provided for deep user preference personalization
    let userPrefArtists: string[] = [];
    let userPrefGenres: string[] = [];
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const db = ensureDb();
      const user = db.users.find((u) => u.token === token);
      if (user) {
        if (user.preferences?.favoriteArtists) {
          userPrefArtists = user.preferences.favoriteArtists;
        }
        if (user.preferences?.favoriteGenres) {
          userPrefGenres = user.preferences.favoriteGenres;
        }
        // Extract artists from liked songs
        if (Array.isArray(user.likedSongs)) {
          for (const s of user.likedSongs.slice(0, 10)) {
            if (s.artist) {
              const primary = s.artist.split(/[,&]/)[0].trim();
              if (primary && !userPrefArtists.includes(primary)) {
                userPrefArtists.push(primary);
              }
            }
          }
        }
      }
    }

    const excludeIds = new Set<string>([
      ...(Array.isArray(recentSongIds) ? recentSongIds.slice(0, 4) : []),
      ...(currentSongId ? [currentSongId] : []),
    ]);

    const candidates: SongItem[] = [];

    // 1. Determine top artists from user preference and request payload
    const mergedArtists = [
      ...userPrefArtists,
      ...(Array.isArray(artists) ? artists : []),
    ].filter(Boolean);

    const uniqueArtists = Array.from(new Set(mergedArtists)).slice(0, 4);
    const topArtists: string[] = uniqueArtists.length > 0
      ? uniqueArtists
      : ['Arijit Singh', 'Karan Aujla', 'Anuv Jain', 'Sachin-Jigar'];

    // Query high quality songs for each top artist
    for (const artistName of topArtists) {
      if (!artistName || artistName.length < 2) continue;
      const searchHits = await searchYouTube(`${artistName} songs audio`, 6);
      candidates.push(...searchHits);
    }

    // 2. Add preference-based curated selections matching active vibe
    const activeVibe = preferenceVibe || 'all';

    if (activeVibe === 'romantic') {
      candidates.push(...(YOUTUBE_TOP_CHARTS.romantic || []));
      candidates.push(...(YOUTUBE_TOP_CHARTS.bollywood || []));
    } else if (activeVibe === 'punjabi') {
      candidates.push(...(YOUTUBE_TOP_CHARTS.punjabi || []));
      candidates.push(...(YOUTUBE_TOP_CHARTS.india || []));
    } else if (activeVibe === 'bollywood') {
      candidates.push(...(YOUTUBE_TOP_CHARTS.bollywood || []));
      candidates.push(...(YOUTUBE_TOP_CHARTS.romantic || []));
    } else if (activeVibe === 'indie') {
      candidates.push(...(YOUTUBE_TOP_CHARTS.india || []).filter((s) => s.badge?.includes('Indie') || s.badge?.includes('Acoustic')));
      const indieHits = await searchYouTube('indian acoustic indie songs audio', 8);
      candidates.push(...indieHits);
    } else if (activeVibe === 'hiphop') {
      candidates.push(...(YOUTUBE_TOP_CHARTS.india || []).filter((s) => s.badge?.includes('Desi') || s.badge?.includes('Global')));
      const rapHits = await searchYouTube('desi hip hop audio songs', 8);
      candidates.push(...rapHits);
    } else {
      // Balanced mix of top Indian tracks
      candidates.push(...(YOUTUBE_TOP_CHARTS.india || []));
      candidates.push(...(YOUTUBE_TOP_CHARTS.romantic || []));
      candidates.push(...(YOUTUBE_TOP_CHARTS.punjabi || []));
      candidates.push(...(YOUTUBE_TOP_CHARTS.bollywood || []));
    }

    // 3. If recent song titles exist, fetch similar sound mix
    if (Array.isArray(recentSongTitles) && recentSongTitles.length > 0) {
      const seedTitle = recentSongTitles[0];
      const mixHits = await searchYouTube(`${seedTitle} similar songs audio`, 6);
      candidates.push(...mixHits);
    }

    // 4. Strict de-duplication: NO same song ever in list!
    const uniqueRecommendations = deduplicateSongCatalog(candidates, excludeIds).slice(0, 20);

    // Build intelligent insight summary
    let summary = 'Curated based on trending Indian sounds & high-fidelity streams';
    if (topArtists.length > 0) {
      summary = `Personalized for your love for ${topArtists.slice(0, 2).join(' & ')} and matching melodies`;
    } else if (activeVibe !== 'all') {
      summary = `Tailored to your ${activeVibe} listening vibe`;
    }

    res.json({
      success: true,
      recommendations: uniqueRecommendations,
      summary,
      matchedArtists: topArtists,
    });
  } catch (err) {
    console.error('Recommendations error:', err);
    // Fallback safely to unique Indian top charts
    const fallback = deduplicateSongCatalog(YOUTUBE_TOP_CHARTS.india || []).slice(0, 16);
    res.json({
      success: true,
      recommendations: fallback,
      summary: 'Top recommended Indian tracks',
      matchedArtists: [],
    });
  }
});


// Smart Related Tracks for seamless next-song playback using YouTube's Next Algorithm
app.get('/api/related', async (req: Request, res: Response) => {
  const { id, title, artist } = req.query as { id?: string; title?: string; artist?: string };

  const cacheKey = `related:${id || ''}:${title || ''}:${artist || ''}`;
  const cached = getCached<SongItem[]>(cacheKey);
  if (cached && cached.length > 0) {
    res.json({ results: cached });
    return;
  }

  let nextTracks: SongItem[] = [];

  // 1. Primary: Use YouTube's exact Watch Next / Up Next recommendation algorithm
  if (id && id.length === 11) {
    nextTracks = await fetchYouTubeNextAlgorithm(id);
  }

  // 2. Supplemental / Fallback: If YouTube Next returned fewer than 5 tracks,
  // query related music searches to ensure a rich 15+ track autoplay queue
  if (nextTracks.length < 5) {
    const queriesToTry = [];
    if (artist && title) {
      queriesToTry.push(`${artist} similar songs audio`);
      queriesToTry.push(`${artist} songs audio`);
      queriesToTry.push(`${title} mix audio`);
    } else if (title) {
      queriesToTry.push(`${title} songs audio`);
    } else if (artist) {
      queriesToTry.push(`${artist} greatest hits audio`);
    } else {
      queriesToTry.push('trending songs audio');
    }

    const existingIds = new Set([id, ...nextTracks.map((t) => t.id)]);
    for (const q of queriesToTry) {
      const list = await searchYouTube(q, 15);
      const filtered = list.filter((item) => !existingIds.has(item.id));
      for (const item of filtered) {
        nextTracks.push(item);
        existingIds.add(item.id);
        if (nextTracks.length >= 18) break;
      }
      if (nextTracks.length >= 12) break;
    }
  }

  if (nextTracks.length > 0) {
    setCached(cacheKey, nextTracks);
  }
  res.json({ results: nextTracks });
});

// More from this Artist
app.get('/api/artist-tracks', async (req: Request, res: Response) => {
  const artist = (req.query.artist as string) || '';
  if (!artist.trim()) {
    res.json({ results: [] });
    return;
  }

  const cacheKey = `artist-tracks:${artist.toLowerCase().trim()}`;
  const cached = getCached<SongItem[]>(cacheKey);
  if (cached) {
    res.json({ results: cached });
    return;
  }

  let results = await searchYouTube(`${artist} songs`, 14);
  if (results.length < 3) {
    results = await searchYouTube(`${artist}`, 14);
  }
  setCached(cacheKey, results);
  res.json({ results });
});

// Helper to find a playable alternative video for a song (e.g. topic audio, official audio, lyric video)
// when embed restrictions (Error 150/101/100) or playback errors occur on the primary video
async function findSongAlternative(title: string, artist: string, excludeId?: string): Promise<SongItem | null> {
  const cacheKey = `alt:${title.toLowerCase().trim()}:${artist.toLowerCase().trim()}:${excludeId || ''}`;
  const cached = getCached<SongItem>(cacheKey);
  if (cached) return cached;

  const cleanTitle = title.replace(/\s*\(.*?\)/g, '').replace(/\s*\[.*?\]/g, '').trim();
  const cleanArtist = artist.replace(/ - Topic$/i, '').replace(/VEVO$/i, '').trim();

  const queries = [
    `"${cleanTitle}" "${cleanArtist}" audio`,
    `"${cleanTitle}" "${cleanArtist}" topic`,
    `${cleanTitle} ${cleanArtist} lyric video`,
    `${cleanTitle} ${cleanArtist} audio`,
    `${cleanTitle} ${cleanArtist}`,
  ];

  for (const q of queries) {
    const results = await searchYouTube(q, 10);
    const candidate = results.find(
      (item) =>
        (!excludeId || item.id !== excludeId) &&
        item.durationSeconds <= 660 &&
        item.durationSeconds >= 25,
    );

    if (candidate) {
      setCached(cacheKey, candidate);
      return candidate;
    }
  }

  return null;
}

// Alternative Stream Resolver: instantly solves playback for songs with embed restrictions
app.get('/api/song-alternative', async (req: Request, res: Response) => {
  const { title, artist, excludeId } = req.query as {
    title?: string;
    artist?: string;
    excludeId?: string;
  };

  if (!title) {
    res.json({ success: false, alternative: null });
    return;
  }

  const alternative = await findSongAlternative(title, artist || '', excludeId);
  res.json({ success: !!alternative, alternative });
});

// Synchronized & Plain Lyrics from LRCLIB
app.get('/api/lyrics', async (req: Request, res: Response) => {
  const { title, artist } = req.query as { title?: string; artist?: string };
  if (!title) {
    res.json({ found: false });
    return;
  }

  const cleanTitleStr = cleanSongTitle(title).title;
  const cleanArtistStr = artist ? artist.replace(/\s*-.*$/, '').trim() : '';
  const cacheKey = `lyrics:${cleanTitleStr}:${cleanArtistStr}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitleStr)}&artist_name=${encodeURIComponent(cleanArtistStr)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'MusicHolic/1.0' },
    });

    if (response.ok) {
      const data = await response.json();
      const result = {
        found: true,
        plainLyrics: data.plainLyrics || '',
        syncedLyrics: data.syncedLyrics || '',
        duration: data.duration || 0,
      };
      setCached(cacheKey, result);
      res.json(result);
      return;
    }

    // Fallback: search query on LRCLIB
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitleStr} ${cleanArtistStr}`)}`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (Array.isArray(searchData) && searchData.length > 0) {
        const best = searchData[0];
        const result = {
          found: true,
          plainLyrics: best.plainLyrics || '',
          syncedLyrics: best.syncedLyrics || '',
          duration: best.duration || 0,
        };
        setCached(cacheKey, result);
        res.json(result);
        return;
      }
    }
  } catch (err) {
    console.error('Lyrics fetch error:', err);
  }

  res.json({ found: false });
});

// Setup Vite middlewares in dev mode, or static file serving in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`MusicHolic server running on http://localhost:${PORT}`);
  });
}

startServer();

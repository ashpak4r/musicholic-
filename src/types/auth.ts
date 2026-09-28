export interface MusicPreferences {
  favoriteArtists: string[];
  favoriteGenres: string[];
  defaultVibe?: 'all' | 'romantic' | 'punjabi' | 'bollywood' | 'indie' | 'hiphop' | 'lofi';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: number;
  preferences?: MusicPreferences;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: UserProfile;
  error?: string;
}

export interface UserDataSync {
  likedSongs: any[];
  recentlyPlayed: any[];
  searchHistory: string[];
  lastPlayed?: {
    song: any;
    position: number;
    timestamp: number;
  };
  preferences?: MusicPreferences;
}

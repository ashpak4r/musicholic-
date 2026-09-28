import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { UserProfile, UserDataSync } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register';
  setAuthModalTab: (tab: 'login' | 'register') => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  syncUserData: (data: UserDataSync) => Promise<void>;
  updatePreferences: (prefs: Partial<UserProfile['preferences']>) => Promise<void>;
  initialSyncData: UserDataSync | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_TOKEN_KEY = 'musicholic_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_TOKEN_KEY);
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [initialSyncData, setInitialSyncData] = useState<UserDataSync | null>(null);

  // Check existing token on initial load
  useEffect(() => {
    const verifySession = async () => {
      const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (!savedToken) {
        setIsLoadingAuth(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            setToken(savedToken);
            if (data.userData) {
              setInitialSyncData(data.userData);
            }
          } else {
            localStorage.removeItem(STORAGE_TOKEN_KEY);
            setToken(null);
            setUser(null);
          }
        } else {
          localStorage.removeItem(STORAGE_TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } catch (e) {
        console.error('Session verify error:', e);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    verifySession();
  }, []);

  // Login method
  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success && data.token && data.user) {
        localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
        if (data.userData) {
          setInitialSyncData(data.userData);
        }
        setAuthModalOpen(false);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to login' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }, []);

  // Register method
  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (data.success && data.token && data.user) {
        localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
        setAuthModalOpen(false);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to sign up' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }, []);

  // Logout method
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Sync user data to server
  const syncUserData = useCallback(async (data: UserDataSync) => {
    const currentToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (!currentToken) return;

    try {
      await fetch('/api/user/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.warn('Data sync warning:', e);
    }
  }, []);

  // Update user preferences
  const updatePreferences = useCallback(async (newPrefs: any) => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        preferences: {
          ...(prev.preferences || {
            favoriteArtists: ['Arijit Singh', 'Karan Aujla', 'Anuv Jain', 'Sachin-Jigar'],
            favoriteGenres: ['Romantic Melodies', 'Bollywood Hits', 'Punjabi & Desi'],
            defaultVibe: 'all',
          }),
          ...newPrefs,
        },
      };
    });

    const currentToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (!currentToken) return;

    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ preferences: newPrefs }),
      });
    } catch (e) {
      console.warn('Failed to update preferences on server:', e);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoadingAuth,
        authModalOpen,
        setAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        login,
        register,
        logout,
        syncUserData,
        updatePreferences,
        initialSyncData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

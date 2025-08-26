// src/contexts/AuthContext.tsx
import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
// CORRECTED: Import named exports directly
import { getTokens, clearTokens } from '@/utils/tokenManager';
import { signOut } from '@/services/authService';
import { UserProfile } from '@/types/store';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  // CORRECTED: Access state properties from their nested location
  const { login, logout: logoutFromStore } = useAnalyticsStore();
  const isAuthenticated = useAnalyticsStore((state) => state.user.isAuthenticated);
  const userProfile = useAnalyticsStore((state) => state.user.profile);

  const handleLogout = useCallback(() => {
    signOut();
    logoutFromStore();
    clearTokens();
  }, [logoutFromStore]);

  useEffect(() => {
    const initializeSession = async () => {
      const tokens = getTokens();
      if (tokens && tokens.idToken) {
        try {
          const decoded: { exp: number; email: string; name?: string } = jwtDecode(tokens.idToken);
          const expiresAt = decoded.exp * 1000;

          if (expiresAt > Date.now()) {
            login({
              profile: { email: decoded.email, name: decoded.name },
              idToken: tokens.idToken,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt,
            });
          } else {
            handleLogout();
          }
        } catch (error) {
          console.error('Failed to decode token:', error);
          handleLogout();
        }
      }
      setIsLoading(false);
    };

    initializeSession();
  }, [login, handleLogout]);

  // CORRECTED: Pass the correct user profile object to the context value
  const value = {
    isAuthenticated,
    isLoading,
    user: userProfile,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
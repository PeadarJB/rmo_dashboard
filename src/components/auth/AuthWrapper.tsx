import React, { useState, useEffect } from 'react';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { LoginPage } from '@/pages/loginPage';
import { LoadingScreen } from '@/components/layout';

// Helper to check the environment variable for bypass mode.
// Vite exposes these variables on `import.meta.env`.
const VITE_SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  // We use the Zustand store to manage the authentication state globally.
  const isAuthenticated = useAnalyticsStore((state) => state.user.isAuthenticated);
  const setAuthenticated = useAnalyticsStore((state) => state.setAuthenticated);

  // A local loading state to prevent flashes of content.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect runs once on component mount to check the auth status.
    const checkAuthStatus = () => {
      if (VITE_SKIP_AUTH) {
        // If bypass mode is on, we simulate a successful login.
        console.warn('Authentication is bypassed for development.');
        setAuthenticated(true);
      } else {
        // In a real scenario, this is where you'd call Amplify's
        // `getCurrentUser()` to check for an active session.
        // For now, we'll assume the user is not logged in.
        setAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, [setAuthenticated]);

  if (isLoading) {
    // Show a full-screen loader while we check the auth status.
    return <LoadingScreen variant="full" />;
  }

  if (isAuthenticated) {
    // If the user is authenticated, render the main application.
    return <>{children}</>;
  }

  // Otherwise, render the login page.
  return <LoginPage />;
};
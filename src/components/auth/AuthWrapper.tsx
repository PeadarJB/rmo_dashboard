import React, { useState, useEffect } from 'react';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { LoginPage } from '@/pages/loginPage';
import { GlobalLoader } from '@/components/layout/GlobalLoader';
import { useAppInitializer } from '@/hooks/useAppInitializer'; // <-- Import the new hook
import { Alert } from 'antd';

const VITE_SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const isAuthenticated = useAnalyticsStore((state) => state.user.isAuthenticated);
  const setAuthenticated = useAnalyticsStore((state) => state.setAuthenticated);
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);

  // Use the new initializer hook
  const { isLoading: isInitializing, error: initError, progressMessage } = useAppInitializer();

  useEffect(() => {
    const checkAuthStatus = () => {
      if (VITE_SKIP_AUTH) {
        console.warn('Authentication is bypassed for development.');
        setAuthenticated(true);
      } else {
        // This is where you'd call Amplify's getCurrentUser()
        setAuthenticated(false);
      }
      setIsAuthCheckComplete(true);
    };

    checkAuthStatus();
  }, [setAuthenticated]);

  if (!isAuthCheckComplete) {
    // Show a minimal loader while checking the initial auth state
    return <GlobalLoader message="Authenticating..." />;
  }

  if (isAuthenticated) {
    if (isInitializing) {
      // After auth, show the app initializer's loading state
      return <GlobalLoader message={progressMessage} />;
    }

    if (initError) {
      // If initialization fails, show an error message
      return (
        <div style={{ padding: '50px' }}>
          <Alert
            message="Initialization Error"
            description={initError}
            type="error"
            showIcon
          />
        </div>
      );
    }

    // If authenticated and initialized, show the main app
    return <>{children}</>;
  }

  // If not authenticated, show the login page
  return <LoginPage />;
};
// src/components/auth/AuthWrapper.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/layout';
import { useEffect } from 'react';
import { logger } from '@/utils/logger';

interface AuthWrapperProps {
  children: React.ReactNode;
}

/**
 * Protected Route component that:
 * 1. Shows a loading screen while the session is being verified
 * 2. Redirects to /login if user is not authenticated
 * 3. Renders protected content if user is authenticated
 * 4. Preserves the originally requested path for post-login redirect
 */
export function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Log authentication check for debugging
    if (!isLoading) {
      logger.info('AuthWrapper', `Auth check complete. Authenticated: ${isAuthenticated}`, {
        path: location.pathname
      });
    }
  }, [isAuthenticated, isLoading, location.pathname]);

  // Development-only bypass (kept for convenience during development)
  //const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'false';
  //if (import.meta.env.DEV && skipAuth) {
  //  logger.warn('AuthWrapper', 'Authentication bypassed (DEV MODE with VITE_SKIP_AUTH=true)');
 //   return <>{children}</>;
  //}

  // Show loading screen while checking authentication status
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    logger.info('AuthWrapper', 'User not authenticated, redirecting to login', {
      from: location.pathname
    });
    
    // Pass the current location in state so CallbackPage knows where to redirect after login
    // This preserves deep links and improves user experience
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
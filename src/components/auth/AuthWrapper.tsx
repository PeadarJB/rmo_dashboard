// src/components/auth/AuthWrapper.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/layout';
import { useAppInitializer } from '@/hooks/useAppInitializer'; // ADD THIS
import { useEffect } from 'react';
import { logger } from '@/utils/logger';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const location = useLocation();
  
  // ADD THIS: Initialize app data when authenticated
  const { 
    isLoading: dataLoading, 
    error: dataError, 
    progressMessage 
  } = useAppInitializer();

  useEffect(() => {
    if (!authLoading) {
      logger.info('AuthWrapper', `Auth check complete. Authenticated: ${isAuthenticated}`, {
        path: location.pathname
      });
    }
  }, [isAuthenticated, authLoading, location.pathname]);

  // Show loading screen while checking auth OR loading data
  if (authLoading || dataLoading) {
    return <LoadingScreen message={progressMessage} />;
  }

  // Handle data loading errors
  if (dataError) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh' 
      }}>
        <h2>Error Loading Application Data</h2>
        <p>{dataError}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!isAuthenticated) {
    logger.info('AuthWrapper', 'User not authenticated, redirecting to login', {
      from: location.pathname
    });
    
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // User is authenticated and data is loaded
  return <>{children}</>;
}
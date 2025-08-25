import React, { ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAppInitializer } from '../../hooks';
import { LoadingScreen } from '../layout';

interface AuthWrapperProps {
  children: ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  // Correctly destructure isLoading from the hook's return value
  const { isLoading, error } = useAppInitializer();
  const location = useLocation();

  const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true';

  if (skipAuth) {
    // Use isLoading instead of isInitialized
    if (isLoading) {
      // Removed the invalid 'message' prop
      return <LoadingScreen />;
    }
    return <>{children}</>;
  }

  const isAuthenticated = false; // Placeholder for new logic

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (error) {
    // You can enhance LoadingScreen to accept an error message if needed,
    // but for now, we'll show a generic one.
    console.error('Initialization Error:', error);
    return <LoadingScreen />;
  }

  // Use isLoading for the loading check
  if (isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
};

export default AuthWrapper;

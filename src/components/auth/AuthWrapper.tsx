// src/components/auth/AuthWrapper.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext'; // Assuming you created this in Phase 5
import { LoadingScreen } from '@/components/layout';

interface AuthWrapperProps {
  children: React.ReactNode;
}

/**
 * This component now acts as a Protected Route.
 * It checks the authentication state from the AuthContext and handles redirects.
 * 1. Shows a loading screen while the session is being verified.
 * 2. If the user is not authenticated, it redirects them to the /login page.
 * 3. If the user is authenticated, it renders the protected child components.
 */
export function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Development-only flag to bypass authentication for easier testing
  const VITE_SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true';
  if (import.meta.env.DEV && VITE_SKIP_AUTH) {
    return <>{children}</>;
  }

  // While checking for a session, show a full-page loader
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If not authenticated, redirect to the login page
  if (!isAuthenticated) {
    // Pass the original location to redirect back after successful login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the requested component
  return <>{children}</>;
}
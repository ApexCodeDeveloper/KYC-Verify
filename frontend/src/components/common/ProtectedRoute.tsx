import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

export const ProtectedRoute: React.FC = () => {
  const { user, loading, isConfigured } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Authenticating session..." size="lg" />
      </div>
    );
  }

  // If Supabase is configured and there's no active user session, redirect to login
  if (isConfigured && !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

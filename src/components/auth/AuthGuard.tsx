import React from 'react';
import { Navigate, useLocation } from '@tanstack/react-router';
import { useAuthStore } from '../../store/authStore';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((state) => state.session);
  const location = useLocation();

  if (!session && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (session && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

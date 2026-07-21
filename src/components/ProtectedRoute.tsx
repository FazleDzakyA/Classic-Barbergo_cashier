import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'cashier'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0F0F0F',
        color: '#D4AF37',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid #1A1A1A',
          borderTopColor: '#D4AF37',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>MEMUAT BARBERFLOW...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as any)) {
    // Redirect unauthorized roles back to appropriate homepage
    if (user.role === 'cashier') {
      return <Navigate to="/cashier" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

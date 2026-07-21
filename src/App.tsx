import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { SessionProvider } from './store/SessionContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Cashier } from './pages/Cashier';
import { TransactionsHistory } from './pages/TransactionsHistory';
import { BarberManagement } from './pages/BarberManagement';
import { ServiceManagement } from './pages/ServiceManagement';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Backup } from './pages/Backup';
import { Toaster } from 'react-hot-toast';

const HomeRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'cashier') {
    return <Navigate to="/cashier" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Main Routes (Wrapped in AppLayout) */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Redirect root to appropriate page depending on role */}
              <Route index element={<HomeRedirect />} />
              
              {/* Pages restricted to Admin ONLY */}
              <Route 
                path="dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="expenses" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Expenses />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="barbers" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <BarberManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="services" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ServiceManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="reports" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Reports />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="settings" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="backup" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Backup />
                  </ProtectedRoute>
                } 
              />

              {/* Pages accessible by both Admin & Cashier */}
              <Route 
                path="cashier" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                    <Cashier />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="history" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                    <TransactionsHistory />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Fallback redirection */}
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>

      {/* Global Toast Notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A1A',
            color: '#FFFFFF',
            border: '1px solid #2B2B2B',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontFamily: 'Inter, sans-serif'
          },
          success: {
            iconTheme: {
              primary: '#D4AF37', // Gold
              secondary: '#1A1A1A'
            }
          },
          error: {
            iconTheme: {
              primary: '#EF4444', // Red
              secondary: '#1A1A1A'
            }
          }
        }}
      />
    </AuthProvider>
  );
};

export default App;

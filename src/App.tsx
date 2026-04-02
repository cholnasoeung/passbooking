import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import DriverDashboard from './pages/DriverDashboard';

const PrivateRoute = ({
  children,
  allowedRole
}: {
  children: React.ReactNode;
  allowedRole: 'user' | 'driver';
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-grab-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allowedRole) {
    return <Navigate to={user.role === 'driver' ? '/driver' : '/user'} replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user
            ? <Navigate to={user.role === 'driver' ? '/driver' : '/user'} replace />
            : <Login />
        }
      />
      <Route
        path="/user"
        element={
          <PrivateRoute allowedRole="user">
            <UserDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/driver"
        element={
          <PrivateRoute allowedRole="driver">
            <DriverDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="*"
        element={
          user
            ? <Navigate to={user.role === 'driver' ? '/driver' : '/user'} replace />
            : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;

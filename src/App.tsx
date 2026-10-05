import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Tracks } from './pages/Tracks';
import { Analytics } from './pages/Analytics';
import { Targets } from './pages/Targets';
import { Achievements } from './pages/Achievements';
import { ToDoList } from './pages/ToDoList';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { ResetPassword } from './pages/ResetPassword';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading, isPasswordRecovery } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary font-body-md">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
          <span>Loading LevelUp...</span>
        </div>
      </div>
    );
  }

  if (isPasswordRecovery) {
    return <Navigate to="/reset-password" replace />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/tracks" element={<ProtectedRoute><Tracks /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/targets" element={<ProtectedRoute><Targets /></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
            <Route path="/todo" element={<ProtectedRoute><ToDoList /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

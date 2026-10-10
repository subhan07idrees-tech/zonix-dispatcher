import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import OrganizationsPage from './pages/OrganizationsPage';
import UsersPage from './pages/UsersPage';
import ProxiesPage from './pages/ProxiesPage';
import SessionsPage from './pages/SessionsPage';
import LogsPage from './pages/LogsPage';
import DiagnosticsPage from './pages/DiagnosticsPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-[#475569] tracking-normal">Initializing Zonix Control Node...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="proxies" element={<ProxiesPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="diagnostics" element={<DiagnosticsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}

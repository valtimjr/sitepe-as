"use client";

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import Layout from './components/Layout';
import { SessionContextProvider, useSession } from './components/SessionContextProvider';
import { CompanyProvider } from './context/CompanyContext';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { session, loading, isAdmin } = useSession();

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />
        {/* Rota de pesquisa removida conforme solicitado */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <SessionContextProvider>
      <CompanyProvider>
        <AppRoutes />
        <Toaster position="top-right" />
      </CompanyProvider>
    </SessionContextProvider>
  );
}

export default App;
"use client";

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionContextProvider } from './components/SessionContextProvider';
import { CompanyProvider } from './context/CompanyContext';
import Layout from './components/Layout';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Páginas
import Index from './pages/Index';
import Login from './pages/Login';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UserSettingsPage from './pages/UserSettingsPage';
import DatabaseManagerPage from './pages/DatabaseManagerPage';
import PartsList from './pages/PartsList';
import ServiceOrderList from './pages/ServiceOrderList';
import TimeTrackingPage from './pages/TimeTrackingPage';
import CustomMenuOverview from './pages/CustomMenuOverview';
import CustomListPage from './pages/CustomListPage';
import AdminReportPage from './pages/AdminReportPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <SessionContextProvider>
        <CompanyProvider>
          <TooltipProvider>
            <Routes>
              {/* Rotas Públicas de Autenticação */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup/:uuid" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/cookie-policy" element={<CookiePolicyPage />} />

              {/* Redirecionamento Inicial */}
              <Route path="/" element={<Navigate to="/usina_vale" replace />} />

              {/* Rotas com Layout (Header + Sidebar) */}
              <Route path="/:company" element={<Layout />}>
                <Route index element={<Index />} />
                <Route path="parts-list" element={<PartsList />} />
                <Route path="service-orders" element={<ServiceOrderList />} />
                <Route path="time-tracking" element={<TimeTrackingPage />} />
                <Route path="admin" element={<DatabaseManagerPage />} />
                <Route path="admin-report" element={<AdminReportPage />} />
                <Route path="settings" element={<UserSettingsPage />} />
                <Route path="custom-menu-view" element={<CustomMenuOverview />} />
                <Route path="custom-list/:listId" element={<CustomListPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            <Toaster />
          </TooltipProvider>
        </CompanyProvider>
      </SessionContextProvider>
    </BrowserRouter>
  );
}

export default App;
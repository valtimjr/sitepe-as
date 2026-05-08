"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SessionContextProvider } from './components/SessionContextProvider';
import { CompanyProvider } from './context/CompanyContext';
import LandingPage from './pages/LandingPage';
import Index from './pages/Index';
import ServiceOrderPage from './pages/ServiceOrderPage';
import TimeTrackingPage from './pages/TimeTrackingPage';
import MonthlySummaryPage from './pages/MonthlySummaryPage';
import UserSettingsPage from './pages/UserSettingsPage';
import AdminReportPage from './pages/AdminReportPage';
import MenuManagerPage from './pages/MenuManagerPage';
import AdminConfigPage from './pages/AdminConfigPage';
import CustomMenuView from './pages/CustomMenuView';
import TagManagerPage from './pages/TagManagerPage';
import LoginPage from './pages/Login';
import InviteValidator from './pages/InviteValidator';
import ToasterProvider from './components/ToastProvider';

function App() {
  return (
    <SessionContextProvider>
      <CompanyProvider>
        <Router>
          <Routes>
            {/* Landing & Auth */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/validate-invite" element={<InviteValidator />} />
            
            {/* Company Routes */}
            <Route path="/:company" element={<Index />} />
            <Route path="/:company/service-orders" element={<ServiceOrderPage />} />
            <Route path="/:company/time-tracking" element={<TimeTrackingPage />} />
            <Route path="/:company/monthly-summary" element={<MonthlySummaryPage />} />
            <Route path="/:company/settings" element={<UserSettingsPage />} />
            
            {/* Admin Routes */}
            <Route path="/:company/admin-report" element={<AdminReportPage />} />
            <Route path="/:company/menu-manager" element={<MenuManagerPage />} />
            <Route path="/:company/admin-config" element={<AdminConfigPage />} />
            <Route path="/:company/manage-tags" element={<TagManagerPage />} />
            
            {/* Dynamic Custom Menu */}
            <Route path="/:company/menu/:menuId" element={<CustomMenuView />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToasterProvider />
        </Router>
      </CompanyProvider>
    </SessionContextProvider>
  );
}

export default App;
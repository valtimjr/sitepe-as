"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SessionContextProvider } from './components/SessionContextProvider';
import { CompanyProvider } from './context/CompanyContext';
import LandingPage from './pages/LandingPage';
import Index from './pages/Index';
import ServiceOrderList from './pages/ServiceOrderList';
import TimeTrackingPage from './pages/TimeTrackingPage';
import UserSettingsPage from './pages/UserSettingsPage';
import AdminReportPage from './pages/AdminReportPage';
import MenuManagerPage from './pages/MenuManagerPage';
import AdminConfigPage from './pages/AdminConfigPage';
import TagManagerPage from './pages/TagManagerPage';
import DatabaseManagerPage from './pages/DatabaseManagerPage';
import LoginPage from './pages/Login';
import SignupPage from './pages/SignupPage';
import PartsList from './pages/PartsList';
import SearchParts from './pages/SearchParts';
import CustomListPage from './pages/CustomListPage';
import CustomMenuOverview from './pages/CustomMenuOverview';
import MyCustomListsPage from './pages/MyCustomListsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import NotFound from './pages/NotFound';
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
            <Route path="/signup/:uuid" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/cookie-policy" element={<CookiePolicyPage />} />
            
            {/* Company Routes */}
            <Route path="/:company" element={<Index />} />
            <Route path="/:company/service-orders" element={<ServiceOrderList />} />
            <Route path="/:company/time-tracking" element={<TimeTrackingPage />} />
            <Route path="/:company/settings" element={<UserSettingsPage />} />
            <Route path="/:company/parts-list" element={<PartsList />} />
            <Route path="/:company/search-parts" element={<SearchParts />} />
            <Route path="/:company/custom-menu-view" element={<CustomMenuOverview />} />
            <Route path="/:company/custom-list/:listId" element={<CustomListPage />} />
            <Route path="/:company/my-custom-lists" element={<MyCustomListsPage />} />
            
            {/* Admin Routes */}
            <Route path="/:company/admin" element={<DatabaseManagerPage />} />
            <Route path="/:company/admin-report" element={<AdminReportPage />} />
            <Route path="/:company/menu-manager" element={<MenuManagerPage />} />
            <Route path="/:company/admin-config" element={<AdminConfigPage />} />
            <Route path="/:company/manage-tags" element={<TagManagerPage />} />
            
            {/* Fallback */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
          <ToasterProvider />
        </Router>
      </CompanyProvider>
    </SessionContextProvider>
  );
}

export default App;
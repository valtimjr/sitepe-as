import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SearchParts from "./pages/SearchParts";
import PartsList from "./pages/PartsList";
import ServiceOrderList from "./pages/ServiceOrderList";
import Login from "./pages/Login";
import DatabaseManagerPage from "./pages/DatabaseManagerPage";
import SignupPage from "./pages/SignupPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import UserSettingsPage from "./pages/UserSettingsPage";
import TimeTrackingPage from "./pages/TimeTrackingPage";
import CustomListPage from "./pages/CustomListPage";
import MyCustomListsPage from "./pages/MyCustomListsPage";
import CustomMenuOverview from "./pages/CustomMenuOverview";
import CookiePolicyPage from "./pages/CookiePolicyPage";
import { SessionContextProvider } from "./components/SessionContextProvider";
import AppHeader from "./components/AppHeader";
import CookieConsentBanner from "./components/CookieConsentBanner";
import { useOfflineSync } from "./hooks/useOfflineSync";
import WelcomeModal from "./components/WelcomeModal";
import { CompanyProvider } from "./context/CompanyContext";
import AdminReportPage from "./pages/AdminReportPage";

const queryClient = new QueryClient();

const CompanyLayout = () => {
  return (
    <>
      <AppHeader />
      <Outlet />
      <WelcomeModal />
      <CookieConsentBanner />
    </>
  );
};

const AppWrapper = () => {
  return (
    <BrowserRouter>
      <SessionContextProvider>
        <CompanyProvider>
          <AppContent />
        </CompanyProvider>
      </SessionContextProvider>
    </BrowserRouter>
  );
};

const AppContent = () => {
  useOfflineSync();
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/usina_vale" replace />} />
      
      {/* Routes that DON'T need company prefix (auth related mostly) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup/:uuid" element={<SignupPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/cookie-policy" element={<CookiePolicyPage />} />

      {/* Routes WITH company prefix */}
      <Route path="/:company" element={<CompanyLayout />}>
        <Route index element={<Index />} />
        <Route path="search-parts" element={<SearchParts />} />
        <Route path="parts-list" element={<PartsList />} />
        <Route path="service-orders" element={<ServiceOrderList />} />
        <Route path="admin" element={<DatabaseManagerPage />} />
        <Route path="settings" element={<UserSettingsPage />} />
        <Route path="time-tracking" element={<TimeTrackingPage />} />
        <Route path="admin-report" element={<AdminReportPage />} />
        <Route path="custom-list/:listId" element={<CustomListPage />} />

        <Route path="my-custom-lists" element={<MyCustomListsPage />} />
        <Route path="custom-menu-view" element={<CustomMenuOverview />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppWrapper />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
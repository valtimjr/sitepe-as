import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionContextProvider } from "./components/SessionContextProvider";
import AppHeader from "./components/AppHeader";
import CookieConsentBanner from "./components/CookieConsentBanner";
import { useOfflineSync } from "./hooks/useOfflineSync";
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

const Index = React.lazy(() => import("./pages/Index"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const SearchParts = React.lazy(() => import("./pages/SearchParts"));
const PartsList = React.lazy(() => import("./pages/PartsList"));
const ServiceOrderList = React.lazy(() => import("./pages/ServiceOrderList"));
const Login = React.lazy(() => import("./pages/Login"));
const DatabaseManagerPage = React.lazy(() => import("./pages/DatabaseManagerPage"));
const SignupPage = React.lazy(() => import("./pages/SignupPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const ForgotPasswordPage = React.lazy(() => import("./pages/ForgotPasswordPage"));
const UserSettingsPage = React.lazy(() => import("./pages/UserSettingsPage"));
const TimeTrackingPage = React.lazy(() => import("./pages/TimeTrackingPage"));
const CustomListPage = React.lazy(() => import("./pages/CustomListPage"));
const MyCustomListsPage = React.lazy(() => import("./pages/MyCustomListsPage"));
const CustomMenuOverview = React.lazy(() => import("./pages/CustomMenuOverview"));
const CookiePolicyPage = React.lazy(() => import("./pages/CookiePolicyPage"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="ml-2">Carregando...</p>
  </div>
);

const AppWrapper = () => {
  return (
    <BrowserRouter>
      <SessionContextProvider>
        <AppContent />
      </SessionContextProvider>
    </BrowserRouter>
  );
};

const AppContent = () => {
  useOfflineSync();
  
  return (
    <>
      <AppHeader />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/search-parts" element={<SearchParts />} />
          <Route path="/parts-list" element={<PartsList />} />
          <Route path="/service-orders" element={<ServiceOrderList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<DatabaseManagerPage />} />
          <Route path="/signup/:uuid" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/settings" element={<UserSettingsPage />} />
          <Route path="/time-tracking" element={<TimeTrackingPage />} />
          <Route path="/custom-list/:listId" element={<CustomListPage />} />
          <Route path="/my-custom-lists" element={<MyCustomListsPage />} />
          <Route path="/custom-menu-view" element={<CustomMenuOverview />} />
          <Route path="/cookie-policy" element={<CookiePolicyPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <CookieConsentBanner />
    </>
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
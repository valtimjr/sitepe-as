import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import CookiePolicyPage from "./pages/CookiePolicyPage"; // Importar a nova página
import { SessionContextProvider } from "./components/SessionContextProvider";
import AppHeader from "./components/AppHeader";
import CookieConsentBanner from "./components/CookieConsentBanner";
import { useOfflineSync } from "./hooks/useOfflineSync"; // Importar o novo hook

const queryClient = new QueryClient();

// Componente Wrapper para usar o hook
const AppWrapper = () => {
  // O hook useOfflineSync deve ser chamado dentro do SessionContextProvider
  // Vamos movê-lo para o componente SessionContextProvider ou para um componente filho.
  // Para simplificar, vamos envolver o AppWrapper com BrowserRouter e SessionContextProvider
  // e mover a chamada do hook para um componente que encapsula as rotas.

  return (
    <BrowserRouter> {/* Removida a propriedade 'future' */}
      <SessionContextProvider>
        <AppContent />
      </SessionContextProvider>
    </BrowserRouter>
  );
};

// Novo componente para conter o hook e as rotas
const AppContent = () => {
  useOfflineSync();
  
  return (
    <>
      <AppHeader />
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
        <Route path="/cookie-policy" element={<CookiePolicyPage />} /> {/* Nova rota */}
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppWrapper />
    </TooltipProvider>
    <CookieConsentBanner />
  </QueryClientProvider>
);

export default App;
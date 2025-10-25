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
import AnnualScheduleView from "./pages/AnnualScheduleView";
import MenuManagerPage from "./pages/MenuManagerPage";
import CustomListPage from "./pages/CustomListPage"; // Importar nova página
import MyCustomListsPage from "./pages/MyCustomListsPage"; // Importar nova página
import { SessionContextProvider } from "./components/SessionContextProvider";
import AppHeader from "./components/AppHeader";
import CookieConsentBanner from "./components/CookieConsentBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* O Toaster do Radix UI (components/ui/toaster) e o Toaster do Sonner (components/ui/sonner)
          estavam sendo renderizados aqui e também dentro do SessionContextProvider.
          Para evitar duplicação e o aviso do React, removemos daqui.
          O SessionContextProvider agora é responsável por renderizar o Toaster do Sonner.
          O Toaster do Radix UI não parece estar sendo usado ativamente pelas funções de toast em src/utils/toast.ts,
          que utilizam 'sonner'. Se for necessário no futuro, pode ser reintroduzido. */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SessionContextProvider>
          <AppHeader /> {/* Adicionar o cabeçalho aqui */}
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
            <Route path="/schedule-view" element={<AnnualScheduleView />} />
            <Route path="/menu-manager" element={<MenuManagerPage />} />
            <Route path="/custom-list/:listId" element={<CustomListPage />} />
            <Route path="/my-custom-lists" element={<MyCustomListsPage />} /> {/* Nova Rota */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
    <CookieConsentBanner />
  </QueryClientProvider>
);

export default App;
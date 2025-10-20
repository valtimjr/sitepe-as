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
import Login from "./pages/Login"; // Importar a página de Login
import AdminDashboard from "./pages/AdminDashboard"; // Importar a página de Admin
import { SessionContextProvider } from "./components/SessionContextProvider"; // Importar o provedor de sessão

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider> {/* Envolve toda a aplicação com o provedor de sessão */}
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search-parts" element={<SearchParts />} />
            <Route path="/parts-list" element={<PartsList />} />
            <Route path="/service-orders" element={<ServiceOrderList />} />
            <Route path="/login" element={<Login />} /> {/* Rota para a página de login */}
            <Route path="/admin" element={<AdminDashboard />} /> {/* Rota para o painel de administração */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
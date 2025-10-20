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
import AdminDashboard from "./pages/AdminDashboard";
import SignupPage from "./pages/SignupPage"; // Importar a nova página de cadastro
import { SessionContextProvider } from "./components/SessionContextProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search-parts" element={<SearchParts />} />
            <Route path="/parts-list" element={<PartsList />} />
            <Route path="/service-orders" element={<ServiceOrderList />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/signup/:uuid" element={<SignupPage />} /> {/* Nova rota para cadastro por convite */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
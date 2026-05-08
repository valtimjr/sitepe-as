"use client";

import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ClipboardList, 
  BarChart3, 
  Settings, 
  LayoutDashboard, 
  LogOut,
  ChevronRight,
  Menu,
  Wrench,
  Clock,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useCompany } from '@/context/CompanyContext';

const Index = () => {
  const { user, profile, isLoading } = useSession();
  const { company, branding } = useCompany();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Erro ao sair.');
    } else {
      showSuccess('Saiu com sucesso!');
      navigate('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Settings className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando painel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  return (
    <div className="min-h-screen flex flex-col p-4 bg-background max-w-5xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-4 mt-8">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-extrabold text-primary flex items-center gap-3">
            <LayoutDashboard className="h-9 w-9" />
            AutoBoard
          </h1>
          <p className="text-muted-foreground font-medium">Unidade: <span className="text-foreground">{branding.name}</span></p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link to={`/${company}/settings`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Main Features */}
        <Card className="hover:shadow-lg transition-shadow border-primary/20 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Ordens de Serviço
            </CardTitle>
            <CardDescription>Registre e visualize seus apontamentos diários.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={`/${company}/service-orders`}>
              <Button className="w-full group-hover:gap-3 transition-all">
                Acessar OS <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-primary/20 group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Apontamentos Mensais
            </CardTitle>
            <CardDescription>Resumo de todas as suas horas trabalhadas no mês.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={`/${company}/monthly-summary`}>
              <Button className="w-full group-hover:gap-3 transition-all" variant="outline">
                Ver Resumo <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Admin Tools */}
        {isAdmin && (
          <div className="md:col-span-2 mt-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 opacity-80">
              <Settings className="h-5 w-5" /> Ferramentas Administrativas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link to={`/${company}/admin-report`}>
                <Button variant="secondary" className="w-full justify-start gap-3 h-12">
                  <BarChart3 className="h-5 w-5" /> Relatórios Gerais
                </Button>
              </Link>
              <Link to={`/${company}/menu-manager`}>
                <Button variant="secondary" className="w-full justify-start gap-3 h-12">
                  <Menu className="h-5 w-5" /> Gerenciar Menus
                </Button>
              </Link>
              <Link to={`/${company}/admin-config`}>
                <Button variant="secondary" className="w-full justify-start gap-3 h-12">
                  <Briefcase className="h-5 w-5" /> Profissões e Turnos
                </Button>
              </Link>
              <Link to={`/${company}/manage-tags`}>
                <Button variant="secondary" className="w-full justify-start gap-3 h-12">
                  <Wrench className="h-5 w-5" /> Gerenciar Tags
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto py-8">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;
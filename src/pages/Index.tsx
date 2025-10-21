import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react'; // Removido LogIn, Settings, User
import { useSession } from '@/components/SessionContextProvider';

const Index = () => {
  const { checkPageAccess } = useSession(); // Obter checkPageAccess do contexto

  useEffect(() => {
    document.title = "Gerenciador de Peças - Início";
  }, []);

  const canAccessAdmin = checkPageAccess('/admin'); // Verifica se o usuário pode acessar /admin

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      {/* Removido o div com os botões de login/configurações */}
      <img src="/Logo.png" alt="Logo do Aplicativo" className="h-80 w-80 mb-6 mx-auto" />
      <h1 className="text-5xl font-extrabold mb-12 text-center text-primary dark:text-primary">
        Bem-vindo ao Gerenciador de Peças
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-4xl">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Pesquisar Peças</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Encontre rapidamente qualquer peça automotiva por código ou descrição.
            </p>
            <Link to="/search-parts">
              <Button className="w-full">Ir para Pesquisa</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Minha Lista de Peças</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Gerencie sua lista de peças, adicione novos itens e exporte para PDF.
            </p>
            <Link to="/parts-list">
              <Button className="w-full">Ir para Lista</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Ordens de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">
              Visualize e gerencie as ordens de serviço com suas peças associadas.
            </p>
            <Link to="/service-orders">
              <Button className="w-full">Ir para Ordens</Button>
            </Link>
          </CardContent>
        </Card>

        {canAccessAdmin && ( // Renderiza o card apenas se o usuário tiver acesso a /admin
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Database className="h-6 w-6" /> Gerenciador de Banco de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-muted-foreground">
                Adicione, edite e gerencie peças e AFs diretamente no banco de dados.
              </p>
              <Link to="/admin">
                <Button className="w-full">Acessar Gerenciador</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;
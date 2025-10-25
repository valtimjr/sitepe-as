import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, List as ListIcon, Loader2, FileText } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { CustomList } from '@/types/supabase';
import { getCustomLists } from '@/services/customListService';

const MyCustomListsPage: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "Minhas Listas Personalizadas - AutoBoard";
  }, []);

  const loadLists = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedLists = await getCustomLists(user.id);
      setLists(fetchedLists);
    } catch (error) {
      showError('Erro ao carregar suas listas personalizadas.');
      console.error('Failed to load custom lists:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isSessionLoading) {
      loadLists();
    }
  }, [isSessionLoading, loadLists]);

  if (isSessionLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando listas...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
        <p className="text-center text-muted-foreground py-8">Faça login para ver suas listas personalizadas.</p>
        <Link to="/login">
          <Button>Ir para Login</Button>
        </Link>
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 mt-8">
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para o Início
          </Button>
        </Link>
      </div>
      
      <h1 className="text-4xl font-extrabold mb-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <ListIcon className="h-8 w-8 text-primary" />
        Minhas Listas Personalizadas
      </h1>

      <Card className="w-full max-w-4xl mx-auto mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Listas Criadas por Você</CardTitle>
        </CardHeader>
        <CardContent>
          {lists.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Você ainda não criou nenhuma lista personalizada.
              {/* Se o usuário for admin, sugere ir para o gerenciador */}
              {user && user.id && (
                <span className="block mt-4">
                  {/* Assumindo que o admin tem acesso ao menu-manager */}
                  Se você for um administrador, gerencie e crie listas em <Link to="/menu-manager" className="text-primary hover:underline">Gerenciar Menus & Listas</Link>.
                </span>
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título da Lista</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.map((list) => (
                    <TableRow key={list.id}>
                      <TableCell className="font-medium">{list.title}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/custom-list/${list.id}`}>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Visualizar Itens
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default MyCustomListsPage;
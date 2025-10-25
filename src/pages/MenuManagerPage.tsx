import React, { useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Menu, List as ListIcon } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import MenuStructureEditor from '@/components/MenuStructureEditor';
import CustomListManager from '@/components/CustomListManager'; // Será criado na próxima etapa
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showSuccess } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';

const MenuManagerPage: React.FC = () => {
  const { checkPageAccess } = useSession();

  useEffect(() => {
    document.title = "Gerenciador de Menus e Listas - AutoBoard";
  }, []);

  const handleMenuUpdate = useCallback(() => {
    // Força a atualização do AppHeader
    showSuccess('Estrutura do menu atualizada. O cabeçalho será recarregado.');
  }, []);

  if (!checkPageAccess('/menu-manager')) {
    return null; // Redirecionamento é tratado pelo SessionContextProvider
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-6xl flex justify-between items-center mb-4 mt-8">
        <Link to="/admin">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para Admin
          </Button>
        </Link>
      </div>
      
      <h1 className="text-4xl font-extrabold mb-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <Menu className="h-8 w-8 text-primary" />
        Gerenciador de Menus e Listas
      </h1>

      <Tabs defaultValue="structure" className="w-full max-w-6xl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="structure" className="flex items-center gap-2">
            <Menu className="h-4 w-4" /> Estrutura do Menu
          </TabsTrigger>
          <TabsTrigger value="lists" className="flex items-center gap-2">
            <ListIcon className="h-4 w-4" /> Listas Personalizadas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="structure">
          <MenuStructureEditor onMenuUpdated={handleMenuUpdate} />
        </TabsContent>
        <TabsContent value="lists">
          {/* O componente CustomListManager será implementado na próxima etapa */}
          <CustomListManager />
        </TabsContent>
      </Tabs>
      <MadeWithDyad />
    </div>
  );
};

export default MenuManagerPage;
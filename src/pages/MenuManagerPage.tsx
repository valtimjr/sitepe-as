import React, { useEffect, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Menu, List as ListIcon, ChevronLeft } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import MenuStructureEditor from '@/components/MenuStructureEditor';
import CustomListManager from '@/components/CustomListManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';

interface MenuManagerPageProps {
  isEmbedded?: boolean;
}

const MenuManagerPage: React.FC<MenuManagerPageProps> = ({ isEmbedded = false }) => {
  const { checkPageAccess } = useSession();
  const { company, branding } = useCompany();

  useEffect(() => {
    if (!isEmbedded) {
      document.title = `Gerenciador de Menus - AutoBoard (${branding.name})`;
    }
  }, [isEmbedded, branding.name]);

  const [tab, setTab] = useState('structure');
  const [editListId, setEditListId] = useState<string | null>(null);

  // Os toasts de sucesso já saem do editor; nada extra a fazer aqui.
  const handleMenuUpdate = useCallback(() => {}, []);

  const handleEditList = useCallback((listId: string) => {
    setEditListId(listId);
    setTab('lists');
  }, []);

  if (!checkPageAccess('/menu-manager')) {
    return null; // Redirecionamento é tratado pelo SessionContextProvider
  }

  return (
    <div className={isEmbedded ? "w-full" : "min-h-screen flex flex-col items-center p-4 bg-background text-foreground"}>
      {!isEmbedded && (
        <div className="w-full max-w-6xl flex justify-between items-center mb-4 mt-8">
          <Link to={`/${company}/admin`}>
            <Button variant="outline" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" /> Voltar para Admin
            </Button>
          </Link>
        </div>
      )}
      
      {!isEmbedded && (
        <h1 className="text-4xl font-extrabold mb-8 text-center text-primary dark:text-primary flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <Menu className="h-8 w-8 text-primary" />
            Gerenciador de Menus e Listas
          </div>
          <span className="text-2xl font-bold opacity-80">{branding.name}</span>
        </h1>
      )}

      <Tabs value={tab} onValueChange={setTab} className="w-full max-w-6xl">
        <TabsList className="grid h-11 w-full grid-cols-2">
          <TabsTrigger value="structure" className="flex h-9 min-w-0 items-center gap-2">
            <Menu className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">Estrutura</span>
            <span className="hidden truncate sm:inline">Estrutura do Menu</span>
          </TabsTrigger>
          <TabsTrigger value="lists" className="flex h-9 min-w-0 items-center gap-2">
            <ListIcon className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">Listas</span>
            <span className="hidden truncate sm:inline">Listas Personalizadas</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="structure">
          <MenuStructureEditor onMenuUpdated={handleMenuUpdate} onEditList={handleEditList} />
        </TabsContent>
        <TabsContent value="lists">
          <CustomListManager editListId={editListId} onEditListHandled={() => setEditListId(null)} />
        </TabsContent>
      </Tabs>
      {!isEmbedded && <MadeWithDyad />}
    </div>
  );
};

export default MenuManagerPage;
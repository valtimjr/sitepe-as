import React, { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, FilePlus, LogIn, Trash2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGuestOrders, saveGuestOrders } from '@/services/guestOrderService';
import { ServiceOrderData } from '@/types/supabase';
import { v4 as uuidv4 } from 'uuid';
import { showSuccess, showError } from '@/utils/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const GuestServiceOrderList: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrderData[]>([]);

  useEffect(() => {
    document.title = "Ordens Offline - AutoBoard";
    setOrders(getGuestOrders());
  }, []);

  const handleDeleteAll = () => {
    if (window.confirm('Deseja limpar todas as ordens temporárias?')) {
      saveGuestOrders([]);
      setOrders([]);
      showSuccess('Lista limpa!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-4 mt-8 text-center text-primary flex items-center justify-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        Ordens Offline
      </h1>

      <div className="w-full max-w-4xl mb-6">
        <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">Modo Visitante</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            Você não está logado. Suas ordens serão salvas apenas neste navegador e serão sincronizadas com sua conta assim que você fizer login.
          </AlertDescription>
        </Alert>
      </div>

      <Card className="w-full max-w-4xl mb-8">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">Ordens Temporárias</CardTitle>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="outline" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" /> Entrar para Sincronizar
              </Button>
            </Link>
            {orders.length > 0 && (
              <Button variant="destructive" size="icon" onClick={handleDeleteAll}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="mb-4">Nenhuma ordem temporária.</p>
              <Link to="/login">
                <Button>Fazer Login para começar</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-muted">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg">AF: {order.af} | OS: {order.os}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{order.hora_inicio} - {order.hora_final}</p>
                    <p className="text-sm"><strong>Serviço:</strong> {order.servico_executado}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default GuestServiceOrderList;
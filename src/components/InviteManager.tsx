"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, PlusCircle, Loader2, Trash2, Check, XCircle, Link as LinkIcon } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSession } from './SessionContextProvider';
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Invite {
  id: string;
  invite_code: string;
  is_used: boolean;
  used_by: string | null;
  created_at: string;
  used_at: string | null;
}

const InviteManager: React.FC = () => {
  const { checkPageAccess } = useSession();
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(true);

  const loadInvites = useCallback(async () => {
    if (!checkPageAccess('/admin')) return;

    setIsLoadingInvites(true);
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('id, invite_code, is_used, used_by, created_at, used_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data as Invite[]);
    } catch (error: any) {
      showError('Erro ao carregar convites: ' + error.message);
      console.error('Failed to load invites:', error);
    } finally {
      setIsLoadingInvites(false);
    }
  }, [checkPageAccess]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const generateInviteLink = async () => {
    setIsGenerating(true);
    setNewInviteLink(null);
    setIsCopied(false);

    try {
      const { data, error } = await supabase
        .from('invites')
        .insert({})
        .select('invite_code')
        .single();

      if (error) throw error;

      const inviteCode = data.invite_code;
      const link = `${window.location.origin}/signup/${inviteCode}`;
      setNewInviteLink(link);
      showSuccess('Link de convite gerado com sucesso!');
      loadInvites();
    } catch (error: any) {
      showError('Erro ao gerar link de convite: ' + error.message);
      console.error('Failed to generate invite:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async (linkToCopy: string) => {
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setIsCopied(true);
      showSuccess('Link copiado para a área de transferência!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      showError('Falha ao copiar o link.');
      console.error('Failed to copy link:', err);
    }
  };

  const handleShowLink = (inviteCode: string) => {
    const link = `${window.location.origin}/signup/${inviteCode}`;
    setNewInviteLink(link);
    setIsCopied(false); // Resetar o estado de cópia ao mostrar um novo link
  };

  const handleDeleteInvite = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este convite?')) return;
    try {
      const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccess('Convite excluído com sucesso!');
      loadInvites();
    } catch (error: any) {
      showError('Erro ao excluir convite: ' + error.message);
      console.error('Failed to delete invite:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Gerenciador de Convites</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button onClick={generateInviteLink} disabled={isGenerating} className="flex items-center gap-2">
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            Gerar Novo Link de Convite
          </Button>
        </div>

        {newInviteLink && (
          <div className="space-y-2">
            <Label>Link de Convite Gerado:</Label>
            <div className="flex w-full max-w-md items-center space-x-2">
              <Input type="text" value={newInviteLink} readOnly className="truncate" />
              <Button onClick={() => handleCopyLink(newInviteLink)} type="button" variant="secondary" size="icon">
                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Compartilhe este link para permitir que um novo usuário se cadastre.
            </p>
          </div>
        )}

        <h3 className="text-xl font-semibold pt-4">Convites Existentes</h3>
        {isLoadingInvites ? (
          <p className="text-center text-muted-foreground py-8">Carregando convites...</p>
        ) : invites.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum convite gerado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Usado por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-mono text-xs truncate max-w-[100px] sm:max-w-none">{invite.invite_code}</TableCell>
                    <TableCell>
                      {invite.is_used ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <Check className="h-4 w-4" /> Usado
                        </span>
                      ) : (
                        <span className="text-yellow-600 flex items-center gap-1">
                          <XCircle className="h-4 w-4" /> Pendente
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invite.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {invite.used_by || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right flex justify-end items-center space-x-2">
                      {!invite.is_used && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleShowLink(invite.invite_code)}
                              aria-label="Mostrar link de convite"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mostrar Link de Convite</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteInvite(invite.id)}
                            aria-label="Excluir convite"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir Convite</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InviteManager;
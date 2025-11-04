"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Link, Image, Loader2, Trash2, CheckCircle, XCircle, RefreshCw, Folder, Settings, Info } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { bytescaleService } from '@/services/bytescaleService';
import { addPartImage, getAssociatedPartImages, deletePartImage, checkPartCodeExists } from '@/services/partListService';
import { PartImage } from '@/types/supabase';
import { useSession } from '@/components/SessionContextProvider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BytescaleFile {
  fileId: string;
  filePath: string;
  fileUrl: string;
  fileName: string;
  metadata?: {
    partCode?: string;
    description?: string;
    [key: string]: any;
  };
}

const BytescaleImageManager: React.FC = () => {
  const { checkPageAccess } = useSession();
  const [bytescaleFolder, setBytescaleFolder] = useState('parts/'); // Pasta padrão
  const [bytescaleFiles, setBytescaleFiles] = useState<BytescaleFile[]>([]);
  const [associatedImages, setAssociatedImages] = useState<PartImage[]>([]);
  const [isLoadingBytescale, setIsLoadingBytescale] = useState(false);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);
  const [isAssociating, setIsAssociating] = useState(false);
  const [bytescaleApiKey, setBytescaleApiKey] = useState(import.meta.env.VITE_BYTESCALE_API_KEY || '');
  const [bytescaleAccountId, setBytescaleAccountId] = useState(import.meta.env.VITE_BYTESCALE_ACCOUNT_ID || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isAdmin = checkPageAccess('/admin'); // Apenas admins podem gerenciar

  const loadBytescaleFiles = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingBytescale(true);
    try {
      const response = await bytescaleService.listFiles(bytescaleFolder);
      setBytescaleFiles(response.files as BytescaleFile[]);
      showSuccess('Imagens do Bytescale carregadas!');
    } catch (error: any) {
      showError(`Erro ao carregar imagens do Bytescale: ${error.message}`);
      setBytescaleFiles([]);
    } finally {
      setIsLoadingBytescale(false);
    }
  }, [bytescaleFolder, isAdmin]);

  const loadAssociatedImages = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingSupabase(true);
    try {
      const images = await getAssociatedPartImages();
      setAssociatedImages(images);
    } catch (error: any) {
      showError(`Erro ao carregar associações do Supabase: ${error.message}`);
      setAssociatedImages([]);
    } finally {
      setIsLoadingSupabase(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadBytescaleFiles();
      loadAssociatedImages();
    }
  }, [loadBytescaleFiles, loadAssociatedImages, isAdmin]);

  const handleAssociateImage = async (file: BytescaleFile) => {
    if (!isAdmin) return;
    setIsAssociating(true);
    const loadingToastId = showLoading(`Associando imagem ${file.fileName}...`);

    try {
      const partCode = bytescaleService.extractPartCode(file);

      if (!partCode) {
        throw new Error('Código da peça não encontrado nos metadados da imagem.');
      }

      const partExists = await checkPartCodeExists(partCode);
      if (!partExists) {
        throw new Error(`Código da peça '${partCode}' não existe no Supabase.`);
      }

      await addPartImage({
        part_code: partCode,
        image_url: file.fileUrl,
        bytescale_file_id: file.fileId,
      });

      showSuccess(`Imagem '${file.fileName}' associada com sucesso à peça '${partCode}'!`);
      await loadAssociatedImages(); // Recarrega as imagens associadas
    } catch (error: any) {
      showError(`Falha ao associar imagem: ${error.message}`);
    } finally {
      dismissToast(loadingToastId);
      setIsAssociating(false);
    }
  };

  const handleDisassociateImage = async (bytescaleFileId: string) => {
    if (!isAdmin) return;
    setIsAssociating(true);
    const loadingToastId = showLoading('Desassociando imagem...');

    try {
      await deletePartImage(bytescaleFileId);
      showSuccess('Associação de imagem removida com sucesso!');
      await loadAssociatedImages(); // Recarrega as imagens associadas
    } catch (error: any) {
      showError(`Falha ao desassociar imagem: ${error.message}`);
    } finally {
      dismissToast(loadingToastId);
      setIsAssociating(false);
    }
  };

  const associatedFileIds = new Set(associatedImages.map(img => img.bytescale_file_id));

  const pendingImages = bytescaleFiles.filter(file => !associatedFileIds.has(file.fileId));
  const currentAssociatedImages = bytescaleFiles.filter(file => associatedFileIds.has(file.fileId));

  if (!isAdmin) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Gerenciador de Imagens de Peças</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Você não tem permissão para acessar esta funcionalidade. Apenas administradores podem gerenciar imagens.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col space-y-2 pb-2">
        <CardTitle className="text-2xl font-bold">Gerenciador de Imagens de Peças</CardTitle>
        <div className="flex flex-wrap gap-2 justify-end">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> Configurações
              </Button>
            </DialogTrigger>
            {isSettingsOpen && ( // Renderização condicional explícita
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurações do Bytescale</DialogTitle>
                  <DialogDescription>
                    Configure suas chaves de acesso do Bytescale. Estas devem ser salvas como variáveis de ambiente.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="bytescale-api-key">Bytescale API Key (VITE_BYTESCALE_API_KEY)</Label>
                    <Input
                      id="bytescale-api-key"
                      type="password"
                      value={bytescaleApiKey}
                      onChange={(e) => setBytescaleApiKey(e.target.value)}
                      placeholder="sk_YOUR_API_KEY"
                      readOnly // Apenas para visualização, deve ser configurado via .env
                    />
                    <p className="text-sm text-muted-foreground">
                      Para alterar, edite a variável `VITE_BYTESCALE_API_KEY` no seu arquivo `.env.local`.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bytescale-account-id">Bytescale Account ID (VITE_BYTESCALE_ACCOUNT_ID)</Label>
                    <Input
                      id="bytescale-account-id"
                      type="text"
                      value={bytescaleAccountId}
                      onChange={(e) => setBytescaleAccountId(e.target.value)}
                      placeholder="YOUR_ACCOUNT_ID"
                      readOnly // Apenas para visualização, deve ser configurado via .env
                    />
                    <p className="text-sm text-muted-foreground">
                      Para alterar, edite a variável `VITE_BYTESCALE_ACCOUNT_ID` no seu arquivo `.env.local`.
                    </p>
                  </div>
                </div>
              </DialogContent>
            )}
          </Dialog>

          <Button onClick={loadBytescaleFiles} disabled={isLoadingBytescale || isAssociating} className="flex items-center gap-2">
            {isLoadingBytescale ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar Imagens
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="bytescale-folder" className="flex items-center gap-2">
              <Folder className="h-4 w-4" /> Pasta do Bytescale
            </Label>
            <Input
              id="bytescale-folder"
              type="text"
              value={bytescaleFolder}
              onChange={(e) => setBytescaleFolder(e.target.value)}
              placeholder="Ex: parts/ (deixe vazio para a raiz)"
              className="w-full"
              disabled={isLoadingBytescale || isAssociating}
            />
            <p className="text-sm text-muted-foreground">
              Especifique a pasta no Bytescale de onde as imagens serão carregadas.
            </p>
          </div>
        </div>

        {isLoadingBytescale || isLoadingSupabase ? (
          <p className="text-center text-muted-foreground py-8 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando dados...
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Imagens Pendentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <XCircle className="h-5 w-5 text-red-600" /> Imagens Pendentes ({pendingImages.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Imagens do Bytescale que não estão associadas a nenhuma peça no Supabase ou cujo código de peça não foi encontrado.
                </p>
              </CardHeader>
              <CardContent>
                {pendingImages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhuma imagem pendente encontrada.</p>
                ) : (
                  <ScrollArea className="h-60 max-h-96">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-4">
                      {pendingImages.map(file => (
                        <div key={file.fileId} className="border rounded-lg p-2 flex flex-col items-center text-center">
                          <img src={file.fileUrl} alt={file.fileName} className="w-24 h-24 object-cover mb-2 rounded-md" />
                          <p className="text-sm font-medium truncate w-full">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            Cód. Peça (Bytescale): {bytescaleService.extractPartCode(file) || 'N/A'}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssociateImage(file)}
                            disabled={isAssociating || !bytescaleService.extractPartCode(file)}
                            className="mt-2 flex items-center gap-1"
                          >
                            {isAssociating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Link className="h-4 w-4" />
                            )}
                            Associar
                          </Button>
                          {!bytescaleService.extractPartCode(file) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-yellow-600 mt-1 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Código da peça não encontrado nos metadados da imagem.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Imagens Associadas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CheckCircle className="h-5 w-5 text-green-600" /> Imagens Associadas ({currentAssociatedImages.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Imagens do Bytescale que estão associadas a peças existentes no Supabase.
                </p>
              </CardHeader>
              <CardContent>
                {currentAssociatedImages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhuma imagem associada encontrada.</p>
                ) : (
                  <ScrollArea className="h-60 max-h-96">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-4">
                      {currentAssociatedImages.map(file => {
                        const associatedData = associatedImages.find(img => img.bytescale_file_id === file.fileId);
                        return (
                          <div key={file.fileId} className="border rounded-lg p-2 flex flex-col items-center text-center bg-green-50 dark:bg-green-900/20">
                            <img src={file.fileUrl} alt={file.fileName} className="w-24 h-24 object-cover mb-2 rounded-md" />
                            <p className="text-sm font-medium truncate w-full">{file.fileName}</p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Peça: {associatedData?.part_code || 'N/A'}
                            </p>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDisassociateImage(file.fileId)}
                              disabled={isAssociating}
                              className="mt-2 flex items-center gap-1"
                            >
                              {isAssociating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Desassociar
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BytescaleImageManager;
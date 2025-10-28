import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Part, searchParts, getParts, getPartsFromLocal } from '@/services';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';
import { useQuery } from '@tanstack/react-query'; // Importar useQuery

const SearchParts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedParts, setDisplayedParts] = useState<Part[]>([]);

  // Usar useQuery para carregar todas as peças
  const { data: allPartsData = [], isLoading: isLoadingAllParts } = useQuery<Part[]>({
    queryKey: ['parts'],
    queryFn: getParts,
    initialData: [], // Começa com um array vazio para carregamento instantâneo
    staleTime: 5 * 60 * 1000, // Dados considerados "frescos" por 5 minutos
    placeholderData: (previousData) => previousData || [], // Mantém dados anteriores enquanto busca novos
  });

  useEffect(() => {
    const performSearch = async () => {
      let results: Part[];
      if (searchQuery.length > 0) {
        // Se houver query, busca no Supabase (e cache local como fallback)
        results = await searchParts(searchQuery);
      } else {
        // Se a query estiver vazia, exibe todas as peças já carregadas pelo useQuery
        results = allPartsData;
      }
      setDisplayedParts(results);
    };
    
    // Aplica debounce apenas se houver uma query, caso contrário, executa imediatamente
    // para exibir a lista completa (se a query for limpa ou na carga inicial).
    const delay = searchQuery.length > 0 ? 300 : 0; 
    
    const handler = setTimeout(() => {
      performSearch();
    }, delay); 
    
    return () => clearTimeout(handler);
  }, [searchQuery, allPartsData]); // Depende de allPartsData para re-filtrar se a lista mudar

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <Search className="h-8 w-8 text-primary" />
        Pesquisar Peças
      </h1>

      <Card className="w-full max-w-4xl mx-auto mb-8">
        <CardHeader>
          <CardTitle>Buscar Peça</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="part-search">Código, Descrição ou Tags da Peça</Label>
              <Input
                id="part-search"
                type="text"
                placeholder="Buscar peça por código, descrição ou tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {isLoadingAllParts && searchQuery.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando peças...
              </p>
            ) : displayedParts.length === 0 && searchQuery.length > 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma peça encontrada para "{searchQuery}".</p>
            ) : displayedParts.length === 0 && searchQuery.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma peça disponível.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedParts.map((part) => (
                      <TableRow key={part.id}>
                        <TableCell className="font-medium">{part.codigo}</TableCell>
                        <TableCell>{part.descricao}</TableCell>
                        <TableCell>{part.tags || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default SearchParts;
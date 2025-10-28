import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Part, searchParts as searchPartsService, getParts } from '@/services/partListService';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';

const SearchParts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedParts, setDisplayedParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "Pesquisar Peças - AutoBoard";
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      setIsLoading(true);
      try {
        let results: Part[];
        if (searchQuery.length > 0) {
          // Busca com query (debounce aplicado)
          results = await searchPartsService(searchQuery);
        } else {
          // Se a query estiver vazia, carrega todas as peças (priorizando cache)
          results = await getParts();
        }
        setDisplayedParts(results);
      } catch (error) {
        showError('Erro ao carregar ou buscar peças.');
        console.error('Failed to load/search parts:', error);
        setDisplayedParts([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Aplica debounce apenas se houver uma query, caso contrário, executa imediatamente
    // para carregar a lista completa (se a query for limpa).
    const delay = searchQuery.length > 0 ? 300 : 0; 
    
    const handler = setTimeout(() => {
      performSearch();
    }, delay); 
    
    return () => clearTimeout(handler);
  }, [searchQuery]);

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

            {isLoading ? (
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
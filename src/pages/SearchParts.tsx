import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Part, searchParts as searchPartsService } from '@/services/partListService';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const SearchParts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedParts, setDisplayedParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "Pesquisar Peças";
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      setIsLoading(true);
      // Sempre chama searchPartsService, mesmo com uma query vazia, para garantir dados atualizados
      const results = await searchPartsService(searchQuery);
      setDisplayedParts(results);
      setIsLoading(false);
    };
    const handler = setTimeout(() => {
      performSearch();
    }, 300); // Debounce search input
    return () => clearTimeout(handler);
  }, [searchQuery]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      {/* Removido o div com o botão "Voltar ao Início" */}
      <img src="/Logo.png" alt="Logo do Aplicativo" className="h-80 w-80 mb-6 mx-auto" />
      <h1 className="text-4xl font-extrabold mb-8 text-center text-primary dark:text-primary">
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
              <p className="text-center text-muted-foreground py-4">Carregando peças...</p>
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
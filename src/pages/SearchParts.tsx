import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Part, searchParts as searchPartsService } from '@/services/partListService';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import RelatedPartDisplay from '@/components/RelatedPartDisplay'; // Importado o novo componente

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
      // Usando a função searchParts (não paginada)
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
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Relacionados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedParts.map((part) => (
                      <TableRow key={part.id}>
                        <TableCell className="font-medium">{part.codigo}</TableCell>
                        <TableCell>{part.name || 'N/A'}</TableCell>
                        <TableCell>{part.descricao}</TableCell>
                        <TableCell>{part.tags || 'N/A'}</TableCell>
                        <TableCell>
                          {part.itens_relacionados && part.itens_relacionados.length > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 flex items-center gap-1 h-auto py-0 px-1">
                                  <Tag className="h-3 w-3" /> {part.itens_relacionados.length}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto max-w-xs p-2">
                                <p className="font-bold mb-1 text-sm">Itens Relacionados:</p>
                                <ScrollArea className="h-24">
                                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                    {part.itens_relacionados.map(rel => (
                                      <li key={rel.codigo} className="list-none ml-0">
                                        <RelatedPartDisplay item={rel} />
                                      </li>
                                    ))}
                                  </ul>
                                </ScrollArea>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
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
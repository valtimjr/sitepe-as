import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Part, searchParts as searchPartsService } from '@/services/partListService';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Tag } from 'lucide-react';
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from '@/components/responsive/ResponsivePopover';
import AddPartPopover from '@/components/AddPartPopover';
import { useAppRefresh } from '@/hooks/useAppRefresh';
import { ScrollArea } from '@/components/ui/scroll-area';
import RelatedPartDisplay from '@/components/RelatedPartDisplay';
import { useCompany } from '@/context/CompanyContext';
import { parseTags } from '@/lib/partTags';

const SearchPartsDesktop = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [displayedParts, setDisplayedParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { company, branding } = useCompany();

  useEffect(() => {
    // Sincroniza a query do URL com o estado se ela mudar
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    const performSearch = async () => {
      setIsLoading(true);
      const results = await searchPartsService(searchQuery, company);
      setDisplayedParts(results);
      setIsLoading(false);
    };
    const handler = setTimeout(() => {
      performSearch();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, company]);

  useAppRefresh(async () => {
    const results = await searchPartsService(searchQuery, company);
    setDisplayedParts(results);
  });

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <h1 className="text-4xl font-extrabold mb-8 mt-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <img src="/icons/tela_inicial/6.png" alt="" className="h-16 w-auto object-contain" />
        Pesquisar Peças
      </h1>

      <Card className="w-full max-w-4xl mx-auto mb-8">
        <CardHeader>
          <CardTitle>Buscar Peça ({branding.name})</CardTitle>
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
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Relacionados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedParts.map((part) => {
                      const tags = parseTags(part.tags);
                      return (
                        <TableRow key={part.id}>
                          <TableCell className="w-[50px] text-center">
                            <AddPartPopover part={part} company={company} align="start" idPrefix="page" />
                          </TableCell>
                          <TableCell className="font-medium">{part.codigo}</TableCell>
                          <TableCell>{part.name || 'N/A'}</TableCell>
                          <TableCell>{part.descricao}</TableCell>
                          <TableCell>
                            {tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="font-normal">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>
                            {part.itens_relacionados && part.itens_relacionados.length > 0 ? (
                              <ResponsivePopover>
                                <ResponsivePopoverTrigger>
                                  <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 flex items-center gap-1 h-auto py-0 px-1">
                                    <Tag className="h-3 w-3" /> {part.itens_relacionados.length}
                                  </Button>
                                </ResponsivePopoverTrigger>
                                <ResponsivePopoverContent title="Itens Relacionados" popoverClassName="w-auto max-w-xs p-2">
                                  <p className="font-bold mb-1 text-sm hidden lg:block">Itens Relacionados:</p>
                                  <ScrollArea className="max-h-96">
                                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                      {part.itens_relacionados.map(rel => (
                                        <li key={rel.codigo} className="list-none ml-0">
                                          <RelatedPartDisplay item={rel} />
                                        </li>
                                      ))}
                                    </ul>
                                  </ScrollArea>
                                </ResponsivePopoverContent>
                              </ResponsivePopover>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-center mb-8">
        <Link to={`/${company}`}>
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default SearchPartsDesktop;

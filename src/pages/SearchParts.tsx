import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Part, searchParts as searchPartsService, addSimplePartItem } from '@/services/partListService';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Tag, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import RelatedPartDisplay from '@/components/RelatedPartDisplay'; // Importado o novo componente
import { useIsMobile } from '@/hooks/use-mobile';
import { useCompany } from '@/context/CompanyContext';
import { showSuccess, showError } from '@/utils/toast';

interface AddPartPopoverProps {
  part: { codigo: string; descricao: string };
  company: any;
}

const AddPartPopover: React.FC<AddPartPopoverProps> = ({ part, company }) => {
  const [quantidade, setQuantidade] = useState<number>(1);
  const [af, setAf] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantidade <= 0) {
      showError('A quantidade deve ser maior que zero.');
      return;
    }
    
    setIsAdding(true);
    try {
      await addSimplePartItem({
        codigo_peca: part.codigo,
        descricao: part.descricao,
        quantidade,
        af: af.trim() || undefined
      }, company);
      showSuccess(`Peça ${part.codigo} adicionada à sua lista!`);
      setIsOpen(false);
      setQuantidade(1);
      setAf('');
    } catch (err) {
      showError('Erro ao adicionar peça.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary hover:bg-primary/10"
          onClick={(e) => {
            e.stopPropagation();
          }}
          title="Adicionar rápido à lista"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-4"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 text-left">
            Adicionar à Minha Lista
          </div>
          <div className="text-xs text-muted-foreground font-semibold truncate text-left">
            {part.codigo} - {part.descricao}
          </div>
          
          <div className="space-y-1 text-left">
            <Label htmlFor={`qty-page-${part.codigo}`} className="text-[10px] font-semibold uppercase">Quantidade</Label>
            <Input
              id={`qty-page-${part.codigo}`}
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
              required
              className="h-8 text-xs"
            />
          </div>
          
          <div className="space-y-1 text-left">
            <Label htmlFor={`af-page-${part.codigo}`} className="text-[10px] font-semibold uppercase">AF / Frota (Opcional)</Label>
            <Input
              id={`af-page-${part.codigo}`}
              type="text"
              placeholder="Ex: AF42"
              value={af}
              onChange={(e) => setAf(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          
          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 text-xs px-2"
              disabled={isAdding}
            >
              {isAdding ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};

const SearchParts = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [displayedParts, setDisplayedParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const { company, branding } = useCompany();

  useEffect(() => {
    // Sincroniza a query do URL com o estado se ela mudar
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    document.title = `Pesquisar Peças - AutoBoard (${branding.name})`;
  }, [branding.name]);

  useEffect(() => {
    const performSearch = async () => {
      setIsLoading(true);
      // Usando a função searchParts (não paginada)
      const results = await searchPartsService(searchQuery, company);
      setDisplayedParts(results);
      setIsLoading(false);
    };
    const handler = setTimeout(() => {
      performSearch();
    }, 300); // Debounce search input
    return () => clearTimeout(handler);
  }, [searchQuery, company]);

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
                    {displayedParts.map((part) => (
                      <TableRow key={part.id}>
                        <TableCell className="w-[50px] text-center">
                          <AddPartPopover part={part} company={company} />
                        </TableCell>
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
                                <ScrollArea className={isMobile ? "h-24" : "max-h-96"}>
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

export default SearchParts;
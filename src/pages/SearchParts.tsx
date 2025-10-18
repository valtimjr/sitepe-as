import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Part, getParts, searchParts } from '@/services/partListService';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from 'react-router-dom'; // Importar Link
import { Button } from '@/components/ui/button'; // Importar Button
import { ArrowLeft } from 'lucide-react'; // Importar ícone

const SearchParts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedParts, setDisplayedParts] = useState<Part[]>([]);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);

  useEffect(() => {
    const parts = getParts();
    setAllAvailableParts(parts);
    setDisplayedParts(parts); // Initially display all parts
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      setDisplayedParts(searchParts(searchQuery));
    } else {
      setDisplayedParts(allAvailableParts); // Show all parts if search query is empty
    }
  }, [searchQuery, allAvailableParts]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50">
      <div className="w-full max-w-4xl flex justify-start mb-4">
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
      </div>
      <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-600 dark:text-blue-400">
        Pesquisar Peças
      </h1>

      <Card className="w-full max-w-4xl mx-auto mb-8">
        <CardHeader>
          <CardTitle>Buscar Peça</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="part-search">Código ou Descrição da Peça</Label>
              <Input
                id="part-search"
                type="text"
                placeholder="Buscar peça por código ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {displayedParts.length === 0 && searchQuery.length > 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma peça encontrada para "{searchQuery}".</p>
            ) : displayedParts.length === 0 && searchQuery.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma peça disponível.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedParts.map((part) => (
                      <TableRow key={part.codigo}>
                        <TableCell className="font-medium">{part.codigo}</TableCell>
                        <TableCell>{part.descricao}</TableCell>
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
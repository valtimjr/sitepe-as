import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part, insertPart, addItemToList, searchParts } from '@/services/partListService';
import PartSearchInput from './PartSearchInput';
import { showSuccess, showError } from '@/utils/toast';

interface PartListItemFormProps {
  onItemAdded: () => void;
}

const PartListItemForm: React.FC<PartListItemFormProps> = ({ onItemAdded }) => {
  const [codigoPeca, setCodigoPeca] = useState('');
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [af, setAf] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);

  useEffect(() => {
    if (searchQuery.length > 1) {
      setSearchResults(searchParts(searchQuery));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSelectPart = (part: Part) => {
    setCodigoPeca(part.codigo);
    setDescricao(part.descricao);
    setSearchQuery(''); // Clear search query after selection
    setSearchResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoPeca || !descricao || quantidade <= 0 || !af) {
      showError('Por favor, preencha todos os campos corretamente.');
      return;
    }

    // Ensure the part exists in the main parts list
    insertPart({ codigo: codigoPeca, descricao: descricao });

    addItemToList({
      codigo_peca: codigoPeca,
      descricao,
      quantidade,
      af,
    });
    showSuccess('Item adicionado à lista!');
    setCodigoPeca('');
    setDescricao('');
    setQuantidade(1);
    setAf('');
    onItemAdded();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Adicionar Item à Lista</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="search-part">Buscar/Adicionar Peça</Label>
            <PartSearchInput
              onSearch={handleSearch}
              searchResults={searchResults}
              onSelectPart={handleSelectPart}
              searchQuery={searchQuery}
            />
          </div>
          <div>
            <Label htmlFor="codigo_peca">Código da Peça</Label>
            <Input
              id="codigo_peca"
              type="text"
              value={codigoPeca}
              onChange={(e) => setCodigoPeca(e.target.value)}
              placeholder="Ex: P001"
              required
            />
          </div>
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Filtro de Óleo"
              required
            />
          </div>
          <div>
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input
              id="quantidade"
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
              min="1"
              required
            />
          </div>
          <div>
            <Label htmlFor="af">AF (Número de Frota)</Label>
            <Input
              id="af"
              type="text"
              value={af}
              onChange={(e) => setAf(e.target.value)}
              placeholder="Ex: AF12345"
              required
            />
          </div>
          <Button type="submit" className="w-full">Adicionar à Lista</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PartListItemForm;
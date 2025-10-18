import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Part } from '@/services/partListService';

interface PartSearchInputProps {
  onSearch: (query: string) => void;
  searchResults: Part[];
  onSelectPart: (part: Part) => void;
  searchQuery: string;
}

const PartSearchInput: React.FC<PartSearchInputProps> = ({ onSearch, searchResults, onSelectPart, searchQuery }) => {
  return (
    <div className="relative w-full">
      <Label htmlFor="part-search" className="sr-only">Buscar Peça</Label>
      <Input
        id="part-search"
        type="text"
        placeholder="Buscar peça por código ou descrição..."
        value={searchQuery}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full"
      />
      {searchQuery && searchResults.length > 0 && (
        <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
          {searchResults.map((part) => (
            <li
              key={part.codigo}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => onSelectPart(part)}
            >
              {part.codigo} - {part.descricao}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PartSearchInput;
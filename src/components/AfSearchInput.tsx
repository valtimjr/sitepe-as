import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface AfSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  availableAfs: string[];
  onSelectAf: (af: string) => void;
}

const AfSearchInput: React.FC<AfSearchInputProps> = ({ value, onChange, availableAfs, onSelectAf }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [filteredAfs, setFilteredAfs] = useState<string[]>([]);

  useEffect(() => {
    if (value.length > 0) {
      setFilteredAfs(
        availableAfs.filter((af) =>
          af.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      setFilteredAfs([]);
    }
  }, [value, availableAfs]);

  const handleSelectAndClose = (af: string) => {
    onSelectAf(af);
    setIsPopoverOpen(false);
  };

  return (
    <div className="relative flex w-full items-center space-x-2">
      <div className="relative flex-grow">
        <Label htmlFor="af-input" className="sr-only">Número de Frota (AF)</Label>
        <Input
          id="af-input"
          type="text"
          placeholder="Ex: AF12345"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full"
          required
        />
        {value.length > 0 && filteredAfs.length > 0 && (
          <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
            {filteredAfs.map((af) => (
              <li
                key={af}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSelectAndClose(af)}
              >
                {af}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Mostrar todos os AFs">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <div className="max-h-60 overflow-y-auto">
            {availableAfs.length === 0 ? (
              <p className="p-4 text-center text-gray-500">Nenhum AF disponível.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {availableAfs.map((af) => (
                  <li
                    key={af}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSelectAndClose(af)}
                  >
                    {af}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AfSearchInput;
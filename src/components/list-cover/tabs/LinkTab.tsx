import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isHttpsUrl, type ListCover } from '@/types/listCover';
import { checkImageLoads } from '@/services/coverService';

interface LinkTabProps {
  onSelect: (cover: ListCover) => void;
}

const LinkTab: React.FC<LinkTabProps> = ({ onSelect }) => {
  const [url, setUrl] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = url.trim();
    setError(null);
    if (!isHttpsUrl(value)) {
      setError('Use um link que comece com https://');
      return;
    }
    setChecking(true);
    const ok = await checkImageLoads(value);
    setChecking(false);
    if (!ok) {
      setError('Não foi possível carregar a imagem desse link.');
      return;
    }
    onSelect({ kind: 'image', source: 'link', value });
  };

  return (
    <form onSubmit={submit} className="space-y-2" data-testid="cover-link">
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Cole o link da imagem (https://...)"
        aria-label="Link da imagem"
        className="h-10 rounded-none"
        inputMode="url"
        autoComplete="off"
      />
      <Button type="submit" className="w-full rounded-none" disabled={checking || !url.trim()}>
        {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Usar imagem
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert" data-testid="cover-link-error">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">Funciona com qualquer imagem pública na internet.</p>
    </form>
  );
};

export default LinkTab;

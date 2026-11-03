import { useEffect, useState } from 'react';
import type { ListCover } from '@/types/listCover';
import { getLocalCoverBlob } from '@/services/coverService';

/** URL da imagem da capa. Para uploads locais, cria e libera o objectURL. */
export const useCoverSrc = (cover?: ListCover | null): string | undefined => {
  const isImage = cover?.kind === 'image';
  const value = cover?.value;
  const isLocal = isImage && cover?.source === 'upload-local';
  const [localUrl, setLocalUrl] = useState<string>();

  useEffect(() => {
    if (!isLocal || !value) {
      setLocalUrl(undefined);
      return;
    }
    let url: string | undefined;
    let cancelled = false;
    getLocalCoverBlob(value)
      .then((blob) => {
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setLocalUrl(url);
      })
      .catch(() => setLocalUrl(undefined));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isLocal, value]);

  if (!isImage) return undefined;
  return isLocal ? localUrl : value;
};

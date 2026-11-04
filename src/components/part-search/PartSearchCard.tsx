import React, { useMemo, useState } from 'react';
import { Link2, Tag } from 'lucide-react';
import AddPartPopover from '@/components/AddPartPopover';
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from '@/components/responsive/ResponsivePopover';
import RelatedPartsList from './RelatedPartsList';
import { parseTags } from '@/lib/partTags';
import type { Part } from '@/types/supabase';
import type { CompanyType } from '@/types/company';

interface PartSearchCardProps {
  part: Part;
  company: CompanyType;
  onOpenDetails: (part: Part) => void;
  onOpenTags: (part: Part) => void;
  /** Busca por um termo (ex.: código de um relacionado). */
  onSearch: (term: string) => void;
  idPrefix?: string;
}

/** Card de peça da busca no celular: código · nome, descrição, tags, relacionados e "+". */
const PartSearchCard: React.FC<PartSearchCardProps> = ({ part, company, onOpenDetails, onOpenTags, onSearch, idPrefix }) => {
  const [relatedOpen, setRelatedOpen] = useState(false);
  const hasTags = useMemo(() => parseTags(part.tags).length > 0, [part.tags]);
  const related = part.itens_relacionados || [];
  const name = part.name?.trim();

  return (
    <li
      className="flex items-start gap-1 rounded-none border bg-card py-1.5 pl-3 pr-1 shadow-sm"
      onClick={() => onOpenDetails(part)}
      data-testid="part-search-card"
    >
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="block w-full min-h-11 py-0.5 text-left active:opacity-70"
          aria-label={`Detalhes de ${part.codigo}`}
        >
          <span className="block text-sm line-clamp-2 dark:text-blue-400" data-testid="part-search-title">
            <span className="font-bold" data-testid="part-search-code">{part.codigo}</span>
            {name && <span data-testid="part-search-name"> · {name}</span>}
          </span>
          <span className="block text-xs uppercase text-muted-foreground line-clamp-2" data-testid="part-search-desc">
            {part.descricao}
          </span>
        </button>

        {(hasTags || related.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-4 text-xs">
            {hasTags && (
              <button
                type="button"
                className="flex min-h-11 items-center gap-1 font-medium text-blue-600 dark:text-blue-400"
                onClick={e => {
                  e.stopPropagation();
                  onOpenTags(part);
                }}
                data-testid="part-search-tags-button"
              >
                <Tag className="h-3.5 w-3.5" /> Tags
              </button>
            )}
            {related.length > 0 && (
              <ResponsivePopover open={relatedOpen} onOpenChange={setRelatedOpen}>
                <ResponsivePopoverTrigger>
                  <button
                    type="button"
                    className="flex min-h-11 items-center gap-1 font-medium text-blue-600 dark:text-blue-400"
                    onClick={e => e.stopPropagation()}
                    data-testid="part-search-related-button"
                  >
                    <Link2 className="h-3.5 w-3.5" /> {related.length} {related.length === 1 ? 'relacionado' : 'relacionados'}
                  </button>
                </ResponsivePopoverTrigger>
                <ResponsivePopoverContent
                  title="Itens Relacionados"
                  description={part.codigo}
                  popoverClassName="w-auto max-w-xs p-2"
                  onClick={e => e.stopPropagation()}
                  data-testid="part-related-sheet"
                >
                  <RelatedPartsList
                    items={related}
                    onSearch={code => {
                      setRelatedOpen(false);
                      onSearch(code);
                    }}
                  />
                </ResponsivePopoverContent>
              </ResponsivePopover>
            )}
          </div>
        )}
      </div>

      <div onClick={e => e.stopPropagation()}>
        <AddPartPopover
          part={part}
          company={company}
          idPrefix={idPrefix}
          triggerClassName="h-11 w-11 rounded-none bg-primary/10"
        />
      </div>
    </li>
  );
};

export default React.memo(PartSearchCard);

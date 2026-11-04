import React, { useEffect } from 'react';
import { useIsCompact } from '@/hooks/use-compact';
import { useCompany } from '@/context/CompanyContext';
import SearchPartsMobile from './search-parts/SearchPartsMobile';
import SearchPartsDesktop from './search-parts/SearchPartsDesktop';

const SearchParts = () => {
  const isCompact = useIsCompact();
  const { branding } = useCompany();

  useEffect(() => {
    document.title = `Pesquisar Peças - AutoBoard (${branding.name})`;
  }, [branding.name]);

  return isCompact ? <SearchPartsMobile /> : <SearchPartsDesktop />;
};

export default SearchParts;

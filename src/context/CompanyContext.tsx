import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CompanyType } from '@/types/company';

interface CompanyContextType {

  company: CompanyType;
  setCompany: (company: CompanyType) => void;
  branding: {
    logo: string;
    name: string;
    primaryColor: string;
  };
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const brandingConfig: Record<CompanyType, CompanyContextType['branding']> = {
  usina_vale: {
    logo: '/Usina Vale.png',
    name: 'Usina Vale',
    primaryColor: '#006400', // Dark green example
  },
  citrosuco: {
    logo: '/CitroSuco.png',
    name: 'Citrosuco',
    primaryColor: '#ff8c00', // Dark orange example
  },
};

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { company: companyParam } = useParams<{ company: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [company, setCompanyState] = useState<CompanyType>((companyParam as CompanyType) || 'usina_vale');

  useEffect(() => {
    if (companyParam && (companyParam === 'usina_vale' || companyParam === 'citrosuco')) {
      setCompanyState(companyParam as CompanyType);
    } else if (location.pathname === '/' || !companyParam) {
      // Default or redirect handled in App.tsx but let's keep state in sync
    }
  }, [companyParam, location.pathname]);

  const setCompany = (newCompany: CompanyType) => {
    setCompanyState(newCompany);
    // When manually setting company, we should navigate to the new URL
    const newPath = location.pathname.replace(/^\/(usina_vale|citrosuco)/, `/${newCompany}`);
    if (newPath !== location.pathname) {
      navigate(newPath);
    } else {
      navigate(`/${newCompany}`);
    }
  };

  const branding = brandingConfig[company];

  return (
    <CompanyContext.Provider value={{ company, setCompany, branding }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

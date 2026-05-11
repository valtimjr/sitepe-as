import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Database, Home, Clock, Search, List, ClipboardList, CalendarDays, Menu } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import { getParts, getAfsFromService } from '@/services/partListService';
import { useCompany } from '@/context/CompanyContext';

const Index = () => {
  const { checkPageAccess, session } = useSession();
  const { company, branding } = useCompany();

  useEffect(() => {
    document.title = `Início - AutoBoard (${branding.name})`;
  }, [branding.name]);

  // Efeito para pré-carregar dados em segundo plano
  useEffect(() => {
    const prefetchAllData = async () => {
      try {
        // Inicia o carregamento de peças e AFs em paralelo
        await Promise.all([
          getParts(company),
          getAfsFromService(company)
        ]);
        // console.log("Pré-carregamento de dados em segundo plano concluído.");
      } catch (error) {
        console.warn("Falha no pré-carregamento de dados em segundo plano. Os dados serão carregados sob demanda.", error);
      }
    };

    // Executa a função de pré-carregamento uma vez quando o componente é montado
    prefetchAllData();
  }, [company]); // Roda quando a empresa muda

  const canAccessAdmin = checkPageAccess('/admin');
  const canAccessTimeTracking = checkPageAccess('/time-tracking');
  // Acesso ao catálogo de menus agora verifica a permissão da rota
  const canAccessCustomMenu = checkPageAccess('/custom-menu-view');

  const HomeCard = ({ title, description, icon: Icon, to, external }: { title: string, description: string, icon: any, to: string, external?: boolean }) => {
    const content = (
      <div className="custom-card group">
        <div className="custom-card-content">
          <div className="custom-card-top">
            <p className="custom-card-title">{title}</p>
          </div>
          <div className="custom-card-bottom">
            <p className="text-sm opacity-80">{description}</p>
          </div>
        </div>
        <div className="custom-card-image">
          <Icon className="icon-svg" />
        </div>
      </div>
    );

    if (external) {
      return (
        <a href={to} target="_blank" rel="noopener noreferrer" className="no-underline">
          {content}
        </a>
      );
    }

    return (
      <Link to={to} className="no-underline">
        {content}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <style>{`
        /* From Uiverse.io by Samalander0 */
        .custom-card {
          width: 100%;
          min-height: 280px;
          background: #fff480;
          color: black;
          position: relative;
          border-radius: 2.5em;
          padding: 2em;
          transition: transform 0.4s ease;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .custom-card .custom-card-content {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 2em;
          height: 100%;
          transition: transform 0.4s ease;
          z-index: 1;
        }

        .custom-card .custom-card-top, .custom-card .custom-card-bottom {
          display: flex;
          flex-direction: column;
        }

        .custom-card .custom-card-title {
          font-weight: bold;
          font-size: 1.5rem;
          margin: 0;
        }

        .custom-card .custom-card-bottom {
          align-items: flex-start;
        }

        .custom-card .custom-card-image {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          display: grid;
          place-items: center;
          pointer-events: none;
          opacity: 0.15;
        }

        .custom-card .custom-card-image .icon-svg {
          width: 8em;
          height: 8em;
          transition: transform 0.4s ease;
        }

        .custom-card:hover {
          cursor: pointer;
          transform: scale(0.97);
        }

        .custom-card:hover .custom-card-content {
          transform: scale(0.96);
        }

        .custom-card:hover .custom-card-image .icon-svg {
          transform: scale(1.1);
        }

        .custom-card:active {
          transform: scale(0.9);
        }
      `}</style>
      <h1 className="text-5xl font-extrabold mb-12 mt-8 text-center text-primary dark:text-primary flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <Home className="h-10 w-10 text-primary" />
          Bem-vindo ao AutoBoard
        </div>
        <img
          src={branding.logo}
          alt={branding.name}
          className="h-40 w-auto object-contain opacity-90"
        />
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        <HomeCard
          title="Ordens de Serviço"
          description="Visualize e gerencie as ordens de serviço com suas peças associadas."
          icon={ClipboardList}
          to={`/${company}/service-orders`}
        />

        <HomeCard
          title="Pesquisar Peças"
          description="Encontre rapidamente qualquer peça automotiva por código ou descrição."
          icon={Search}
          to={`/${company}/search-parts`}
        />

        {canAccessCustomMenu && (
          <HomeCard
            title="Catálogo de Peças"
            description="Navegue pelas listas de peças personalizadas em uma estrutura de menu."
            icon={Menu}
            to={`/${company}/custom-menu-view`}
          />
        )}

        <HomeCard
          title="Minha Lista de Peças"
          description="Gerencie sua lista de peças, adicione novos itens e exporte para PDF."
          icon={List}
          to={`/${company}/parts-list`}
        />
        
        <HomeCard
          title="Escala Anual"
          description="Visualize a escala de turnos rotativos para o ano inteiro."
          icon={CalendarDays}
          to="https://escala.eletricarpm.com.br"
          external
        />

        {canAccessTimeTracking && (
          <HomeCard
            title="Apontamento de Horas"
            description="Registre suas horas de entrada e saída para controle mensal."
            icon={Clock}
            to={`/${company}/time-tracking`}
          />
        )}

        {canAccessAdmin && (
          <HomeCard
            title="Painel Administração"
            description="Acesse as configurações do sistema, gerencie acessos, peças e dados gerais."
            icon={Database}
            to={`/${company}/admin`}
          />
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;
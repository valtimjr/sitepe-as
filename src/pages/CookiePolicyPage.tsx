import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Cookie } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';

const CookiePolicyPage: React.FC = () => {
  useEffect(() => {
    document.title = "Política de Cookies - AutoBoard";
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 mt-8">
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Início
          </Button>
        </Link>
      </div>
      
      <h1 className="text-4xl font-extrabold mb-8 text-center text-primary dark:text-primary flex items-center gap-3">
        <Cookie className="h-8 w-8 text-primary" />
        Política de Cookies do AutoBoard
      </h1>

      <div className="prose dark:prose-invert max-w-4xl mx-auto mb-8 p-4 bg-card rounded-lg shadow-sm">
        <p className="text-sm text-muted-foreground">
          Em vigor a partir de 29 de maio de 2023
        </p>

        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>O que são cookies?</li>
          <li>Como usamos cookies?</li>
          <li>Opções para gerenciar cookies e anúncios personalizados de acordo com seus interesses</li>
          <li>Atualizações nesta Política</li>
          <li>Como entrar em contato com a gente</li>
        </ul>

        <p className="mt-4 text-muted-foreground">
          Esta política descreve como o AutoBoard usa cookies. De agora em diante, chamaremos de "Política". O objetivo desta Política é fornecer a você, usuário dos serviços e/ou sites do AutoBoard (aqui coletivamente chamados de "Serviços"), informações claras sobre as finalidades para as quais o AutoBoard usa cookies e suas opções de gerenciamento das configurações de cookies.
        </p>

        <h2 className="text-2xl font-bold mt-6 mb-3">1. O que são cookies?</h2>
        <p className="text-muted-foreground">
          Cookies são pequenos pedaços de texto que são baixados para o seu dispositivo quando, por exemplo, você visita um site. Os cookies são úteis porque permitem que o AutoBoard e nossos parceiros reconheçam o seu dispositivo e ajudem a aprimorar a sua experiência, permitindo a compreensão de suas preferências ou ações passadas, entre outras coisas. Veja mais informações sobre cookies em: <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.allaboutcookies.org</a>.
        </p>

        <h2 className="text-2xl font-bold mt-6 mb-3">2. Como usamos cookies?</h2>
        <p className="text-muted-foreground">
          Os cookies ajudam a navegar entre as páginas de forma eficiente, a lembrar suas preferências e a melhorar sua experiência de usuário, entre outras coisas. Eles também podem ajudar a garantir que os anúncios exibidos sejam mais relevantes para você e seus interesses.
        </p>
        <p className="text-muted-foreground">
          O AutoBoard usa duas categorias principais de cookies: (1) cookies estritamente necessários e (2) cookies opcionais:
        </p>

        <h3 className="text-xl font-semibold mt-4 mb-2">Cookies estritamente necessários</h3>
        <p className="text-muted-foreground">
          Esses cookies são definidos pelo AutoBoard ou por terceiros em nosso nome e são fundamentais para o uso dos recursos de nossos Serviços, como fornecer conteúdo de forma técnica, definir suas preferências de privacidade, fazer login, fazer pagamentos ou preencher formulários. Sem esses cookies, nossos Serviços não podem ser prestados. Portanto, não é possível recusá-los.
        </p>

        <h3 className="text-xl font-semibold mt-4 mb-2">Cookies opcionais</h3>
        <p className="text-muted-foreground">
          Os cookies opcionais podem ser "cookies primários" ou "cookies secundários".
        </p>
        <p className="text-muted-foreground">
          Cookies primários são definidos diretamente pelo AutoBoard ou por terceiros, caso solicitado. Os cookies secundários são definidos diretamente por um terceiro ou pelo AutoBoard mediante solicitação de um terceiro, como nossos prestadores de serviços de estatísticas ou publicidade. Uma lista desses parceiros pode ser encontrada neste link. Tanto o AutoBoard quanto seus parceiros usam cookies opcionais das seguintes maneiras:
        </p>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 border-collapse">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-4 py-2 border border-gray-200 dark:border-gray-600">Tipo de cookie</th>
                <th scope="col" className="px-4 py-2 border border-gray-200 dark:border-gray-600">Finalidade</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-4 py-2 border border-gray-200 dark:border-gray-600 font-medium">Cookies estritamente necessários</td>
                <td className="px-4 py-2 border border-gray-200 dark:border-gray-600">
                  Esses cookies são fundamentais para o uso dos recursos de nossos Serviços, como fornecer conteúdo de forma técnica, definir suas preferências de privacidade, fazer login, fazer pagamentos ou preencher formulários. Sem esses cookies, nossos Serviços não podem ser prestados. Portanto, não é possível recusá-los.
                </td>
              </tr>
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-4 py-2 border border-gray-200 dark:border-gray-600 font-medium">Cookies de desempenho</td>
                <td className="px-4 py-2 border border-gray-200 dark:border-gray-600">
                  Esses cookies coletam informações sobre como os visitantes usam nossos Serviços, número de visitas ao nosso site e de que forma os visitantes nos encontraram. As estatísticas da Web que usam cookies para coletar dados e aprimorar o desempenho de um site se enquadram nessa categoria. Essas informações podem ser usadas para testar designs e garantir um visual uniforme para o usuário. Também podemos usar newsletters ou outras comunicações que enviamos para obter informações, incluindo se você abriu, encaminhou ou clicou no conteúdo. Dessa forma, recebemos dados sobre a eficácia de nossas newsletters, nos ajudando a garantir o fornecimento de informações relevantes. Esta categoria não inclui cookies usados para redes de publicidade direcionada baseada em comportamentos/interesses.
                </td>
              </tr>
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-4 py-2 border border-gray-200 dark:border-gray-600 font-medium">Funcionais</td>
                <td className="px-4 py-2 border border-gray-200 dark:border-gray-600">
                  Esses cookies permitem que nossos Serviços memorizem as escolhas feitas por você, como seu nome de usuário, idioma ou a região em que você está, e forneçam recursos e conteúdo aprimorados e personalizados. Eles podem, por exemplo, ser usados para memorizar as alterações feitas em partes personalizáveis de páginas da Web. Esses cookies memorizam as escolhas que você faz para aprimorar sua experiência. Se você não permitir esses cookies, algumas escolhas feitas em visitas anteriores aos nossos Serviços não serão salvas.
                </td>
              </tr>
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-4 py-2 border border-gray-200 dark:border-gray-600 font-medium">Cookies Persistentes</td>
                <td className="px-4 py-2 border border-gray-200 dark:border-gray-600">
                  Esses cookies permanecem no seu dispositivo por um período definido ou até que você os exclua manualmente. Eles são usados para lembrar suas preferências e configurações em visitas futuras, como o tema escolhido (claro/escuro), o turno de trabalho selecionado ou outras configurações de interface, proporcionando uma experiência mais consistente e personalizada.
                </td>
              </tr>
              <tr className="bg-white dark:bg-gray-800">
                <td className="px-4 py-2 border border-gray-200 dark:border-gray-600 font-medium">Cookies de segmentação ou publicidade</td>
                <td className="px-4 py-2 border border-gray-200 dark:border-gray-600">
                  Esses cookies coletam informações sobre seus hábitos de navegação para fornecer anúncios mais relevantes e conhecer seus interesses. Eles também são usados para limitar o número de vezes que você vê um anúncio, ajudam a medir a eficácia dos anúncios compartilhados pelo AutoBoard, e registram suas visitas a sites. Essas informações podem ser compartilhadas com outras organizações, como anunciantes. Além disso, o AutoBoard pode compartilhar dados de forma limitada com outras plataformas para divulgar promoções, recursos ou novos lançamentos. Se você não permitir esses cookies, sua publicidade não será personalizada.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-bold mt-6 mb-3">3. Opções para gerenciar cookies e anúncios personalizados de acordo com seus interesses</h2>

        <h3 className="text-xl font-semibold mt-4 mb-2">Configurações do navegador Web</h3>
        <p className="text-muted-foreground">
          As configurações do navegador podem ser usadas para aceitar, recusar e excluir cookies. Para isso, siga as instruções que geralmente estão em "Ajuda", "Ferramentas" ou "Editar".
        </p>
        <p className="text-muted-foreground">
          Caso você configure seu navegador para recusar cookies, talvez não seja possível usar todos os recursos do site do AutoBoard. Para saber mais, acesse <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.allaboutcookies.org</a>.
        </p>

        <h3 className="text-xl font-semibold mt-4 mb-2">Identificadores de dispositivos móveis</h3>
        <p className="text-muted-foreground">
          O sistema operacional do seu dispositivo móvel pode fornecer opções adicionais para retirada de publicidade baseada em interesse ou para redefinição dos identificadores de dispositivos móveis. Por exemplo, você pode usar a configuração "Permitir que aplicativos solicitem rastreamento" (em dispositivos iOS) ou "Retirar anúncios baseados em interesse" (em dispositivos Android). Essas configurações permitem limitar o uso de informações sobre sua utilização de apps para fins de veiculação de anúncios personalizados.
        </p>

        <h3 className="text-xl font-semibold mt-4 mb-2">Publicidade baseada em interesse</h3>
        <p className="text-muted-foreground">
          Você pode cancelar o recebimento de anúncios baseados em interesses desativando o botão "Anúncios personalizados", localizado na página de Configurações de privacidade da sua conta do AutoBoard. Se você cancelar o recebimento de anúncios baseados interesses usando o botão Anúncios personalizados, o AutoBoard não compartilhará suas informações com parceiros de publicidade externos, nem usará as informações recebidas por eles para exibir anúncios baseados interesses. Você continuará recebendo anúncios ao usar os Serviços com base em suas informações de registro e seu uso em tempo real do AutoBoard, mas eles podem ser menos relevantes para você.
        </p>
        <p className="text-muted-foreground">
          Alguns anúncios personalizados que nós, ou um prestador de serviços atuando em nosso nome, exibimos para você, podem incluir o ícone "Opções de anúncios" ou outro mecanismo para cancelar o recebimento de anúncios baseados em interesses. Clique no ícone AdChoices ou acesse <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.aboutads.info</a> para:
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>saber mais sobre a coleta e o uso de informações sobre suas atividades na Internet para publicidade baseada em interesses; ou</li>
          <li>cancelar o uso dos dados para publicidade baseada em interesses por empresas participantes da Digital Advertising Alliance (DAA).</li>
        </ul>

        <h2 className="text-2xl font-bold mt-6 mb-3">4. Atualizações nesta Política</h2>
        <p className="text-muted-foreground">
          Podemos, ocasionalmente, fazer mudanças nesta Política.
        </p>
        <p className="text-muted-foreground">
          Quando fizermos mudanças relevantes nesta Política, avisaremos você de forma visível, conforme apropriado diante das circunstâncias. Por exemplo, podemos mostrar um aviso em destaque no Serviço AutoBoard, enviar um e-mail ou uma notificação no seu dispositivo.
        </p>

        <h2 className="text-2xl font-bold mt-6 mb-3">5. Como entrar em contato com a gente</h2>
        <p className="text-muted-foreground">
          Agradecemos a leitura. Em caso de dúvidas sobre a Política de Cookies, fale com o Encarregado da Proteção de Dados usando o formulário de contato para atendimento ao cliente no Centro de privacidade ou envie uma carta para o seguinte endereço:
        </p>
        {/* Adicione o endereço de contato aqui, se houver */}
        <p className="text-muted-foreground italic">
          [Seu Endereço de Contato ou Informações de Suporte]
        </p>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default CookiePolicyPage;
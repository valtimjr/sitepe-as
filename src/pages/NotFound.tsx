import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Frown } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "Página Não Encontrada - AutoBoard";
  }, []);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold mb-4 text-primary dark:text-primary flex items-center justify-center gap-3">
          <Frown className="h-10 w-10 text-primary" />
          404
        </h1>
        <p className="text-xl text-muted-foreground mb-8">Oops! Página não encontrada</p>
        <Link to="/" className="text-primary hover:underline">
          Voltar para o Início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
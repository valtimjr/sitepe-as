import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Cria um chunk separado para bibliotecas grandes de PDF/Gráficos
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('recharts')) {
              return 'vendor-pdf-charts';
            }
            // Cria um chunk para bibliotecas de formulário/validação
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('hookform')) {
              return 'vendor-forms';
            }
            // Cria um chunk para bibliotecas de data
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            // Cria um chunk para o Supabase e suas dependências de UI
            if (id.includes('@supabase') || id.includes('auth-ui')) {
              return 'vendor-supabase';
            }
            // Deixa o resto das dependências no chunk 'vendor'
            return 'vendor';
          }
        },
      },
    },
  },
}));
import { UploadManager } from "@bytescale/sdk";

interface BytescaleFile {
  fileId: string;
  filePath: string;
  fileUrl: string;
  fileName: string;
  metadata?: {
    partCode?: string;
    description?: string;
    [key: string]: any;
  };
}

class BytescaleService {
  private apiKey: string;
  private accountId: string;
  private uploader: UploadManager | null = null;

  constructor() {
    this.apiKey = import.meta.env.VITE_BYTESCALE_API_KEY || '';
    this.accountId = import.meta.env.VITE_BYTESCALE_ACCOUNT_ID || '';

    if (this.apiKey && this.accountId) {
      this.uploader = new UploadManager({
        apiKey: this.apiKey,
        accountId: this.accountId,
      });
    } else {
      console.warn("Bytescale API Key or Account ID not configured. Image management features may not work.");
    }
  }

  /**
   * Lista arquivos de uma pasta específica no Bytescale.
   * @param folderPath O caminho da pasta (ex: 'parts/').
   * @returns Uma lista de arquivos do Bytescale.
   */
  async listFiles(folderPath: string): Promise<{ files: BytescaleFile[] }> {
    if (!this.uploader) {
      throw new Error("Bytescale uploader not initialized. Check API Key and Account ID configuration.");
    }

    // A API do Bytescale não tem uma função direta para listar arquivos por pasta.
    // Uma abordagem comum é listar todos os arquivos e filtrar pelo caminho.
    // Para simplificar, vamos simular uma listagem de arquivos com base em um mock ou uma chamada mais genérica se disponível.
    // Para uma implementação real, você precisaria de uma função de backend que use a API de listagem do Bytescale
    // ou uma forma de listar arquivos diretamente se o SDK permitir (o que não é o caso para listagem de diretórios).
    // Por enquanto, vamos retornar um mock ou uma lista vazia.

    // Exemplo de como seria uma chamada se houvesse uma API de listagem:
    // const response = await fetch(`https://api.bytescale.com/v2/accounts/${this.accountId}/files?folder=${folderPath}`, {
    //   headers: {
    //     Authorization: `Bearer ${this.apiKey}`,
    //   },
    // });
    // if (!response.ok) {
    //   throw new Error(`Failed to list files: ${response.statusText}`);
    // }
    // const data = await response.json();
    // return data;

    // Mock para demonstração:
    console.warn("Bytescale listFiles: Esta é uma implementação mock. Em produção, você precisaria de uma API de backend para listar arquivos do Bytescale.");
    return { files: [] };
  }

  /**
   * Extrai o código da peça do nome do arquivo ou metadados.
   * @param file O objeto BytescaleFile.
   * @returns O código da peça ou null se não for encontrado.
   */
  extractPartCode(file: BytescaleFile): string | null {
    // Prioriza metadados, depois tenta extrair do nome do arquivo
    if (file.metadata?.partCode) {
      return file.metadata.partCode;
    }

    // Exemplo: "CODIGO_DA_PECA-descricao.jpg" ou "CODIGO_DA_PECA.png"
    const match = file.fileName.match(/^([a-zA-Z0-9-]+)(?:_|-|\.)/);
    if (match && match[1]) {
      return match[1];
    }

    return null;
  }
}

export const bytescaleService = new BytescaleService();
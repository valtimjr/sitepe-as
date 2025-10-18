import { Part } from '@/services/partListService';

export async function loadPartsFromCsv(filePath: string): Promise<Part[]> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      console.error(`Failed to fetch CSV from ${filePath}: ${response.statusText}`);
      return [];
    }
    const text = await response.text();
    const lines = text.trim().split('\n');

    if (lines.length === 0) {
      console.warn('CSV file is empty.');
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const codigoIndex = headers.indexOf('codigo');
    const descricaoIndex = headers.indexOf('descricao');

    if (codigoIndex === -1 || descricaoIndex === -1) {
      console.error('CSV headers "codigo" and "descricao" not found. Please ensure your CSV has these columns.');
      return [];
    }

    const parts: Part[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length > Math.max(codigoIndex, descricaoIndex)) {
        parts.push({
          codigo: values[codigoIndex],
          descricao: values[descricaoIndex],
        });
      }
    }
    return parts;
  } catch (error) {
    console.error('Error loading or parsing CSV:', error);
    return [];
  }
}
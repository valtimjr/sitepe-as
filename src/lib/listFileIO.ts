import Papa from 'papaparse';
import { CompanyType } from '@/types/company';
import type { SimplePartItem, Part, Af } from '@/services/partListService';

// ---------- Types ----------

export type ImportField = 'codigo_peca' | 'descricao' | 'quantidade' | 'af';
export type MappingMode = 'column' | 'fixed' | 'ignore';
export type TextTransform = 'none' | 'upper' | 'lower' | 'capitalize';

export interface FieldMapping {
  mode: MappingMode;
  column: number | null;
  fixedValue: string;
  transform: TextTransform;
  trim: boolean;
}

export type MappingConfig = Record<ImportField, FieldMapping>;

export interface ImportFieldDef {
  id: ImportField;
  label: string;
  type: 'text' | 'number';
  requirement: string;
}

export const IMPORT_FIELDS: ImportFieldDef[] = [
  { id: 'codigo_peca', label: 'Código da Peça', type: 'text', requirement: 'Código ou descrição obrigatório' },
  { id: 'descricao', label: 'Descrição', type: 'text', requirement: 'Código ou descrição obrigatório' },
  { id: 'quantidade', label: 'Quantidade', type: 'number', requirement: 'Opcional (padrão 1)' },
  { id: 'af', label: 'AF', type: 'text', requirement: 'Opcional' },
];

export interface SpreadsheetData {
  matrix: string[][];
  sheets: string[];
  sheet?: string;
}

export interface ListJsonFile {
  app: 'autoboard';
  type: 'parts_list';
  version: number;
  company: string;
  name: string;
  exportedAt: string;
  items: { codigo_peca: string; descricao: string; quantidade: number; af: string }[];
}

export type ParsedJson =
  | { kind: 'app'; data: ListJsonFile }
  | { kind: 'generic'; matrix: string[][] };

export interface ImportRow {
  line: number;
  codigo_peca: string;
  descricao: string;
  quantidadeRaw: string;
  af: string;
}

export type RowStatus = 'ok' | 'warning' | 'error';

export interface ValidatedRow {
  index: number;
  line: number;
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  af: string;
  status: RowStatus;
  messages: string[];
}

// ---------- Helpers ----------

const cellToString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const getExtension = (name: string) => name.split('.').pop()?.toLowerCase() || '';

export const isSpreadsheetFile = (file: File) => ['csv', 'xlsx', 'xls', 'txt'].includes(getExtension(file.name));
export const isJsonFile = (file: File) => getExtension(file.name) === 'json';

const dropEmptyRows = (matrix: string[][]) =>
  matrix.filter(row => row.some(cell => cell.trim() !== ''));

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const columnLetter = (index: number) => {
  let s = '';
  let n = index + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// ---------- Parsing ----------

const parseCsv = (file: File): Promise<string[][]> =>
  new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: 'greedy',
      encoding: 'UTF-8',
      complete: results => resolve((results.data as unknown[][]).map(r => r.map(cellToString))),
      error: err => reject(err),
    });
  });

export const parseSpreadsheetFile = async (file: File, sheet?: string): Promise<SpreadsheetData> => {
  const ext = getExtension(file.name);
  if (ext === 'csv' || ext === 'txt') {
    return { matrix: dropEmptyRows(await parseCsv(file)), sheets: [] };
  }

  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheets = workbook.SheetNames;
  const sheetName = sheet && sheets.includes(sheet) ? sheet : sheets[0];
  const worksheet = workbook.Sheets[sheetName];
  const raw = worksheet
    ? (XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false, blankrows: false }) as unknown[][])
    : [];
  return { matrix: dropEmptyRows(raw.map(r => r.map(cellToString))), sheets, sheet: sheetName };
};

export const isListJson = (value: any): value is ListJsonFile =>
  !!value && typeof value === 'object' && value.app === 'autoboard' && value.type === 'parts_list' && Array.isArray(value.items);

export const parseListJson = async (file: File): Promise<ParsedJson> => {
  let parsed: any;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Arquivo JSON inválido.');
  }

  if (isListJson(parsed)) return { kind: 'app', data: parsed };

  const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : null;
  if (!arr || !arr.every((r: unknown) => r && typeof r === 'object' && !Array.isArray(r))) {
    throw new Error('O JSON deve ser uma lista de objetos ou um backup exportado pelo AutoBoard.');
  }

  const headers: string[] = [];
  arr.forEach((obj: Record<string, unknown>) => {
    Object.keys(obj).forEach(k => {
      if (!headers.includes(k)) headers.push(k);
    });
  });
  const matrix = [headers, ...arr.map((obj: Record<string, unknown>) => headers.map(h => cellToString(obj[h])))];
  return { kind: 'generic', matrix };
};

export const tableFromMatrix = (matrix: string[][], hasHeader: boolean) => {
  const width = matrix.reduce((max, r) => Math.max(max, r.length), 0);
  const headers = Array.from({ length: width }, (_, i) => {
    const h = hasHeader ? (matrix[0]?.[i] || '').trim() : '';
    return h || `Coluna ${columnLetter(i)}`;
  });
  const rows = hasHeader ? matrix.slice(1) : matrix;
  return { headers, rows };
};

// ---------- Mapping ----------

const FIELD_ALIASES: Record<ImportField, string[]> = {
  codigo_peca: ['codigopeca', 'codigo', 'cod', 'code', 'codpeca', 'partcode', 'sku', 'referencia', 'ref'],
  descricao: ['descricao', 'desc', 'description', 'nome', 'name', 'item', 'peca'],
  quantidade: ['quantidade', 'qtd', 'qtde', 'qty', 'quantity', 'quant'],
  af: ['af', 'afnumber', 'numeroaf', 'frota'],
};

const defaultFieldMapping = (field: ImportField): FieldMapping => ({
  mode: 'ignore',
  column: null,
  fixedValue: field === 'quantidade' ? '1' : '',
  transform: 'none',
  trim: true,
});

export const autoMapFields = (headers: string[]): MappingConfig => {
  const normalized = headers.map(normalize);
  const used = new Set<number>();
  const config = {} as MappingConfig;

  (Object.keys(FIELD_ALIASES) as ImportField[]).forEach(field => {
    const aliases = FIELD_ALIASES[field];
    let index = -1;
    for (const alias of aliases) {
      index = normalized.findIndex((h, i) => !used.has(i) && h === alias);
      if (index !== -1) break;
    }
    if (index === -1) {
      for (const alias of aliases.filter(a => a.length >= 3)) {
        index = normalized.findIndex((h, i) => !used.has(i) && h.startsWith(alias));
        if (index !== -1) break;
      }
    }
    const mapping = defaultFieldMapping(field);
    if (index !== -1) {
      used.add(index);
      mapping.mode = 'column';
      mapping.column = index;
    }
    config[field] = mapping;
  });

  return config;
};

export const applyTextTransform = (value: string, transform: TextTransform, trim: boolean): string => {
  let v = trim ? value.trim().replace(/\s+/g, ' ') : value;
  if (transform === 'upper') v = v.toLocaleUpperCase('pt-BR');
  else if (transform === 'lower') v = v.toLocaleLowerCase('pt-BR');
  else if (transform === 'capitalize') {
    v = v.toLocaleLowerCase('pt-BR').replace(/(^|\s)(\S)/g, (_, sp, ch) => sp + ch.toLocaleUpperCase('pt-BR'));
  }
  return v;
};

const resolveField = (row: string[], mapping: FieldMapping, isText: boolean): string => {
  let value = '';
  if (mapping.mode === 'column' && mapping.column !== null) value = row[mapping.column] ?? '';
  else if (mapping.mode === 'fixed') value = mapping.fixedValue;
  return isText ? applyTextTransform(value, mapping.transform, mapping.trim) : value.trim();
};

export const applyFieldMapping = (rows: string[][], mapping: MappingConfig, firstLine: number): ImportRow[] =>
  rows.map((row, i) => ({
    line: firstLine + i,
    codigo_peca: resolveField(row, mapping.codigo_peca, true),
    descricao: resolveField(row, mapping.descricao, true),
    quantidadeRaw: resolveField(row, mapping.quantidade, false),
    af: resolveField(row, mapping.af, true),
  }));

export const rowsFromListJson = (data: ListJsonFile): ImportRow[] =>
  data.items.map((item, i) => ({
    line: i + 1,
    codigo_peca: cellToString(item.codigo_peca).trim(),
    descricao: cellToString(item.descricao).trim(),
    quantidadeRaw: cellToString(item.quantidade).trim(),
    af: cellToString(item.af).trim(),
  }));

// ---------- Validation ----------

export const itemKey = (item: { codigo_peca?: string; descricao?: string; af?: string }) =>
  `${(item.codigo_peca || '').trim().toLowerCase()}|${item.codigo_peca ? '' : (item.descricao || '').trim().toLowerCase()}|${(item.af || '').trim().toLowerCase()}`;

export const validateImportRows = (
  rows: ImportRow[],
  ctx: { parts: Part[]; afs: Af[]; existingItems: SimplePartItem[]; fillDescription: boolean }
): ValidatedRow[] => {
  const partsByCode = new Map(ctx.parts.map(p => [(p.codigo || '').trim().toLowerCase(), p]));
  const afSet = new Set(ctx.afs.map(a => (a.af_number || '').trim().toLowerCase()));
  const existing = new Set(ctx.existingItems.map(itemKey));
  const seen = new Map<string, number>();

  return rows.map((row, index) => {
    const messages: string[] = [];
    let status: RowStatus = 'ok';
    const warn = (m: string) => {
      messages.push(m);
      if (status === 'ok') status = 'warning';
    };
    const fail = (m: string) => {
      messages.push(m);
      status = 'error';
    };

    let descricao = row.descricao;
    const part = row.codigo_peca ? partsByCode.get(row.codigo_peca.toLowerCase()) : undefined;
    if (ctx.fillDescription && row.codigo_peca && !descricao && part?.descricao) {
      descricao = part.descricao;
      messages.push('Descrição completada pelo cadastro');
    }

    if (!row.codigo_peca && !descricao) fail('Sem código e sem descrição');

    let quantidade = 1;
    if (row.quantidadeRaw === '') {
      warn('Quantidade vazia (definida como 1)');
    } else {
      const n = Number(row.quantidadeRaw.replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
        fail('Quantidade inválida (deve ser maior que 0)');
        quantidade = 0;
      } else {
        quantidade = n;
      }
    }

    if (row.codigo_peca && ctx.parts.length > 0 && !part) warn('Código não encontrado no cadastro');
    if (row.af && ctx.afs.length > 0 && !afSet.has(row.af.toLowerCase())) warn('AF não encontrada');

    const key = itemKey({ codigo_peca: row.codigo_peca, descricao, af: row.af });
    if (row.codigo_peca || descricao) {
      const firstLine = seen.get(key);
      if (firstLine !== undefined) warn(`Duplicada no arquivo (linha ${firstLine})`);
      else seen.set(key, row.line);
      if (existing.has(key)) warn('Já existe na lista ativa');
    }

    if (messages.length === 0) messages.push('Pronto para importar');

    return {
      index,
      line: row.line,
      codigo_peca: row.codigo_peca,
      descricao,
      quantidade,
      af: row.af,
      status,
      messages,
    };
  });
};

// ---------- Export ----------

export const listItemsForExport = (items: SimplePartItem[]) =>
  items.map(item => ({
    'Código': item.codigo_peca || '',
    'Descrição': item.descricao || '',
    'Quantidade': item.quantidade ?? 1,
    'AF': item.af || '',
  }));

export const buildListJson = (name: string, items: SimplePartItem[], company: CompanyType): ListJsonFile => ({
  app: 'autoboard',
  type: 'parts_list',
  version: 1,
  company,
  name,
  exportedAt: new Date().toISOString(),
  items: items.map(item => ({
    codigo_peca: item.codigo_peca || '',
    descricao: item.descricao || '',
    quantidade: item.quantidade ?? 1,
    af: item.af || '',
  })),
});

export const exportListAsXlsx = async (items: SimplePartItem[], filename: string): Promise<void> => {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.json_to_sheet(listItemsForExport(items));
  sheet['!cols'] = [{ wch: 18 }, { wch: 50 }, { wch: 12 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Lista');
  XLSX.writeFile(workbook, filename);
};

export const safeFileName = (name: string) =>
  (name || 'lista').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_') || 'lista';

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

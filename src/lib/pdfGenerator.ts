import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { SimplePartItem, ServiceOrderItem, Apontamento } from '@/services/partListService'; // Importar as novas interfaces
import { format, parseISO, setHours, setMinutes, addDays, subMonths, addMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CustomListItem } from '@/types/supabase';

// Aplica o plugin explicitamente ao jsPDF
applyPlugin(jsPDF);

// Mapeamento de Status para Cores RGB (para PDF)
const PDF_STATUS_COLORS = {
  Folga: {
    text: [255, 255, 255], // Branco
    fill: [22, 163, 74], // Verde (similar ao green-600)
  },
  Falta: {
    text: [255, 255, 255], // Branco
    fill: [220, 38, 38], // Vermelho (similar ao red-600)
  },
  Suspensao: {
    text: [255, 255, 255], // Branco
    fill: [202, 138, 4], // Amarelo/Ouro (similar ao yellow-600)
  },
  Outros: {
    text: [255, 255, 255], // Branco
    fill: [37, 99, 235], // Azul (similar ao blue-600)
  },
};

// Função auxiliar para calcular a diferença de tempo (duplicada do componente, mas necessária para o PDF)
const calculateTotalHours = (entry?: string, exit?: string): string => {
  if (!entry || !exit) return '';
  
  try {
    const [entryH, entryM] = entry.split(':').map(Number);
    const [exitH, exitM] = exit.split(':').map(Number);

    let entryTime = setHours(setMinutes(new Date(), entryM), entryH);
    let exitTime = setHours(setMinutes(new Date(), exitM), exitH);

    // Se a hora de saída for anterior à de entrada, assume que passou da meia-noite
    if (exitTime.getTime() < entryTime.getTime()) {
      exitTime = addDays(exitTime, 1);
    }

    const diffMs = exitTime.getTime() - entryTime.getTime();
    if (diffMs < 0) return 'Inválido';

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  } catch {
    return 'Inválido';
  }
};

export const generatePartsListPdf = (listItems: SimplePartItem[], title: string = 'Lista de Peças'): void => {
  const doc = new jsPDF();
  let currentY = 22;

  doc.setFontSize(18);
  doc.text('Lista de Peças', 14, currentY);
  currentY += 8;

  // Adiciona o título personalizado (Título da Lista)
  if (title && title !== 'Lista de Peças Simples') {
    doc.setFontSize(12);
    doc.text(title, 14, currentY);
    currentY += 8;
  }

  // Colunas simplificadas para a lista de peças
  const tableColumn = ["Código da Peça", "Descrição", "Quantidade", "AF"]; // AF movido para o final
  const tableRows: (string | number | undefined)[][] = [];

  listItems.forEach(item => {
    const itemData = [
      item.codigo_peca || 'N/A',
      item.descricao || 'N/A',
      item.quantidade ?? 'N/A',
      item.af || '', // AF movido para o final
    ];
    tableRows.push(itemData);
  });

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: currentY,
    styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 10 },
  });

  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
};

export const generateCustomListPdf = (listItems: CustomListItem[], title: string): void => {
  const doc = new jsPDF();
  let currentY = 22;

  doc.setFontSize(18);
  doc.text('Lista Personalizada de Peças', 14, currentY);
  currentY += 8;

  // Adiciona o título da lista
  doc.setFontSize(12);
  doc.text(title, 14, currentY);
  currentY += 8;

  // Colunas para a lista personalizada
  const tableColumn = ["Qtd", "Nome", "Cód. Peça", "Descrição"];
  const tableRows: (string | number | null)[][] = [];

  listItems.forEach(item => {
    const itemData = [
      item.quantity,
      item.item_name,
      item.part_code || 'N/A',
      item.description || 'N/A',
    ];
    tableRows.push(itemData);
  });

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: currentY,
    styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 10 },
  });

  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
};

export const generateServiceOrderPdf = (listItems: ServiceOrderItem[], title: string = 'Ordens de Serviço'): void => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  const tableColumn = ["AF", "OS", "Início", "Fim", "Serviço Executado", "Peça", "Quantidade"];
  const tableRows: any[] = [];

  const groupedForPdf: { [key: string]: {
    af: string;
    os?: number;
    servico_executado?: string;
    hora_inicio?: string;
    hora_final?: string;
    createdAt: Date;
    parts: { id: string; quantidade?: number; descricao?: string; codigo_peca?: string }[];
  } } = {};

  listItems.forEach(item => {
    const key = `${item.af}-${item.os || 'no_os'}-${item.servico_executado || 'no_service'}-${item.hora_inicio || 'no_start'}-${item.hora_final || 'no_end'}`;
    if (!groupedForPdf[key]) {
      groupedForPdf[key] = {
        af: item.af,
        os: item.os,
        servico_executado: item.servico_executado,
        hora_inicio: item.hora_inicio,
        hora_final: item.hora_final,
        createdAt: item.created_at || new Date(),
        parts: [],
      };
    } else {
      if (item.created_at && groupedForPdf[key].createdAt && item.created_at < groupedForPdf[key].createdAt) {
        groupedForPdf[key].createdAt = item.created_at;
      }
    }
    groupedForPdf[key].parts.push({
      id: item.id,
      quantidade: item.quantidade,
      descricao: item.descricao,
      codigo_peca: item.codigo_peca,
    });
  });

  const compareTimeStrings = (t1: string | undefined, t2: string | undefined): number => {
    const time1 = t1 || '';
    const time2 = t2 || '';
    const d1 = time1.length > 0;
    const d2 = time2.length > 0;

    // Prioritize defined times (defined comes first)
    if (d1 && !d2) return -1;
    if (!d1 && d2) return 1;
    
    // If both defined or both undefined, sort chronologically (string comparison works for HH:MM)
    if (time1 < time2) return -1;
    if (time1 > time2) return 1;
    return 0;
  };

  const sortedGroups = Object.values(groupedForPdf).sort((a, b) => {
    // 1. Ordenar por hora_inicio
    const startComparison = compareTimeStrings(a.hora_inicio, b.hora_inicio);
    if (startComparison !== 0) return startComparison;

    // 2. Ordenar por hora_final
    const endComparison = compareTimeStrings(a.hora_final, b.hora_final);
    if (endComparison !== 0) return endComparison;

    // 3. Fallback para created_at (mais antigo primeiro)
    if (!a.createdAt || !b.createdAt) return 0;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  sortedGroups.forEach(group => {
    group.parts.forEach((part, index) => {
      const partDescription = part.codigo_peca && part.descricao 
        ? `${part.codigo_peca} - ${part.descricao}` 
        : part.codigo_peca || part.descricao || '';

      if (index === 0) {
        tableRows.push([
          { content: group.af, rowSpan: group.parts.length, styles: { valign: 'top', fontStyle: 'bold' } },
          { content: group.os || '', rowSpan: group.parts.length, styles: { valign: 'top' } },
          { content: group.hora_inicio || '', rowSpan: group.parts.length, styles: { valign: 'top' } },
          { content: group.hora_final || '', rowSpan: group.parts.length, styles: { valign: 'top' } },
          { content: group.servico_executado || '', rowSpan: group.parts.length, styles: { valign: 'top', cellWidth: 40 } },
          partDescription,
          part.quantidade ?? '',
        ]);
      } else {
        tableRows.push([
          partDescription,
          part.quantidade ?? '',
        ]);
      }
    });
  });

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 30,
    styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 10 },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.index > 0) {
        // A lógica de agrupamento para a borda precisa ser ajustada para usar os dados do `sortedGroups`
        // e não diretamente `listItems` que não está agrupado da mesma forma.
        // Por simplicidade, vou remover a lógica de borda condicional por enquanto,
        // pois ela se baseava em `listItems[data.row.index - 1]` que não reflete o agrupamento do PDF.
        // Se a borda for essencial, precisaremos de uma abordagem mais robusta para rastrear os grupos no PDF.
      }
    }
  });

  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
};

export const generateTimeTrackingPdf = (apontamentos: Apontamento[], title: string): void => {
  const doc = new jsPDF();
  let currentY = 22;

  // O 'title' é esperado no formato:
  // Linha 1: Apontamento de Horas - Mês Ano
  // Linha 2: Crachá - Nome Completo
  const titleLines = title.split('\n').filter(line => line.trim() !== '');
  
  if (titleLines.length > 0) {
    // Linha 1: Título Principal (Apontamento de Horas - Mês Ano)
    const mainTitle = titleLines[0];
    doc.setFontSize(14); // Reduzido de 18 para 14
    doc.setFont(undefined, 'bold');
    doc.text(mainTitle, 14, currentY);
    currentY += 6; // Reduzido o espaçamento

    if (titleLines.length > 1) {
      // Linha 2: Subtítulo (Crachá - Nome Completo)
      const subTitle = titleLines[1];
      doc.setFontSize(10); // Reduzido de 12 para 10
      doc.setFont(undefined, 'normal');
      doc.text(subTitle, 14, currentY);
      currentY += 7; // Reduzido o espaçamento
    }
  } else {
    // Fallback
    doc.setFontSize(14);
    doc.text('Apontamento de Horas', 14, currentY);
    currentY += 7;
  }

  // Definindo as colunas: Dia, Horas (Entrada - Saída), Total / Status
  const tableColumn = ["Dia", "Horas (Entrada - Saída)", "Total / Status"];
  const tableRows: any[] = [];

  apontamentos.forEach(a => {
    const day = format(parseISO(a.date), 'dd/MM (EEE)', { locale: ptBR });
    
    const hasStatus = !!a.status;
    
    if (hasStatus) {
      // Se tem status, a linha terá 2 colunas mescladas para o status
      tableRows.push([
        day, 
        { content: a.status, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }
      ]);
    } else {
      // Se não tem status, a linha terá 3 colunas normais
      const entry = a.entry_time || '';
      const exit = a.exit_time || '';
      const hoursDisplay = entry && exit ? `${entry} - ${exit}` : entry || exit || '';
      const statusOrTotal = calculateTotalHours(a.entry_time, a.exit_time);
      
      tableRows.push([day, hoursDisplay, statusOrTotal]);
    }
  });

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: currentY,
    styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' }, // Reduzido o tamanho da fonte e padding
    headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 }, // Reduzido o tamanho da fonte do cabeçalho
    columnStyles: {
      0: { cellWidth: 25, halign: 'left' }, // Dia
      1: { cellWidth: 50, halign: 'center' }, // Horas
      2: { cellWidth: 30, halign: 'center' }, // Status / Total
    },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 10, left: 14, right: 14 }, // Margens padrão
    didParseCell: (data: any) => {
      const rowData = apontamentos[data.row.index];
      const hasStatus = !!rowData?.status;
      
      if (hasStatus) {
        const statusKey = rowData.status.includes('Outros') ? 'Outros' : rowData.status.split(':')[0];
        const statusColors = PDF_STATUS_COLORS[statusKey as keyof typeof PDF_STATUS_COLORS];

        // A célula mesclada é a segunda célula (index 1) na linha do body
        if (data.column.index === 1) {
          // Esta célula é a que contém o status e deve ter colSpan=2
          data.cell.colSpan = 2; 
          data.cell.styles.halign = 'center';
          data.cell.styles.fontStyle = 'bold';
          if (statusColors) {
            data.cell.styles.fillColor = statusColors.fill;
            data.cell.styles.textColor = statusColors.text;
          }
        }
      }
    }
  });

  // Cria um nome de arquivo seguro, usando o título principal e o subtítulo
  const fileNamePart1 = titleLines[0] ? titleLines[0].replace(/[^a-zA-Z0-9_]/g, '_') : 'Apontamento';
  const fileNamePart2 = titleLines[1] ? titleLines[1].replace(/[^a-zA-Z0-9_]/g, '_') : format(new Date(), 'MMMM_yyyy');
  
  doc.save(`${fileNamePart1}_${fileNamePart2}.pdf`);
};
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { SimplePartItem, ServiceOrderItem, Apontamento } from '@/services/partListService'; // Importar as novas interfaces
import { format, parseISO, setHours, setMinutes, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  const sortedGroups = Object.values(groupedForPdf).sort((a, b) => {
    // 1. Ordenar por hora_inicio (se presente)
    const timeA = a.hora_inicio || '';
    const timeB = b.hora_inicio || '';

    if (timeA && timeB) {
      if (timeA < timeB) return -1;
      if (timeA > timeB) return 1;
    } else if (timeA && !timeB) {
      return -1; // A com hora_inicio vem antes de B sem
    } else if (!timeA && timeB) {
      return 1; // B com hora_inicio vem antes de A sem
    }

    // 2. Ordenar por hora_final (se presente)
    const timeEndA = a.hora_final || '';
    const timeEndB = b.hora_final || '';

    if (timeEndA && timeEndB) {
      if (timeEndA < timeEndB) return -1;
      if (timeEndA > timeEndB) return 1;
    } else if (timeEndA && !timeEndB) {
      return -1; // A com hora_final vem antes de B sem
    } else if (!timeEndA && timeEndB) {
      return 1; // B com hora_final vem antes de A sem
    }

    // 3. Fallback para created_at
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

  doc.setFontSize(18);
  doc.text(title, 14, currentY);
  currentY += 8;

  // Definindo as colunas: Dia, Entrada, Saída, Status/Total
  const tableColumn = ["Dia", "Entrada", "Saída", "Total / Status"];
  const tableRows: any[] = [];

  apontamentos.forEach(a => {
    const day = format(parseISO(a.date), 'dd/MM (EEE)', { locale: ptBR });
    
    const hasStatus = !!a.status;
    
    if (hasStatus) {
      // Se tem status, a linha terá 2 colunas mescladas para o status
      tableRows.push([
        day, 
        { content: a.status, colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } }
      ]);
    } else {
      // Se não tem status, a linha terá 4 colunas normais
      const entry = a.entry_time || '';
      const exit = a.exit_time || '';
      const statusOrTotal = calculateTotalHours(a.entry_time, a.exit_time);
      
      tableRows.push([day, entry, exit, statusOrTotal]);
    }
  });

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: currentY,
    styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 30, halign: 'left' }, // Dia
      1: { cellWidth: 25, halign: 'center' }, // Entrada
      2: { cellWidth: 25, halign: 'center' }, // Saída
      3: { cellWidth: 80, halign: 'center' }, // Status / Total
    },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 10 },
    didParseCell: (data: any) => {
      const rowData = apontamentos[data.row.index];
      const hasStatus = !!rowData?.status;
      
      if (hasStatus) {
        const statusKey = rowData.status.includes('Outros') ? 'Outros' : rowData.status.split(':')[0];
        const statusColors = PDF_STATUS_COLORS[statusKey as keyof typeof PDF_STATUS_COLORS];

        // A célula mesclada é a segunda célula (index 1) na linha do body
        if (data.column.index === 1) {
          // Esta célula é a que contém o status e deve ter colSpan=3
          data.cell.colSpan = 3; 
          data.cell.styles.halign = 'center';
          data.cell.styles.fontStyle = 'bold';
          if (statusColors) {
            data.cell.styles.fillColor = statusColors.fill;
            data.cell.styles.textColor = statusColors.text;
          }
        }
        // As colunas 2 e 3 (Saída e Status/Total) devem ser ignoradas pelo autotable
        // quando a coluna 1 tem colSpan=3.
        // Não precisamos definir explicitamente cellWidth=0.0001, pois o colSpan deve resolver.
      }
    }
  });

  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
};
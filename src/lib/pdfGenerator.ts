import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { SimplePartItem, ServiceOrderItem } from '@/services/partListService'; // Importar as novas interfaces

// Aplica o plugin explicitamente ao jsPDF
applyPlugin(jsPDF);

export const generatePartsListPdf = (listItems: SimplePartItem[], title: string = 'Lista de Peças'): void => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Colunas simplificadas para a lista de peças
  const tableColumn = ["Código da Peça", "Descrição", "Quantidade"];
  const tableRows: (string | number | undefined)[][] = [];

  listItems.forEach(item => {
    const itemData = [
      item.codigo_peca || 'N/A',
      item.descricao || 'N/A',
      item.quantidade ?? 'N/A',
    ];
    tableRows.push(itemData);
  });

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 30,
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
    if (a.af < b.af) return -1;
    if (a.af > b.af) return 1;
    if ((a.os || 0) < (b.os || 0)) return -1;
    if ((a.os || 0) > (b.os || 0)) return 1;
    return 0;
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
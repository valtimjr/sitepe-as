import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { ListItem } from '@/services/partListService';

// Aplica o plugin explicitamente ao jsPDF
applyPlugin(jsPDF);

export const generatePartsListPdf = (listItems: ListItem[], title: string = 'Lista de Peças'): void => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  const tableColumn = ["Código da Peça", "Descrição", "Quantidade", "AF", "OS", "Hora Início", "Hora Final", "Serviço Executado"];
  const tableRows: (string | number | undefined)[][] = [];

  listItems.forEach(item => {
    const itemData = [
      item.codigo_peca,
      item.descricao,
      item.quantidade,
      item.af,
      item.os || '',
      item.hora_inicio || '',
      item.hora_final || '',
      item.servico_executado || '',
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

export const generateServiceOrderPdf = (listItems: ListItem[], title: string = 'Ordens de Serviço'): void => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  const tableColumn = ["AF", "OS", "Início", "Fim", "Serviço Executado", "Peça", "Quantidade"];
  const tableRows: any[] = []; // Usaremos 'any' para flexibilidade com rowSpan

  // Agrupar itens por AF, OS, Hora Início, Hora Final, Serviço Executado
  const groupedForPdf: { [key: string]: {
    af: string;
    os?: number;
    servico_executado?: string;
    hora_inicio?: string;
    hora_final?: string;
    parts: { id: string; quantidade: number; descricao: string; codigo_peca: string }[];
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
        parts: [],
      };
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
      if (index === 0) {
        // Primeira peça do grupo, inclui os detalhes da OS com rowSpan
        tableRows.push([
          { content: group.af, rowSpan: group.parts.length, styles: { valign: 'top', fontStyle: 'bold' } },
          { content: group.os || 'N/A', rowSpan: group.parts.length, styles: { valign: 'top' } },
          { content: group.hora_inicio || 'N/A', rowSpan: group.parts.length, styles: { valign: 'top' } },
          { content: group.hora_final || 'N/A', rowSpan: group.parts.length, styles: { valign: 'top' } },
          { content: group.servico_executado || 'N/A', rowSpan: group.parts.length, styles: { valign: 'top', cellWidth: 40 } }, // Ajuste de largura para serviço
          `${part.codigo_peca} - ${part.descricao}`,
          part.quantidade,
        ]);
      } else {
        // Peças subsequentes do grupo, apenas detalhes da peça
        tableRows.push([
          `${part.codigo_peca} - ${part.descricao}`,
          part.quantidade,
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
      // Adiciona uma borda superior para o primeiro item de cada grupo para visualmente separar as ordens
      if (data.section === 'body' && data.row.index > 0) {
        const previousRow = tableRows[data.row.index - 1];
        const currentRow = tableRows[data.row.index];
        // Verifica se o AF do item atual é diferente do AF do item anterior (ou se é o primeiro item de um novo grupo)
        // A lógica de agrupamento já garante que o primeiro item de um grupo terá rowSpan, então podemos usar isso.
        if (data.cell.raw instanceof Object && data.cell.raw.rowSpan && data.cell.raw.rowSpan > 0) {
          data.cell.styles.lineWidth = { top: 0.5 };
          data.cell.styles.lineColor = { top: [0, 0, 0] };
        }
      }
    }
  });

  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
};
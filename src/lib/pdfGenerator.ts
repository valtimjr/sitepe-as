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
      item.codigo_peca || 'N/A',
      item.descricao || 'N/A',
      item.quantidade ?? 'N/A', // Usar ?? para 0 ou undefined
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
  const tableRows: any[] = [];

  const groupedForPdf: { [key: string]: {
    af: string;
    os?: number;
    servico_executado?: string;
    hora_inicio?: string;
    hora_final?: string;
    parts: { id: string; quantidade?: number; descricao?: string; codigo_peca?: string }[]; // Campos de peça opcionais
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
      const partDescription = part.codigo_peca && part.descricao 
        ? `${part.codigo_peca} - ${part.descricao}` 
        : part.codigo_peca || part.descricao || 'N/A';

      if (index === 0) {
        tableRows.push([
          { content: group.af, rowSpan: group.parts.length, styles: { valign: 'top', fontStyle: 'bold' } },
          { content: group.os || 'N/A', rowSpan: group.parts.length, styles: { valign: 'top' } },
          { content: group.hora_inicio || 'N/A', rowSpan: group.parts.length, styles: { valign: 'top' } },
          { content: group.hora_final || 'N/A', rowSpan: group.parts.length, styles: { valign: 'top' } },
          { content: group.servico_executado || 'N/A', rowSpan: group.parts.length, styles: { valign: 'top', cellWidth: 40 } },
          partDescription,
          part.quantidade ?? 'N/A',
        ]);
      } else {
        tableRows.push([
          partDescription,
          part.quantidade ?? 'N/A',
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
        const previousGroupKey = `${listItems[data.row.index - 1].af}-${listItems[data.row.index - 1].os || 'no_os'}-${listItems[data.row.index - 1].servico_executado || 'no_service'}-${listItems[data.row.index - 1].hora_inicio || 'no_start'}-${listItems[data.row.index - 1].hora_final || 'no_end'}`;
        const currentGroupKey = `${listItems[data.row.index].af}-${listItems[data.row.index].os || 'no_os'}-${listItems[data.row.index].servico_executado || 'no_service'}-${listItems[data.row.index].hora_inicio || 'no_start'}-${listItems[data.row.index].hora_final || 'no_end'}`;
        
        if (currentGroupKey !== previousGroupKey && data.column.index === 0) { // Aplica borda apenas na primeira célula da nova OS
          data.cell.styles.lineWidth = { top: 0.5 };
          data.cell.styles.lineColor = { top: [0, 0, 0] };
        }
      }
    }
  });

  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
};
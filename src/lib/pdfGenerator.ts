import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable'; // Importa a função applyPlugin
import { ListItem } from '@/services/partListService';

// Aplica o plugin explicitamente ao jsPDF
applyPlugin(jsPDF);

export const generatePartsListPdf = (listItems: ListItem[], title: string = 'Lista de Peças'): void => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  const tableColumn = ["Código da Peça", "Descrição", "Quantidade", "AF"];
  const tableRows: (string | number)[][] = [];

  listItems.forEach(item => {
    const itemData = [
      item.codigo_peca,
      item.descricao,
      item.quantidade,
      item.af,
    ];
    tableRows.push(itemData);
  });

  // Agora, doc.autoTable deve estar disponível
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
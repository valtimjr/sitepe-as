import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable'; // Importa a função applyPlugin
import { ListItem } from '@/services/partListService';

// Aplica o plugin explicitamente ao jsPDF
applyPlugin(jsPDF);

export const generatePartsListPdf = (listItems: ListItem[], title: string = 'Lista de Peças'): void => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  const tableColumn = ["Código da Peça", "Descrição", "Quantidade", "AF", "OS", "Hora Início", "Hora Final", "Serviço Executado"]; // Adiciona novas colunas
  const tableRows: (string | number | undefined)[][] = []; // Permite undefined para campos opcionais

  listItems.forEach(item => {
    const itemData = [
      item.codigo_peca,
      item.descricao,
      item.quantidade,
      item.af,
      item.os || '', // Adiciona OS, vazio se undefined
      item.hora_inicio || '', // Adiciona Hora Início, vazio se undefined
      item.hora_final || '',   // Adiciona Hora Final, vazio se undefined
      item.servico_executado || '', // Adiciona Serviço Executado, vazio se undefined
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
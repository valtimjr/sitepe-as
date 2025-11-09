import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { SimplePartItem, ServiceOrderItem, Apontamento } from '@/services/partListService'; // Importar as novas interfaces
import { format, parseISO, setHours, setMinutes, addDays, subMonths, addMonths, getDay } from 'fns';
import { ptBR } from 'date-fns/locale';
import { CustomListItem, MangueiraPartDetails } from '@/types/supabase';
import { localDb } from '@/services/localDbService';

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
  Atestado: { // NOVO STATUS
    text: [255, 255, 255], // Branco
    fill: [37, 99, 235], // Azul (similar ao blue-600)
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
    const baseDate = new Date(2000, 0, 1); // Usar uma data base arbitrária
    const [entryH, entryM] = entry.split(':').map(Number);
    const [exitH, exitM] = exit.split(':').map(Number);

    let entryTime = setHours(setMinutes(baseDate, entryM), entryH);
    let exitTime = setHours(setMinutes(baseDate, exitM), exitH);

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

// NOVO: Função auxiliar para converter hora em minutos efetivos para ordenação
const timeToEffectiveMinutes = (timeString: string | undefined): number | null => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;

  let totalMinutes = hours * 60 + minutes;
  // Se o horário for entre 00:00 (inclusive) e 07:00 (exclusive),
  // adiciona 24 horas (1440 minutos) para que seja ordenado efetivamente no "dia seguinte".
  // Isso faz com que os turnos noturnos que cruzam a meia-noite sejam ordenados corretamente após os turnos da noite.
  if (hours >= 0 && hours < 7) { // Horários de 00:00 a 06:59
    totalMinutes += 24 * 60;
  }
  return totalMinutes;
};

// ATUALIZADO: Função auxiliar para comparar strings de tempo usando minutos efetivos
const compareTimeStringsForPdf = (t1: string | undefined, t2: string | undefined): number => {
  const effectiveMinutes1 = timeToEffectiveMinutes(t1);
  if (effectiveMinutes1 === null) return 1;
  const effectiveMinutes2 = timeToEffectiveMinutes(t2);
  if (effectiveMinutes2 === null) return -1;

  return effectiveMinutes1 - effectiveMinutes2;
};

export const generatePartsListPdf = async (listItems: SimplePartItem[], title: string = 'Lista de Peças'): Promise<void> => {
  const doc = new jsPDF();
  let currentY = 22;

  doc.setFontSize(18);
  doc.text(title, 14, currentY); // Usa o título fornecido como título principal
  currentY += 8;

  // Colunas: Código da Peça, Nome, Quantidade, Descrição
  const tableColumn = ["Cód. Peça", "Nome", "Quantidade", "Descrição", "AF"];
  const tableRows: (string | number | undefined)[][] = [];

  for (const item of listItems) {
    // Tenta obter o nome da peça (se disponível)
    const part = await localDb.parts.where('codigo').equals(item.codigo_peca || '').first();
    
    // Ajusta a ordem dos dados para a tabela
    tableRows.push([
      item.codigo_peca || 'N/A',
      part?.name || 'N/A', // Adiciona o campo Nome
      item.quantidade ?? 'N/A',
      item.descricao || 'N/A',
      item.af || '',
    ]);
  }

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: currentY,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak', lineWidth: 0 },
    headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 10 },
  });

  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
};

export const generateCustomListPdf = (listItems: CustomListItem[], title: string): void => {
  const doc = new jsPDF({ orientation: 'portrait' });
  let currentY = 22;

  doc.setFontSize(18);
  doc.text(title, 14, currentY);
  currentY += 10;

  let currentGroupType: 'item' | 'mangueira' | null = null;
  let currentGroupRows: any[] = [];

  const simpleItemHeader = ["Qtd", "Código", "Descrição"];
  const simpleItemColumnStyles = {
    0: { cellWidth: 15, halign: 'center' }, // Qtd
    1: { cellWidth: 25 }, // Código
    2: { cellWidth: 'auto' }, // Descrição
  };

  const mangueiraHeader = ["Qtd", "Mangueira", "Corte (cm)", "Conexão 1", "Conexão 2"];
  const mangueiraColumnStyles = {
    0: { cellWidth: 15, halign: 'center' }, // Qtd
    1: { cellWidth: 45 }, // Mangueira
    2: { cellWidth: 25, halign: 'center' }, // Corte
    3: { cellWidth: 45 }, // Conexão 1
    4: { cellWidth: 'auto' }, // Conexão 2
  };

  const renderGroup = () => {
    if (currentGroupRows.length === 0) return;

    let head, columnStyles;
    if (currentGroupType === 'item') {
      head = [simpleItemHeader];
      columnStyles = simpleItemColumnStyles;
    } else if (currentGroupType === 'mangueira') {
      head = [mangueiraHeader];
      columnStyles = mangueiraColumnStyles;
    }

    if (head) {
      (doc as any).autoTable({
        head: head,
        body: currentGroupRows,
        startY: currentY,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak', lineWidth: 0 },
        headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        margin: { top: 10, left: 14, right: 14 },
        columnStyles: columnStyles,
      });
      currentY = (doc as any).lastAutoTable.finalY;
    }

    currentGroupRows = [];
    currentGroupType = null;
  };

  listItems.forEach(item => {
    if (item.type === 'separator') {
      renderGroup();
      currentY += 2;
      doc.setDrawColor(200);
      doc.line(14, currentY, 196, currentY);
      currentY += 4;
      return;
    }

    if (item.type === 'subtitle') {
      renderGroup();
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(37, 99, 235); // primary color
      doc.text(item.item_name.toUpperCase(), 14, currentY);
      currentY += 7;
      return;
    }

    if (item.type !== currentGroupType && currentGroupType !== null) {
      renderGroup();
    }
    currentGroupType = item.type;

    if (item.type === 'mangueira' && item.mangueira_data) {
      const data = item.mangueira_data;
      const createContent = (partData: MangueiraPartDetails) => {
        const content = [];
        if (partData.codigo) {
          content.push({ content: `Cód.: ${partData.codigo}`, styles: { fontStyle: 'normal', fontSize: 9, textColor: [37, 99, 235] } });
        }
        if (partData.name) {
          content.push({ content: partData.name, styles: { fontStyle: 'normal', fontSize: 9 } });
        }
        if (partData.description) {
          content.push({ content: partData.description, styles: { fontStyle: 'italic', fontSize: 8 } });
        }
        return content;
      };

      currentGroupRows.push([
        { content: '1', styles: { halign: 'center' } },
        createContent(data.mangueira),
        { content: `${data.corte_cm} cm`, styles: { halign: 'center' } },
        createContent(data.conexao1),
        createContent(data.conexao2),
      ]);
    } else if (item.type === 'item') {
      const descriptionContent = [];
      if (item.item_name) {
        descriptionContent.push({ content: item.item_name, styles: { fontStyle: 'normal', fontSize: 9 } });
      }
      if (item.description) {
        descriptionContent.push({ content: item.description, styles: { fontStyle: 'italic', fontSize: 8 } });
      }

      currentGroupRows.push([
        { content: item.quantity, styles: { halign: 'center' } },
        item.part_code ? { content: `Cód.: ${item.part_code}`, styles: { textColor: [37, 99, 235] } } : '',
        descriptionContent,
      ]);
    }
  });

  renderGroup(); // Render the last group

  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
};

// ATUALIZADO: generateServiceOrderPdf agora aceita ServiceOrderGroup[]
export const generateServiceOrderPdf = (groupedServiceOrders: any[], title: string = 'Ordens de Serviço'): void => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  const tableColumn = ["Detalhes da OS", "Peça", "Qtd."];
  const tableRows: any[] = [];

  groupedServiceOrders.forEach(group => {
    // Create the content for the first column
    let detailsContent = `AF: ${group.af}`;
    if (group.os) detailsContent += ` (OS: ${group.os})`;
    if (group.hora_inicio || group.hora_final) {
      detailsContent += `
Horário: ${group.hora_inicio || '??'} - ${group.hora_final || '??'}`;
    }
    if (group.servico_executado) {
      detailsContent += `
Serviço: ${group.servico_executado}`;
    }

    const partsToRender = group.parts.length > 0 ? group.parts : [{ id: 'no-parts', codigo_peca: 'Nenhuma peça adicionada', descricao: '', quantidade: '' }];
    
    partsToRender.forEach((part: any, index: number) => {
      const partDescription = part.codigo_peca && part.descricao 
        ? `${part.codigo_peca} - ${part.descricao}` 
        : part.codigo_peca || part.descricao || 'N/A';

      if (index === 0) {
        tableRows.push([
          { content: detailsContent, rowSpan: partsToRender.length, styles: { valign: 'top' } },
          partDescription,
          { content: part.quantidade ?? '', styles: { halign: 'center' } },
        ]);
      } else {
        tableRows.push([
          partDescription,
          { content: part.quantidade ?? '', styles: { halign: 'center' } },
        ]);
      }
    });
  });

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 30,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak', lineWidth: 0 },
    headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' }, // Details column
      1: { cellWidth: 'auto' }, // Part column
      2: { cellWidth: 15, halign: 'center' }, // Quantity column
    },
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
    const mainTitle = titleLines[0];
    // Linha 1: Título Principal (Apontamento de Horas - Mês Ano)
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
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak', lineWidth: 0 }, // Reduzido o tamanho da fonte e padding
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
        const statusKey = rowData.status.includes('Outros') ? 'Outros' : rowData.status.includes('Atestado') ? 'Atestado' : rowData.status.split(':')[0];
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
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { SimplePartItem, ServiceOrderItem, Apontamento } from '@/services/partListService'; // Importar as novas interfaces
import { format, parseISO, setHours, setMinutes, addDays, subMonths, addMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CustomListItem, MangueiraPartDetails } from '@/types/supabase';
import { localDb } from '@/services/localDbService';
import { calculateDailyTimesAndGaps } from '@/services/shiftService';
import type { ListIcon } from '@/types/listIcon';
import type { ListCover } from '@/types/listCover';
import { renderListIconToPng, loadImageAsDataUrl, type LoadedImage } from '@/lib/pdfIcons';
import { renderCoverToPng } from '@/lib/pdfCover';

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

// ---------- Cabeçalho, ícones e utilitários dos PDFs de listas ----------

const PAGE_MARGIN_X = 14;
const CONTENT_TOP = 30;
const PAGE_BOTTOM_MARGIN = 14;

export interface ListPdfOptions {
  title: string;
  listIcon?: ListIcon | null;
  cover?: ListCover | null;
  companyName: string;
  logoUrl?: string;
}

interface PdfHeaderData {
  logo: LoadedImage | null;
  companyName: string;
}

const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

/** Remove emojis e caracteres que a Helvetica do jsPDF não tem (mantém acentos). */
export const pdfSafeText = (text: string | null | undefined): string =>
  Array.from(text || '')
    .filter(ch => {
      const code = ch.codePointAt(0) ?? 0;
      return code === 10 || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.includes(ch);
    })
    .join('')
    .replace(/[ \t]+/g, ' ')
    .trim();

/** "Filtro de Óleo" -> "Filtro_de_Oleo_2026-11-02.pdf" */
export const buildPdfFileName = (title: string): string => {
  const base = (title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${base || 'Lista'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
};

/** Desenha o cabeçalho (logo + nome da empresa) uma vez por página. */
const createHeaderDrawer = (doc: jsPDF, header: PdfHeaderData) => {
  const drawnPages = new Set<number>();
  return () => {
    const page = doc.getCurrentPageInfo().pageNumber;
    if (drawnPages.has(page)) return;
    drawnPages.add(page);
    drawPdfHeader(doc, header);
  };
};

const drawPdfHeader = (doc: jsPDF, { logo, companyName }: PdfHeaderData) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const right = pageWidth - PAGE_MARGIN_X;

  if (logo) {
    const height = 12;
    const width = Math.min(60, (height * logo.width) / logo.height);
    try {
      doc.addImage(logo.dataUrl, 'PNG', PAGE_MARGIN_X, 8, width, height, 'company-logo');
    } catch (error) {
      console.warn('Não foi possível adicionar o logo ao PDF:', error);
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(pdfSafeText(companyName), right, 16, { align: 'right' });

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN_X, 23, right, 23);

  doc.setTextColor(0, 0, 0);
};

/** Ícone (9mm) + título (16pt). Devolve o Y abaixo do título. */
const drawListTitle = (doc: jsPDF, y: number, { title, iconPng }: { title: string; iconPng: string | null }) => {
  const iconSize = 9;
  const pageWidth = doc.internal.pageSize.getWidth();
  let textX = PAGE_MARGIN_X;
  if (iconPng) {
    doc.addImage(iconPng, 'PNG', PAGE_MARGIN_X, y, iconSize, iconSize, imageAlias(iconPng));
    textX += iconSize + 3;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(pdfSafeText(title) || 'Lista', pageWidth - PAGE_MARGIN_X - textX);
  doc.text(lines, textX, y + 6.3);
  doc.setFont('helvetica', 'normal');
  const textHeight = 6.3 + (lines.length - 1) * 6.5;
  return y + Math.max(iconSize, textHeight) + 5;
};

const COVER_TOP = 26;
const COVER_HEIGHT = 40;
const COVER_ICON_SIZE = 16;

/** Com capa: faixa de largura total + ícone sobreposto à borda de baixo + título. Sem capa: layout normal. */
const drawListCoverAndTitle = (
  doc: jsPDF,
  { title, iconPng, coverJpg }: { title: string; iconPng: string | null; coverJpg: string | null },
) => {
  if (!coverJpg) return drawListTitle(doc, CONTENT_TOP, { title, iconPng });
  const pageWidth = doc.internal.pageSize.getWidth();
  try {
    doc.addImage(coverJpg, 'JPEG', 0, COVER_TOP, pageWidth, COVER_HEIGHT, 'list-cover');
  } catch (error) {
    console.warn('Não foi possível adicionar a capa ao PDF:', error);
    return drawListTitle(doc, CONTENT_TOP, { title, iconPng });
  }
  const coverBottom = COVER_TOP + COVER_HEIGHT;
  if (iconPng) {
    doc.addImage(iconPng, 'PNG', PAGE_MARGIN_X, coverBottom - COVER_ICON_SIZE / 2, COVER_ICON_SIZE, COVER_ICON_SIZE, imageAlias(iconPng));
  }
  return drawListTitle(doc, coverBottom + (iconPng ? COVER_ICON_SIZE / 2 + 2 : 4), { title, iconPng: null });
};

/** Se não couber `needed` mm na página, cria uma nova (com cabeçalho) e devolve o novo Y. */
const ensureSpace = (doc: jsPDF, y: number, needed: number, drawHeader: () => void) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed <= pageHeight - PAGE_BOTTOM_MARGIN) return y;
  doc.addPage();
  drawHeader();
  return CONTENT_TOP;
};

/** Alias estável por imagem: o mesmo ícone vira um único objeto de imagem no PDF. */
const imageAliases = new Map<string, string>();
const imageAlias = (dataUrl: string) => {
  let alias = imageAliases.get(dataUrl);
  if (!alias) {
    alias = `list-icon-${imageAliases.size + 1}`;
    imageAliases.set(dataUrl, alias);
  }
  return alias;
};

const loadHeader = async (opts: ListPdfOptions): Promise<PdfHeaderData> => ({
  logo: opts.logoUrl ? await loadImageAsDataUrl(opts.logoUrl) : null,
  companyName: opts.companyName,
});

const tableBaseOptions = (drawHeader: () => void) => ({
  theme: 'plain',
  showHead: 'everyPage',
  headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
  margin: { top: CONTENT_TOP, left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, bottom: PAGE_BOTTOM_MARGIN },
  didDrawPage: drawHeader,
});

export const generatePartsListPdf = async (listItems: SimplePartItem[], opts: ListPdfOptions): Promise<void> => {
  const doc = new jsPDF();
  const [header, iconPng, coverJpg] = await Promise.all([
    loadHeader(opts),
    renderListIconToPng(opts.listIcon ?? null, opts.title, opts.cover ? 192 : 96),
    renderCoverToPng(opts.cover),
  ]);
  const drawHeader = createHeaderDrawer(doc, header);
  drawHeader();

  const currentY = drawListCoverAndTitle(doc, { title: opts.title, iconPng, coverJpg });

  const tableColumn = ["Cód. Peça", "Nome", "Quantidade", "Descrição", "AF"];
  const tableRows: (string | number | undefined)[][] = [];

  for (const item of listItems) {
    const part = await localDb.parts.where('codigo').equals(item.codigo_peca || '').first();
    tableRows.push([
      item.codigo_peca || 'N/A',
      part?.name || 'N/A',
      item.quantidade ?? 'N/A',
      item.descricao || 'N/A',
      item.af || '',
    ]);
  }

  (doc as any).autoTable({
    ...tableBaseOptions(drawHeader),
    head: [tableColumn],
    body: tableRows,
    startY: currentY,
    styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak', lineWidth: 0 },
    alternateRowStyles: { fillColor: [240, 240, 240] },
  });

  doc.save(buildPdfFileName(opts.title));
};

export const generateCustomListPdf = async (listItems: CustomListItem[], opts: ListPdfOptions): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait' });
  const listIcon = opts.listIcon ?? null;

  // Ícone efetivo de cada subtítulo (próprio -> da lista -> automático), igual ao app.
  const subtitleIconArgs = (item: CustomListItem) =>
    item.icon ? { icon: item.icon, name: item.item_name } : { icon: listIcon, name: opts.title };

  const subtitleItems = listItems.filter(item => item.type === 'subtitle');
  const [header, titleIconPng, coverJpg, subtitleIconPngs] = await Promise.all([
    loadHeader(opts),
    renderListIconToPng(listIcon, opts.title, opts.cover ? 192 : 96),
    renderCoverToPng(opts.cover),
    Promise.all(subtitleItems.map(item => {
      const { icon, name } = subtitleIconArgs(item);
      return renderListIconToPng(icon, name);
    })),
  ]);
  const subtitleIcons = new Map(subtitleItems.map((item, i) => [item.id, subtitleIconPngs[i]]));

  const drawHeader = createHeaderDrawer(doc, header);
  drawHeader();

  let currentY = drawListCoverAndTitle(doc, { title: opts.title, iconPng: titleIconPng, coverJpg });

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
        ...tableBaseOptions(drawHeader),
        head: head,
        body: currentGroupRows,
        startY: currentY,
        styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak', lineWidth: 0 },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: columnStyles,
      });
      currentY = (doc as any).lastAutoTable.finalY;
    }

    currentGroupRows = [];
    currentGroupType = null;
  };

  const pageWidth = doc.internal.pageSize.getWidth();

  listItems.forEach(item => {
    if (item.type === 'separator') {
      renderGroup();
      currentY = ensureSpace(doc, currentY + 2, 8, drawHeader);
      doc.setDrawColor(200);
      doc.line(PAGE_MARGIN_X, currentY, pageWidth - PAGE_MARGIN_X, currentY);
      currentY += 4;
      return;
    }

    if (item.type === 'subtitle') {
      renderGroup();
      // Manter junto: o subtítulo só fica na página se couber também o começo da tabela.
      currentY = ensureSpace(doc, currentY + 4, 20, drawHeader);
      const iconSize = 5;
      const iconPng = subtitleIcons.get(item.id) ?? null;
      let textX = PAGE_MARGIN_X;
      if (iconPng) {
        doc.addImage(iconPng, 'PNG', PAGE_MARGIN_X, currentY, iconSize, iconSize, imageAlias(iconPng));
        textX += iconSize + 2;
      }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(pdfSafeText(item.item_name), textX, currentY + 4);
      doc.setFont('helvetica', 'normal');
      currentY += iconSize + 3;
      return;
    }

    if (item.type !== currentGroupType && currentGroupType !== null) {
      renderGroup();
    }
    currentGroupType = item.type;

    if (item.type === 'mangueira' && item.mangueira_data) {
      const data = item.mangueira_data;
      const createContent = (partData: MangueiraPartDetails) => {
        let content = '';
        if (partData.codigo) {
          content += `Cód.: ${partData.codigo}\n`;
        }
        if (partData.name) {
          content += `${partData.name}\n`;
        }
        if (partData.description) {
          content += `${partData.description}`;
        }
        return content.trim();
      };

      currentGroupRows.push([
        { content: '1', styles: { halign: 'center' } },
        createContent(data.mangueira),
        { content: `${data.corte_cm} cm`, styles: { halign: 'center' } },
        createContent(data.conexao1),
        createContent(data.conexao2),
      ]);
    } else if (item.type === 'item') {
      let descriptionContent = '';
      if (item.item_name) {
        descriptionContent += item.item_name;
      }
      if (item.description) {
        descriptionContent += `\n${item.description}`;
      }

      currentGroupRows.push([
        { content: item.quantity, styles: { halign: 'center' } },
        item.part_code ? `Cód.: ${item.part_code}` : '',
        descriptionContent.trim(),
      ]);
    }
  });

  renderGroup(); // Render the last group

  doc.save(buildPdfFileName(opts.title));
};

// ATUALIZADO: generateServiceOrderPdf agora aceita ServiceOrderGroup[]
export const generateServiceOrderPdf = (groupedServiceOrders: any[], title: string = 'Ordens de Serviço'): void => {
  const doc = new jsPDF();

  const pdfCalculateDuration = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return endMinutes - startMinutes;
  };

  const pdfFormatDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    return `${hStr}:${mStr}`;
  };

  // 1. Calcular totais para o Resumo do Período
  let osMinutes = 0;
  let percursoMinutes = 0;
  let waitingMinutes = 0;

  const dateUserGroups = new Map<string, { date: Date; shift: any; items: any[] }>();

  groupedServiceOrders.forEach(os => {
    if (os.hora_inicio && os.hora_final) {
      const duration = pdfCalculateDuration(os.hora_inicio, os.hora_final);
      if (os.is_percurso) {
        percursoMinutes += duration;
      } else {
        osMinutes += duration;
      }
    }

    const itemDate = os.createdAt
      ? (os.createdAt instanceof Date ? os.createdAt : parseISO(os.createdAt))
      : (os.recordDate ? parseISO(os.recordDate) : new Date());
    
    const key = `${os.user_id || os.userDisplayName || 'user'}_${format(itemDate, 'yyyy-MM-dd')}`;

    if (!dateUserGroups.has(key)) {
      dateUserGroups.set(key, {
        date: itemDate,
        shift: os.shift_code || os.shift || os.shiftName,
        items: [os]
      });
    } else {
      dateUserGroups.get(key)!.items.push(os);
    }
  });

  dateUserGroups.forEach(group => {
    const breakdown = calculateDailyTimesAndGaps(group.items, group.date, group.shift);
    waitingMinutes += breakdown.waitingMinutes;
  });

  const totalMinutes = osMinutes + percursoMinutes + waitingMinutes;

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // 2. Renderizar tabela do Resumo do Período
  (doc as any).autoTable({
    head: [["Resumo do Período", "Tempo"]],
    body: [
      ["Horas em OS", pdfFormatDuration(osMinutes)],
      ["Horas de Percurso", pdfFormatDuration(percursoMinutes)],
      ["Aguardando Serviço", pdfFormatDuration(waitingMinutes)],
      ["Total Geral", pdfFormatDuration(totalMinutes)]
    ],
    startY: 28,
    theme: 'striped',
    margin: { left: 14 },
    styles: { fontSize: 9, cellPadding: 2, lineWidth: 0.5, strokeColor: [220, 220, 220] },
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.index === 2) {
        data.cell.styles.textColor = [22, 163, 74];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 10;

  const tableColumn = ["Detalhes da OS", "Peça", "Qtd."];
  const tableRows: any[] = [];

  groupedServiceOrders.forEach(group => {
    const isPercurso = !!group.is_percurso;
    
    // Create the content for the first column
    let detailsContent = isPercurso
      ? `[PERCURSO]\n${group.af ? `AF: ${group.af}` : 'Sem AF'}`
      : `AF: ${group.af}`;
    if (!isPercurso && group.os) detailsContent += ` (OS: ${group.os})`;
    if (!isPercurso && group.agregado && group.numero_agregado) {
      detailsContent += `\nAgregado: ${group.numero_agregado}`;
    }
    if (group.hora_inicio || group.hora_final) {
      detailsContent += `
Horário: ${group.hora_inicio || '??'} - ${group.hora_final || '??'}`;
    }
    if (isPercurso) {
      detailsContent += `
Tempo de Deslocamento`;
    } else if (group.servico_executado) {
      detailsContent += `
Serviço: ${group.servico_executado}`;
    }

    const partsToRender = isPercurso
      ? [{ id: 'percurso', codigo_peca: 'Percurso (Tempo de Deslocamento)', descricao: '', quantidade: '' }]
      : (group.parts.length > 0 ? group.parts : [{ id: 'no-parts', codigo_peca: 'Nenhuma peça adicionada', descricao: '', quantidade: '' }]);
    
    partsToRender.forEach((part: any, index: number) => {
      const partDescription = isPercurso
        ? 'Percurso (Tempo de Deslocamento)'
        : (part.codigo_peca && part.descricao
          ? `${part.codigo_peca} - ${part.descricao}`
          : part.codigo_peca || part.descricao || 'N/A');

      const rowFillColor = isPercurso ? [254, 242, 242] : undefined;
      const rowTextColor = isPercurso ? [220, 38, 38] : undefined;
      const cellStyles: any = {};
      if (rowFillColor) cellStyles.fillColor = rowFillColor;
      if (rowTextColor) {
        cellStyles.textColor = rowTextColor;
        cellStyles.fontStyle = 'bold';
      }

      if (index === 0) {
        tableRows.push([
          { content: detailsContent, rowSpan: partsToRender.length, styles: { valign: 'top', ...cellStyles } },
          { content: partDescription, styles: cellStyles },
          { content: part.quantidade ?? '', styles: { halign: 'center', ...cellStyles } },
        ]);
      } else {
        tableRows.push([
          { content: partDescription, styles: cellStyles },
          { content: part.quantidade ?? '', styles: { halign: 'center', ...cellStyles } },
        ]);
      }
    });
  });

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: nextY,
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
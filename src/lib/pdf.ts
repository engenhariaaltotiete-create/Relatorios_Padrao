import { jsPDF } from 'jspdf';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import UTIF from 'utif';
import type { Report, StoredFile } from '../types';
import { dataUrlToUint8, fileNameBase, moneyBR, numberBR } from './helpers';
import logoUrl from '../assets/sabesp-logo.jpg';

/*
  GERADOR DE PDF — V14
  --------------------
  Esta versão mantém a geração direta de PDF (mais confiável no celular),
  mas reorganiza o visual para reproduzir o padrão da versão 8:

  - logo à esquerda;
  - título centralizado em uma linha;
  - subtítulo centralizado com Município | Endereço | Tipo de Serviço | Água/Esgoto;
  - linha azul/ciano abaixo do cabeçalho;
  - barras azuis arredondadas para os blocos;
  - tabelas com cabeçalhos claros e texto azul;
  - evidências iniciando em nova página;
  - fotos em grade 2 x 2 (até 4 por página, quando houver espaço);
  - anexos ao final;
  - rodapé azul em todas as páginas;
  - mantém múltiplos serviços por evidência, preços, subtotais e total geral.
*/

const BLUE = [7, 143, 190] as const;          // azul das barras
const CYAN = [17, 166, 204] as const;         // azul/ciano das linhas
const TEXT_BLUE = [7, 133, 177] as const;     // azul dos títulos de tabela
const DARK = [47, 59, 68] as const;           // texto principal
const LIGHT = [240, 244, 246] as const;       // fundo de células
const BORDER = [200, 208, 214] as const;      // bordas
const SUBTOTAL_BG = [231, 243, 248] as const; // fundo subtotal
const NAVY = [18, 65, 91] as const;         // azul-marinho da tabela resumo

const PAGE_W = 210;
const PAGE_H = 297;
const M = 10;
const HEADER_BOTTOM = 35;
const CONTENT_BOTTOM = 264;

let cachedLogo: string | null = null;

async function getLogoDataUrl() {
  if (cachedLogo) return cachedLogo;
  const blob = await fetch(logoUrl).then((r) => r.blob());
  cachedLogo = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
  return cachedLogo;
}

function formatDateTimeNow() {
  return new Date().toLocaleString('pt-BR');
}

function addBaseHeader(doc: jsPDF, report: Report, logo: string, pageSubtitle = '') {
  /*
    Cabeçalho baseado na versão 8.
    O conteúdo do relatório começa abaixo da linha ciano.
  */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(65, 75, 82);
  doc.text(formatDateTimeNow(), M, 7.2);

  // Identificação de desenvolvimento no canto superior direito.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.setTextColor(...BLUE);
  doc.text('Desenvolvido pelo Polo de Manutenção Suzano - OLMS', PAGE_W - M, 7.2, { align: 'right' });
  doc.text('Eng° Eder Nunes', PAGE_W - M, 10.4, { align: 'right' });

  // Logo Sabesp à esquerda.
  doc.addImage(logo, 'JPEG', 11, 10, 18, 18, undefined, 'FAST');

  // Título principal em uma única linha.
  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.2);
  doc.text('RELATÓRIO DE SERVIÇOS NÃO VINCULADOS A OS', PAGE_W / 2, 17.2, { align: 'center' });

  // Valores da obra abaixo do título, sem nomes de campos.
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  const subtitle = [report.obra.municipio, report.obra.endereco, report.obra.tipoObra, report.obra.aguaEsgoto]
    .filter(Boolean)
    .join('  |  ');
  const subtitleLines = doc.splitTextToSize(subtitle, 166) as string[];
  doc.text(subtitleLines.slice(0, 2), PAGE_W / 2, 24.4, { align: 'center' });

  // Linha que fecha o cabeçalho.
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.8);
  doc.line(M, 32, PAGE_W - M, 32);
}

function section(doc: jsPDF, title: string, y: number, rightText = '') {
  // Barra azul arredondada igual ao padrão visual da versão 8.
  doc.setFillColor(...BLUE);
  doc.roundedRect(M, y, PAGE_W - M * 2, 7.2, 1.6, 1.6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.7);
  doc.text(title, M + 2.3, y + 4.9);
  if (rightText) doc.text(rightText, PAGE_W - M - 2.3, y + 4.9, { align: 'right' });
  doc.setTextColor(...DARK);
  return y + 9;
}

function wrap(doc: jsPDF, text: unknown, width: number) {
  return doc.splitTextToSize(String(text ?? ''), width) as string[];
}

function infoTable(doc: jsPDF, rows: Array<[string, string]>, y: number) {
  doc.setLineWidth(0.1);
  /*
    A tabela de informações possui três colunas:
    número do item | nome do campo | valor.
    Esse é o mesmo princípio visual usado pela versão 8.
  */
  const x = M;
  const widths = [8, 68, PAGE_W - (2 * M) - 76];

  rows.forEach(([label, value], index) => {
    const valueLines = wrap(doc, value || '-', widths[2] - 4);
    const rowH = Math.max(7, valueLines.length * 3.8 + 3);

    doc.setDrawColor(...BORDER);

    // Número
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, widths[0], rowH, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(String(index + 1), x + widths[0] / 2, y + 4.7, { align: 'center' });

    // Nome do campo
    doc.setFillColor(...LIGHT);
    doc.rect(x + widths[0], y, widths[1], rowH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_BLUE);
    doc.text(label, x + widths[0] + 2, y + 4.7, { maxWidth: widths[1] - 4 });

    // Valor
    doc.setFillColor(255, 255, 255);
    doc.rect(x + widths[0] + widths[1], y, widths[2], rowH, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(valueLines, x + widths[0] + widths[1] + 2, y + 4.7, { maxWidth: widths[2] - 4 });

    y += rowH;
  });

  return y + 3;
}

function ensurePage(
  doc: jsPDF,
  report: Report,
  logo: string,
  y: number,
  needed = 15,
  pageSubtitle = 'Relatório de Serviços Não Vinculados',
) {
  if (y + needed <= CONTENT_BOTTOM) return y;
  doc.addPage();
  addBaseHeader(doc, report, logo, pageSubtitle);
  return HEADER_BOTTOM;
}

type SummaryRow = {
  item?: string;
  os?: string;
  tipo?: string;
  preco?: string;
  unid?: string;
  qtde?: number;
  unit?: number;
  total?: number;
  subtotal?: boolean;
  grand?: boolean;
};

function buildSummaryRows(report: Report): SummaryRow[] {
  const grouped = new Map<string, SummaryRow[]>();
  let item = 1;

  report.evidencias.forEach((ev) => {
    ev.servicos.forEach((s) => {
      if (!s.tipo) return;
      const row: SummaryRow = {
        item: String(item++),
        os: ev.os,
        tipo: s.tipo,
        preco: String(s.preco || ''),
        unid: s.unid,
        qtde: Number(s.qtde) || 0,
        unit: Number(s.precoUnit) || 0,
        total: (Number(s.qtde) || 0) * (Number(s.precoUnit) || 0),
      };
      const list = grouped.get(s.tipo) || [];
      list.push(row);
      grouped.set(s.tipo, list);
    });
  });

  const rows: SummaryRow[] = [];
  let grand = 0;

  // Ordena alfabeticamente por Tipo de Serviço, mantendo o subtotal logo abaixo.
  [...grouped.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach((tipo) => {
    const group = grouped.get(tipo) || [];
    group.forEach((r) => {
      rows.push(r);
      grand += r.total || 0;
    });
    rows.push({
      tipo,
      unid: group[0]?.unid || '',
      qtde: group.reduce((a, r) => a + (r.qtde || 0), 0),
      total: group.reduce((a, r) => a + (r.total || 0), 0),
      subtotal: true,
    });
  });

  rows.push({ total: grand, grand: true });
  return rows;
}

function drawSummary(report: Report, doc: jsPDF, logo: string, startY: number) {
  doc.setLineWidth(0.1);
  const rows = buildSummaryRows(report);
  const widths = [8, 20, 55, 22, 13, 16, 27, 29];
  const headers = ['Item', 'Nº OS', 'Tipo de Serviço', 'Nº do Preço', 'Unid.', 'Qtde.', 'Preço Unit.', 'Total'];
  let y = startY;

  const drawHeader = () => {
    y = ensurePage(doc, report, logo, y, 10, 'Relatório de Serviços Não Vinculados');
    let x = M;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    headers.forEach((h, i) => {
      // Cabeçalho: fundo azul-marinho, texto branco, negrito e centralizado.
      doc.setFillColor(...NAVY);
      doc.setDrawColor(...BORDER);
      doc.rect(x, y, widths[i], 7.5, 'FD');
      doc.setTextColor(255, 255, 255);
      doc.text(h, x + widths[i] / 2, y + 4.9, {
        align: 'center',
        maxWidth: widths[i] - 2,
      });
      x += widths[i];
    });
    doc.setTextColor(...DARK);
    y += 7.5;
  };

  drawHeader();

  rows.forEach((r) => {
    const normalValues = [
      r.item || '', r.os || '', r.tipo || '', r.preco || '', r.unid || '', numberBR(r.qtde || 0),
      moneyBR(r.unit || 0), moneyBR(r.total || 0),
    ];

    // Calcula a altura necessária antes de desenhar a linha.
    let rowH = 7;
    if (!r.subtotal && !r.grand) {
      const lines = normalValues.map((v, i) => wrap(doc, v, widths[i] - 2.4));
      rowH = Math.max(7, Math.max(...lines.map((l) => l.length)) * 3.7 + 2.5);
    }

    const oldY = y;
    y = ensurePage(doc, report, logo, y, rowH + 2, 'Relatório de Serviços Não Vinculados');
    if (y !== oldY && y === HEADER_BOTTOM) {
      y = section(doc, 'Resumo dos serviços não vinculados - continuação', y);
      drawHeader();
    }

    if (r.grand) {
      // TOTAL GERAL: mescla Item até Preço Unit.; somente Total fica separado.
      const mergedW = widths.slice(0, 7).reduce((a, b) => a + b, 0);
      doc.setFillColor(...NAVY);
      doc.setDrawColor(...BORDER);
      doc.rect(M, y, mergedW, 7.5, 'FD');
      doc.rect(M + mergedW, y, widths[7], 7.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL GERAL', M + 2, y + 4.9);
      doc.text(moneyBR(r.total || 0), M + mergedW + widths[7] - 1.2, y + 4.9, { align: 'right' });
      y += 7.5;
      return;
    }

    if (r.subtotal) {
      // SUBTOTAL: mescla Item + Nº OS + Tipo de Serviço + Nº do Preço.
      const mergedW = widths[0] + widths[1] + widths[2] + widths[3];
      const subtotalValues = [r.unid || '', numberBR(r.qtde || 0), '', moneyBR(r.total || 0)];
      const remainingWidths = widths.slice(4);

      doc.setFillColor(...SUBTOTAL_BG);
      doc.setDrawColor(...BORDER);
      doc.rect(M, y, mergedW, 7.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(7, 95, 128);
      doc.text(`SUBTOTAL — ${r.tipo || ''}`, M + 2, y + 4.9, { maxWidth: mergedW - 4 });

      let x = M + mergedW;
      subtotalValues.forEach((value, i) => {
        doc.setFillColor(...SUBTOTAL_BG);
        doc.rect(x, y, remainingWidths[i], 7.5, 'FD');
        const right = i === 1 || i === 2 || i === 3;
        doc.text(String(value), right ? x + remainingWidths[i] - 1.2 : x + 1.2, y + 4.9, {
          align: right ? 'right' : 'left',
          maxWidth: remainingWidths[i] - 2.4,
        });
        x += remainingWidths[i];
      });
      y += 7.5;
      return;
    }

    const lines = normalValues.map((v, i) => wrap(doc, v, widths[i] - 2.4));
    let x = M;
    normalValues.forEach((_v, i) => {
      doc.setDrawColor(...BORDER);
      doc.setFillColor(255, 255, 255);
      doc.rect(x, y, widths[i], rowH, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.9);
      doc.setTextColor(...DARK);
      const align = i >= 5 ? 'right' : (i === 0 ? 'center' : 'left');
      const tx = align === 'right' ? x + widths[i] - 1.2 : align === 'center' ? x + widths[i] / 2 : x + 1.2;
      doc.text(lines[i], tx, y + 4.2, { align, maxWidth: widths[i] - 2.4 });
      x += widths[i];
    });
    y += rowH;
  });

  return y + 3;
}

function getImageFormat(dataUrl: string): 'JPEG' | 'PNG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

function imageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function addImageFit(doc: jsPDF, dataUrl: string, x: number, y: number, w: number, h: number) {
  const size = await imageDimensions(dataUrl);
  const scale = Math.min(w / size.width, h / size.height);
  const dw = size.width * scale;
  const dh = size.height * scale;
  doc.addImage(
    dataUrl,
    getImageFormat(dataUrl),
    x + (w - dw) / 2,
    y + (h - dh) / 2,
    dw,
    dh,
    undefined,
    'FAST',
  );
}

async function tiffToDataUrls(file: StoredFile): Promise<string[]> {
  const bytes = dataUrlToUint8(file.data);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const ifds = UTIF.decode(buffer);
  const images: string[] = [];

  for (const ifd of ifds) {
    UTIF.decodeImage(buffer, ifd);
    const rgba = UTIF.toRGBA8(ifd);
    const canvas = document.createElement('canvas');
    canvas.width = ifd.width;
    canvas.height = ifd.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), ifd.width, ifd.height), 0, 0);
    images.push(canvas.toDataURL('image/jpeg', 0.92));
  }

  return images;
}

function drawServiceTableHeader(doc: jsPDF, y: number) {
  doc.setLineWidth(0.1);
  const widths = [70, 25, 16, 18, 30, 31];
  const headers = ['Tipo de Serviço', 'Nº Preço', 'Unid.', 'Qtde.', 'Preço Unit.', 'Total'];
  let x = M;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.9);
  headers.forEach((h, i) => {
    doc.setFillColor(237, 242, 245);
    doc.setDrawColor(...BORDER);
    doc.rect(x, y, widths[i], 7, 'FD');
    doc.setTextColor(...TEXT_BLUE);
    doc.text(h, x + 1.2, y + 4.6, { maxWidth: widths[i] - 2.4 });
    x += widths[i];
  });
  return { y: y + 7, widths };
}

function drawEvidenceServiceRows(doc: jsPDF, report: Report, logo: string, y: number, evIndex: number) {
  doc.setLineWidth(0.1);
  const ev = report.evidencias[evIndex];
  let header = drawServiceTableHeader(doc, y);
  y = header.y;
  const widths = header.widths;

  for (const s of ev.servicos) {
    const values = [
      s.tipo,
      s.preco,
      s.unid,
      numberBR(s.qtde),
      moneyBR(s.precoUnit),
      moneyBR((Number(s.qtde) || 0) * (Number(s.precoUnit) || 0)),
    ];
    const lines = values.map((v, i) => wrap(doc, v, widths[i] - 2.4));
    const rowH = Math.max(7, Math.max(...lines.map((l) => l.length)) * 3.7 + 2.5);

    const oldY = y;
    y = ensurePage(doc, report, logo, y, rowH + 2, 'Evidências de Execução');
    if (y !== oldY && y === HEADER_BOTTOM) {
      y = section(doc, `Evidência ${String(evIndex + 1).padStart(2, '0')} - continuação`, y);
      y = infoTable(doc, [['Número de OS relacionada', ev.os]], y);
      header = drawServiceTableHeader(doc, y);
      y = header.y;
    }

    let x = M;
    values.forEach((_v, i) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...BORDER);
      doc.rect(x, y, widths[i], rowH, 'FD');
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      const align = i >= 3 ? 'right' : 'left';
      const tx = align === 'right' ? x + widths[i] - 1.2 : x + 1.2;
      doc.text(lines[i], tx, y + 4.2, { align, maxWidth: widths[i] - 2.4 });
      x += widths[i];
    });
    y += rowH;
  }

  return y;
}

async function drawPhotoCard(
  doc: jsPDF,
  photo: StoredFile,
  x: number,
  y: number,
  w: number,
  imageH: number,
) {
  doc.setDrawColor(207, 215, 221);
  doc.roundedRect(x, y, w, imageH, 1.5, 1.5);
  await addImageFit(doc, photo.data, x + 1, y + 1, w - 2, imageH - 2);

  let descH = 0;
  if (photo.descricao) {
    doc.setFontSize(7.1);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text('Descrição:', x + 0.5, y + imageH + 4.3);
    const labelW = doc.getTextWidth('Descrição: ') + 1;
    doc.setFont('helvetica', 'normal');
    const lines = wrap(doc, photo.descricao, w - labelW - 1.5);
    doc.text(lines, x + labelW, y + imageH + 4.3, { maxWidth: w - labelW - 1.5 });
    descH = Math.max(6, lines.length * 3.7 + 2);
  }
  return imageH + descH;
}

async function addEvidencePages(doc: jsPDF, report: Report, logo: string) {
  /*
    Cada evidência começa em nova página.
    Depois dos dados/serviços, as fotos são distribuídas em duas colunas.
    Quando há espaço, entram quatro fotos na mesma página (2 x 2).
  */
  for (let ei = 0; ei < report.evidencias.length; ei += 1) {
    const ev = report.evidencias[ei];

    doc.addPage();
    addBaseHeader(doc, report, logo, 'Evidências de Execução');

    let y = section(doc, `Evidência ${String(ei + 1).padStart(2, '0')}`, HEADER_BOTTOM, `${ev.fotos.length} foto(s)`);
    y = infoTable(doc, [['Número de OS relacionada', ev.os]], y);
    y = drawEvidenceServiceRows(doc, report, logo, y, ei);

    if (ev.observacao) {
      y += 2;
      y = ensurePage(doc, report, logo, y, 13, 'Evidências de Execução');
      y = infoTable(doc, [['Observação', ev.observacao]], y);
    }

    // Altura semelhante ao quadro da versão 8.
    const photoW = 92;
    const imageH = 62;
    const colGap = 6;
    const rowGap = 7;

    // Espaço visual entre os registros da evidência e a primeira linha de fotos.
    y += 5;

    let photoIndex = 0;
    while (photoIndex < ev.fotos.length) {
      // Caso não haja espaço para uma linha de fotos, inicia continuação.
      if (y + imageH + 12 > CONTENT_BOTTOM) {
        doc.addPage();
        addBaseHeader(doc, report, logo, 'Evidências de Execução');
        y = section(doc, `Evidência ${String(ei + 1).padStart(2, '0')} - continuação`, HEADER_BOTTOM, `${ev.fotos.length} foto(s)`);
      }

      const pair = ev.fotos.slice(photoIndex, photoIndex + 2);
      let rowHeight = imageH;

      for (let p = 0; p < pair.length; p += 1) {
        const x = M + p * (photoW + colGap);
        const used = await drawPhotoCard(doc, pair[p], x, y, photoW, imageH);
        rowHeight = Math.max(rowHeight, used);
      }

      y += rowHeight + rowGap;
      photoIndex += pair.length;
    }
  }
}

async function addImageAttachments(doc: jsPDF, report: Report, logo: string) {
  for (let i = 0; i < report.anexos.length; i += 1) {
    const a = report.anexos[i];
    const isPdf = /pdf/i.test(a.type) || /\.pdf$/i.test(a.name);
    if (isPdf) continue; // PDFs serão incorporados na etapa de mesclagem.

    const isTiff = /tiff?/i.test(a.type) || /\.tiff?$/i.test(a.name);
    const pages = isTiff ? await tiffToDataUrls(a) : [a.data];

    for (let p = 0; p < pages.length; p += 1) {
      doc.addPage();
      addBaseHeader(doc, report, logo, 'Anexos');
      let y = section(
        doc,
        `Anexo ${String(i + 1).padStart(2, '0')}${pages.length > 1 ? ` - Página ${p + 1} de ${pages.length}` : ''}`,
        HEADER_BOTTOM,
      );

      if (p === 0 && a.descricao) {
        doc.setFontSize(7.8);
        doc.setTextColor(...DARK);
        doc.setFont('helvetica', 'bold');
        doc.text('Descrição:', M, y + 3.8);
        const labelW = doc.getTextWidth('Descrição: ') + 1;
        doc.setFont('helvetica', 'normal');
        const lines = wrap(doc, a.descricao, PAGE_W - 2 * M - labelW);
        doc.text(lines, M + labelW, y + 3.8);
        y += Math.max(7, lines.length * 3.8 + 3);
      }

      const boxH = CONTENT_BOTTOM - y - 2;
      doc.setDrawColor(207, 215, 221);
      doc.roundedRect(M, y, PAGE_W - 2 * M, boxH, 1.5, 1.5);
      await addImageFit(doc, pages[p], M + 2, y + 2, PAGE_W - 2 * M - 4, boxH - 4);
    }
  }
}

async function buildBasePdf(report: Report) {
  const logo = await getLogoDataUrl();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

  addBaseHeader(doc, report, logo, 'Relatório de Serviços Não Vinculados');

  // Primeira página segue a mesma sequência da versão 8.
  let y = section(doc, 'Identificação do responsável pela elaboração do relatório', HEADER_BOTTOM);
  y = infoTable(doc, [
    ['Elaborado por', report.responsavel.elaboradoPor],
    ['Data', report.responsavel.data ? new Date(`${report.responsavel.data}T12:00:00`).toLocaleDateString('pt-BR') : ''],
    ['Cargo/Função', report.responsavel.cargo],
    ['Empresa', report.responsavel.empresa],
  ], y);

  y = section(doc, 'Dados da Obra', y);
  y = infoTable(doc, [
    ['Município', report.obra.municipio],
    ['Endereço', report.obra.endereco],
    ['Tipo de Serviço', report.obra.tipoObra],
    ['Água/Esgoto', report.obra.aguaEsgoto],
  ], y);

  y = section(doc, 'Resumo dos serviços não vinculados', y);
  drawSummary(report, doc, logo, y);

  // Evidências começam obrigatoriamente em nova página.
  await addEvidencePages(doc, report, logo);

  // Imagens e TIFFs são incorporados visualmente ao final.
  await addImageAttachments(doc, report, logo);

  return doc.output('arraybuffer');
}

async function mergePdfAttachments(baseBytes: ArrayBuffer, report: Report) {
  /*
    Anexos PDF são embutidos visualmente dentro de páginas A4 do próprio relatório.
    Em vez de simplesmente anexar a página original, criamos uma nova página do relatório,
    desenhamos o cabeçalho/título do anexo e encaixamos a página do PDF dentro da moldura.
  */
  const out = await PDFDocument.load(baseBytes);
  const font = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(NAVY[0] / 255, NAVY[1] / 255, NAVY[2] / 255);
  const cyan = rgb(CYAN[0] / 255, CYAN[1] / 255, CYAN[2] / 255);
  const dark = rgb(DARK[0] / 255, DARK[1] / 255, DARK[2] / 255);

  const mm = 72 / 25.4;
  const A4_W = 210 * mm;
  const A4_H = 297 * mm;
  const margin = 10 * mm;
  const boxTop = A4_H - 46 * mm;
  const boxBottom = 45 * mm;
  const boxW = A4_W - 2 * margin;
  const boxH = boxTop - boxBottom;

  for (let ai = 0; ai < report.anexos.length; ai += 1) {
    const a = report.anexos[ai];
    const isPdf = /pdf/i.test(a.type) || /\.pdf$/i.test(a.name);
    if (!isPdf || !a.data) continue;

    try {
      const extBytes = dataUrlToUint8(a.data);
      const ext = await PDFDocument.load(extBytes);
      const embeddedPages = await out.embedPdf(extBytes, ext.getPageIndices());

      embeddedPages.forEach((embedded, pi) => {
        const page = out.addPage([A4_W, A4_H]);

        // Cabeçalho textual compatível com as demais páginas do relatório.
        page.drawText('RELATÓRIO DE SERVIÇOS NÃO VINCULADOS A OS', {
          x: A4_W / 2 - 118,
          y: A4_H - 49,
          size: 10.5,
          font: bold,
          color: cyan,
        });
        const subtitle = [report.obra.municipio, report.obra.endereco, report.obra.tipoObra, report.obra.aguaEsgoto]
          .filter(Boolean).join('  |  ');
        page.drawText(subtitle.slice(0, 105), {
          x: margin,
          y: A4_H - 66,
          size: 6.5,
          font: bold,
          color: dark,
        });
        page.drawLine({
          start: { x: margin, y: A4_H - 78 },
          end: { x: A4_W - margin, y: A4_H - 78 },
          thickness: 1.5,
          color: cyan,
        });

        // Barra do anexo.
        page.drawRectangle({
          x: margin,
          y: A4_H - 105,
          width: boxW,
          height: 20,
          color: rgb(BLUE[0] / 255, BLUE[1] / 255, BLUE[2] / 255),
        });
        const annexTitle = `Anexo ${String(ai + 1).padStart(2, '0')} - Página ${pi + 1} de ${embeddedPages.length}`;
        page.drawText(annexTitle, {
          x: margin + 7,
          y: A4_H - 99,
          size: 7.5,
          font: bold,
          color: rgb(1, 1, 1),
        });

        // Moldura e página do anexo embutida, preservando a proporção original.
        page.drawRectangle({
          x: margin,
          y: boxBottom,
          width: boxW,
          height: boxH,
          borderColor: rgb(BORDER[0] / 255, BORDER[1] / 255, BORDER[2] / 255),
          borderWidth: 0.8,
        });
        const scale = Math.min((boxW - 10) / embedded.width, (boxH - 10) / embedded.height);
        const dw = embedded.width * scale;
        const dh = embedded.height * scale;
        page.drawPage(embedded, {
          x: margin + (boxW - dw) / 2,
          y: boxBottom + (boxH - dh) / 2,
          width: dw,
          height: dh,
        });

        if (pi === 0 && a.descricao) {
          page.drawText(`Descrição: ${a.descricao}`.slice(0, 125), {
            x: margin,
            y: boxBottom - 12,
            size: 6.2,
            font,
            color: dark,
          });
        }
      });
    } catch (error) {
      // PDF protegido por senha ou corrompido não impede a geração dos demais itens.
      console.warn(`Não foi possível incorporar o anexo ${a.name}`, error);
    }
  }

  return out;
}

async function stampAllPages(pdf: PDFDocument) {
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const blue = rgb(CYAN[0] / 255, CYAN[1] / 255, CYAN[2] / 255);
  const pages = pdf.getPages();

  pages.forEach((page, i) => {
    const { width } = page.getSize();

    // Rodapé seguindo a cor da linha do cabeçalho.
    page.drawLine({
      start: { x: 28, y: 39 },
      end: { x: width - 28, y: 39 },
      thickness: 0.9,
      color: blue,
    });

    const footer = [
      'Companhia de Saneamento Básico do Estado de São Paulo - Sabesp',
      'Divisão de Manutenção e Serviços Operacionais Suzano - OLMS',
      'Rua Benjamin Constant 1980 - Centro | CEP 08674-179 | Suzano - SP',
      'www.sabesp.com.br',
    ];

    footer.forEach((line, idx) => {
      page.drawText(line, {
        x: 28,
        y: 30 - idx * 6.1,
        size: 5.2,
        font,
        color: blue,
      });
    });

    page.drawText(`${i + 1} de ${pages.length}`, {
      x: width - 58,
      y: 13,
      size: 6.2,
      font,
      color: blue,
    });
  });
}

export type GeneratedPdf = {
  blob: Blob;
  url: string;
  fileName: string;
};

export async function generatePdf(report: Report): Promise<GeneratedPdf> {
  const base = await buildBasePdf(report);
  const merged = await mergePdfAttachments(base, report);
  await stampAllPages(merged);

  const bytes = await merged.save({ useObjectStreams: true });

  // Conversão explícita para BlobPart mantém a compatibilidade com o TypeScript do projeto.
  const blob = new Blob(
    [bytes as unknown as BlobPart],
    { type: 'application/pdf' },
  );

  return {
    blob,
    url: URL.createObjectURL(blob),
    fileName: `${fileNameBase(report, new Date())}.pdf`,
  };
}

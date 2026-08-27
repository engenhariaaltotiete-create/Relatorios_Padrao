import { jsPDF } from 'jspdf';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import UTIF from 'utif';
import type { ReceiptReport, StoredFile } from '../types';
import { dataUrlToUint8, receiptFileNameBase } from './helpers';
import logoUrl from '../assets/sabesp-logo.jpg';

// GERADOR DO RELATÓRIO DE RECEBIMENTO DE OBRAS
// Mantém o mesmo padrão visual do Relatório de Serviços Não Vinculados.
const BLUE = [7, 143, 190] as const;
const CYAN = [17, 166, 204] as const;
const TEXT_BLUE = [7, 133, 177] as const;

const DARK = [47, 59, 68] as const;
const LIGHT = [240, 244, 246] as const;
const BORDER = [200, 208, 214] as const;
const NAVY = [18, 65, 91] as const;

const PAGE_W = 210;
const PAGE_H = 297;
const M = 10;
const HEADER_BOTTOM = 35;
const CONTENT_BOTTOM = 264;

const OBJECTIVE =
  'O presente Relatório de Recebimento de Obras tem por objetivo registrar de forma padronizada os resultados das vistorias técnicas realizadas para avaliação e recebimento de obras de infraestrutura de abastecimento de água e esgotamento sanitário, documentando os elementos inspecionados, os defeitos ou não conformidades identificados, sua classificação quanto à gravidade, os respectivos registros fotográficos e demais observações relevantes, de modo a subsidiar a aceitação dos serviços executados, a definição de eventuais ações corretivas e a formalização do recebimento da obra pela Sabesp.';

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

function now() {
  return new Date().toLocaleString('pt-BR');
}

function wrap(doc: jsPDF, text: unknown, width: number) {
  return doc.splitTextToSize(String(text ?? ''), width) as string[];
}

function addHeader(doc: jsPDF, report: ReceiptReport, logo: string) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(65, 75, 82);
  doc.text(now(), M, 7.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);

  doc.text(
    'Desenvolvido pelo Polo de Manutenção Suzano - OLMS',
    PAGE_W - M,
    7.2,
    { align: 'right' }
  );

  doc.text(
    'Eng° Eder Nunes',
    PAGE_W - M,
    10.4,
    { align: 'right' }
  );

  doc.addImage(
    logo,
    'JPEG',
    11,
    10,
    18,
    18,
    undefined,
    'FAST'
  );

  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.2);

  doc.text(
    'RELATÓRIO DE RECEBIMENTO DE OBRAS',
    PAGE_W / 2,
    17.2,
    { align: 'center' }
  );

  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFontSize(7.8);

  const subtitle = [
    report.obra.municipio,
    report.obra.endereco,
    report.obra.tipoObra,
    report.obra.aguaEsgoto,
  ]
    .filter(Boolean)
    .join('  |  ');

  const subtitleLines = wrap(doc, subtitle, 166).slice(0, 2);

  doc.text(
    subtitleLines,
    PAGE_W / 2,
    24.4,
    { align: 'center' }
  );

  doc.setDrawColor(CYAN[0], CYAN[1], CYAN[2]);
  doc.setLineWidth(0.8);
  doc.line(M, 32, PAGE_W - M, 32);
}

function section(
  doc: jsPDF,
  title: string,
  y: number,
  right = ''
) {
  doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]);

  doc.roundedRect(
    M,
    y,
    PAGE_W - M * 2,
    7.2,
    1.6,
    1.6,
    'F'
  );

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.7);

  doc.text(title, M + 2.3, y + 4.9);

  if (right) {
    doc.text(
      right,
      PAGE_W - M - 2.3,
      y + 4.9,
      { align: 'right' }
    );
  }

  doc.setTextColor(DARK[0], DARK[1], DARK[2]);

  return y + 9;
}

function ensure(
  doc: jsPDF,
  report: ReceiptReport,
  logo: string,
  y: number,
  needed = 15
) {
  if (y + needed <= CONTENT_BOTTOM) {
    return y;
  }

  doc.addPage();
  addHeader(doc, report, logo);

  return HEADER_BOTTOM;
}

function infoTable(
  doc: jsPDF,
  rows: Array<[string, string]>,
  y: number
) {
  doc.setLineWidth(0.1);

  const widths = [
    8,
    68,
    PAGE_W - 2 * M - 76,
  ];

  const x = M;

  rows.forEach(([label, value], index) => {
    const valueLines = wrap(
      doc,
      value || '-',
      widths[2] - 4
    );

    const rowHeight = Math.max(
      7,
      valueLines.length * 3.8 + 3
    );

    doc.setDrawColor(
      BORDER[0],
      BORDER[1],
      BORDER[2]
    );

    doc.setFillColor(255, 255, 255);

    doc.rect(
      x,
      y,
      widths[0],
      rowHeight,
      'FD'
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);

    doc.text(
      String(index + 1),
      x + widths[0] / 2,
      y + 4.7,
      { align: 'center' }
    );

    doc.setFillColor(
      LIGHT[0],
      LIGHT[1],
      LIGHT[2]
    );

    doc.rect(
      x + widths[0],
      y,
      widths[1],
      rowHeight,
      'FD'
    );

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(
      TEXT_BLUE[0],
      TEXT_BLUE[1],
      TEXT_BLUE[2]
    );

    doc.text(
      label,
      x + widths[0] + 2,
      y + 4.7,
      { maxWidth: widths[1] - 4 }
    );

    doc.setFillColor(255, 255, 255);

    doc.rect(
      x + widths[0] + widths[1],
      y,
      widths[2],
      rowHeight,
      'FD'
    );

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);

    doc.text(
      valueLines,
      x + widths[0] + widths[1] + 2,
      y + 4.7,
      { maxWidth: widths[2] - 4 }
    );

    y += rowHeight;
  });

  return y + 3;
}

function paragraph(
  doc: jsPDF,
  text: string,
  y: number
) {
  const lines = wrap(
    doc,
    text,
    PAGE_W - 2 * M - 4
  );

  const height = lines.length * 3.8 + 5;

  doc.setLineWidth(0.1);

  doc.setDrawColor(
    BORDER[0],
    BORDER[1],
    BORDER[2]
  );

  doc.setFillColor(255, 255, 255);

  doc.rect(
    M,
    y,
    PAGE_W - 2 * M,
    height,
    'FD'
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);

  doc.setTextColor(
    DARK[0],
    DARK[1],
    DARK[2]
  );

  doc.text(
    lines,
    M + 2,
    y + 4.5,
    {
      maxWidth: PAGE_W - 2 * M - 4,
    }
  );

  return y + height + 3;
}

type SummaryRow = {
  item: string;
  elemento: string;
  identificacao: string;
  tipoDefeito: string;
  descricaoDefeito: string;
  grau: string;
};

function buildSummaryRows(report: ReceiptReport) {
  const rows: SummaryRow[] = [];
  let item = 1;

  report.apontamentos.forEach((apontamento) => {
    apontamento.defeitos.forEach((defeito) => {
      rows.push({
        item: String(item++),
        elemento: apontamento.elemento,
        identificacao: apontamento.identificacaoElemento,
        tipoDefeito: defeito.tipoDefeito,
        descricaoDefeito: defeito.descricaoDefeito,
        grau: defeito.grau,
      });
    });
  });

  return rows;
}

function severityColors(grau: string) {
  const normalized = grau.toLowerCase();

  if (normalized.includes('grave')) {
    return {
      fill: [255, 224, 224] as const,
      text: [160, 20, 20] as const,
    };
  }

  if (normalized.includes('moder')) {
    return {
      fill: [255, 246, 204] as const,
      text: [120, 90, 0] as const,
    };
  }

  return {
    fill: [225, 247, 229] as const,
    text: [22, 110, 47] as const,
  };
}

function drawSummary(
  doc: jsPDF,
  report: ReceiptReport,
  logo: string,
  startY: number
) {
  doc.setLineWidth(0.1);

  const widths = [
    8,
    23,
    32,
    42,
    63,
    22,
  ];

  const headers = [
    'Item',
    'Elemento',
    'Identificação do Elemento',
    'Tipo de defeito',
    'Descrição do defeito',
    'Grau do defeito',
  ];

  let y = startY;

  const drawHeader = () => {
    y = ensure(
      doc,
      report,
      logo,
      y,
      10
    );

    let x = M;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);

    headers.forEach((header, index) => {
      doc.setFillColor(
        NAVY[0],
        NAVY[1],
        NAVY[2]
      );

      doc.setDrawColor(
        BORDER[0],
        BORDER[1],
        BORDER[2]
      );

      doc.rect(
        x,
        y,
        widths[index],
        7.5,
        'FD'
      );

      doc.setTextColor(
        255,
        255,
        255
      );

      doc.text(
        header,
        x + widths[index] / 2,
        y + 4.8,
        {
          align: 'center',
          maxWidth: widths[index] - 2,
        }
      );

      x += widths[index];
    });

    doc.setTextColor(
      DARK[0],
      DARK[1],
      DARK[2]
    );

    y += 7.5;
  };

  drawHeader();

  buildSummaryRows(report).forEach((row) => {
    const values = [
      row.item,
      row.elemento,
      row.identificacao,
      row.tipoDefeito,
      row.descricaoDefeito,
      row.grau,
    ];

    const lines = values.map((value, index) =>
      wrap(
        doc,
        value,
        widths[index] - 2.4
      )
    );

    const rowHeight = Math.max(
      7,
      Math.max(
        ...lines.map((line) => line.length)
      ) * 3.7 + 2.5
    );

    const oldY = y;

    y = ensure(
      doc,
      report,
      logo,
      y,
      rowHeight + 2
    );

    if (
      y !== oldY &&
      y === HEADER_BOTTOM
    ) {
      y = section(
        doc,
        'Resumo dos apontamentos - continuação',
        y
      );

      drawHeader();
    }

    let x = M;

    values.forEach((_value, index) => {
      const severity =
        index === 5
          ? severityColors(row.grau)
          : null;

      const fillColor:
        readonly [number, number, number] =
        severity
          ? severity.fill
          : [255, 255, 255] as const;

      doc.setFillColor(
        fillColor[0],
        fillColor[1],
        fillColor[2]
      );

      doc.setDrawColor(
        BORDER[0],
        BORDER[1],
        BORDER[2]
      );

      doc.rect(
        x,
        y,
        widths[index],
        rowHeight,
        'FD'
      );

      doc.setFont(
        'helvetica',
        index === 5
          ? 'bold'
          : 'normal'
      );

      doc.setFontSize(6.7);

      const textColor:
        readonly [number, number, number] =
        severity
          ? severity.text
          : DARK;

      doc.setTextColor(
        textColor[0],
        textColor[1],
        textColor[2]
      );

      doc.text(
        lines[index],
        index === 0
          ? x + widths[index] / 2
          : x + 1.2,
        y + 4.2,
        {
          align:
            index === 0
              ? 'center'
              : 'left',
          maxWidth:
            widths[index] - 2.4,
        }
      );

      x += widths[index];
    });

    y += rowHeight;
  });

  return y + 3;
}

function drawLegend(
  doc: jsPDF,
  report: ReceiptReport,
  logo: string,
  y: number
) {
  y = ensure(
    doc,
    report,
    logo,
    y,
    27
  );

  y = section(
    doc,
    'Legenda — Grau do defeito',
    y
  );

  const items = [
    [
      'Leve',
      'Defeito de baixo impacto, podendo ser corrigido no longo prazo.',
    ],
    [
      'Moderado',
      'Defeito em estágio de evolução, podendo se tornar grave, devendo ter sua resolução programada no médio prazo.',
    ],
    [
      'Grave',
      'Defeito com risco de colapso da estrutura ou de acidente, devendo ser corrigido o mais rápido possível.',
    ],
  ];

  doc.setLineWidth(0.1);

  items.forEach(([grau, descricao]) => {
    const colors =
      severityColors(grau);

    const height = Math.max(
      7,
      wrap(
        doc,
        descricao,
        150
      ).length * 3.6 + 3
    );

    doc.setFillColor(
      colors.fill[0],
      colors.fill[1],
      colors.fill[2]
    );

    doc.setDrawColor(
      BORDER[0],
      BORDER[1],
      BORDER[2]
    );

    doc.rect(
      M,
      y,
      27,
      height,
      'FD'
    );

    doc.rect(
      M + 27,
      y,
      PAGE_W - 2 * M - 27,
      height,
      'FD'
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(7);

    doc.setTextColor(
      colors.text[0],
      colors.text[1],
      colors.text[2]
    );

    doc.text(
      grau,
      M + 2,
      y + 4.6
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setTextColor(
      DARK[0],
      DARK[1],
      DARK[2]
    );

    doc.text(
      wrap(
        doc,
        descricao,
        PAGE_W - 2 * M - 31
      ),
      M + 29,
      y + 4.6
    );

    y += height;
  });

  return y + 3;
}

function imageDimensions(
  dataUrl: string
): Promise<{
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () =>
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });

    image.onerror = reject;
    image.src = dataUrl;
  });
}

function imageFormat(
  dataUrl: string
): 'JPEG' | 'PNG' {
  return dataUrl.startsWith(
    'data:image/png'
  )
    ? 'PNG'
    : 'JPEG';
}

async function addImageFit(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const size =
    await imageDimensions(dataUrl);

  const scale = Math.min(
    width / size.width,
    height / size.height
  );

  const drawWidth =
    size.width * scale;

  const drawHeight =
    size.height * scale;

  doc.addImage(
    dataUrl,
    imageFormat(dataUrl),
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
    undefined,
    'FAST'
  );
}

async function drawPhotoCard(
  doc: jsPDF,
  photo: StoredFile,
  x: number,
  y: number,
  width: number,
  imageHeight: number
) {
  doc.setDrawColor(
    207,
    215,
    221
  );

  doc.setLineWidth(0.1);

  doc.roundedRect(
    x,
    y,
    width,
    imageHeight,
    1.5,
    1.5
  );

  await addImageFit(
    doc,
    photo.data,
    x + 1,
    y + 1,
    width - 2,
    imageHeight - 2
  );

  let descriptionHeight = 0;

  if (photo.descricao) {
    doc.setFontSize(7.1);

    doc.setTextColor(
      DARK[0],
      DARK[1],
      DARK[2]
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Descrição:',
      x + 0.5,
      y + imageHeight + 4.3
    );

    const labelWidth =
      doc.getTextWidth(
        'Descrição: '
      ) + 1;

    doc.setFont(
      'helvetica',
      'normal'
    );

    const descriptionLines =
      wrap(
        doc,
        photo.descricao,
        width - labelWidth - 1.5
      );

    doc.text(
      descriptionLines,
      x + labelWidth,
      y + imageHeight + 4.3
    );

    descriptionHeight =
      Math.max(
        6,
        descriptionLines.length * 3.7 + 2
      );
  }

  return imageHeight + descriptionHeight;
}

function drawDefectHeader(
  doc: jsPDF,
  y: number
) {
  doc.setLineWidth(0.1);

  const widths = [
    48,
    112,
    30,
  ];

  const headers = [
    'Tipo de defeito',
    'Descrição do defeito',
    'Grau',
  ];

  let x = M;

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(6.8);

  headers.forEach((header, index) => {
    doc.setFillColor(
      NAVY[0],
      NAVY[1],
      NAVY[2]
    );

    doc.setDrawColor(
      BORDER[0],
      BORDER[1],
      BORDER[2]
    );

    doc.rect(
      x,
      y,
      widths[index],
      7,
      'FD'
    );

    doc.setTextColor(
      255,
      255,
      255
    );

    doc.text(
      header,
      x + widths[index] / 2,
      y + 4.6,
      {
        align: 'center',
        maxWidth:
          widths[index] - 2,
      }
    );

    x += widths[index];
  });

  return {
    y: y + 7,
    widths,
  };
}

function drawDefects(
  doc: jsPDF,
  report: ReceiptReport,
  logo: string,
  y: number,
  apontamentoIndex: number
) {
  const apontamento =
    report.apontamentos[
      apontamentoIndex
    ];

  let header =
    drawDefectHeader(
      doc,
      y
    );

  y = header.y;

  for (
    const defeito
    of apontamento.defeitos
  ) {
    const values = [
      defeito.tipoDefeito,
      defeito.descricaoDefeito,
      defeito.grau,
    ];

    const lines =
      values.map(
        (value, index) =>
          wrap(
            doc,
            value,
            header.widths[index] - 2.4
          )
      );

    const rowHeight =
      Math.max(
        7,
        Math.max(
          ...lines.map(
            (line) =>
              line.length
          )
        ) * 3.7 + 2.5
      );

    const oldY = y;

    y = ensure(
      doc,
      report,
      logo,
      y,
      rowHeight + 2
    );

    if (
      y !== oldY &&
      y === HEADER_BOTTOM
    ) {
      y = section(
        doc,
        `Apontamento ${String(
          apontamentoIndex + 1
        ).padStart(
          2,
          '0'
        )} - continuação`,
        y
      );

      y = infoTable(
        doc,
        [
          [
            'Elemento',
            apontamento.elemento,
          ],
          [
            'Identificação do Elemento',
            apontamento.identificacaoElemento,
          ],
        ],
        y
      );

      header =
        drawDefectHeader(
          doc,
          y
        );

      y = header.y;
    }

    let x = M;

    values.forEach(
      (_value, index) => {
        const severity =
          index === 2
            ? severityColors(
                defeito.grau
              )
            : null;

        const fillColor:
          readonly [number, number, number] =
          severity
            ? severity.fill
            : [255, 255, 255] as const;

        doc.setFillColor(
          fillColor[0],
          fillColor[1],
          fillColor[2]
        );

        doc.setDrawColor(
          BORDER[0],
          BORDER[1],
          BORDER[2]
        );

        doc.rect(
          x,
          y,
          header.widths[index],
          rowHeight,
          'FD'
        );

        doc.setFont(
          'helvetica',
          index === 2
            ? 'bold'
            : 'normal'
        );

        doc.setFontSize(6.8);

        const textColor:
          readonly [number, number, number] =
          severity
            ? severity.text
            : DARK;

        doc.setTextColor(
          textColor[0],
          textColor[1],
          textColor[2]
        );

        doc.text(
          lines[index],
          x + 1.2,
          y + 4.2,
          {
            maxWidth:
              header.widths[index] - 2.4,
          }
        );

        x += header.widths[index];
      }
    );

    y += rowHeight;
  }

  return y;
}

async function addAppointments(
  doc: jsPDF,
  report: ReceiptReport,
  logo: string
) {
  for (
    let apontamentoIndex = 0;
    apontamentoIndex <
    report.apontamentos.length;
    apontamentoIndex += 1
  ) {
    const apontamento =
      report.apontamentos[
        apontamentoIndex
      ];

    doc.addPage();

    addHeader(
      doc,
      report,
      logo
    );

    let y = section(
      doc,
      `Apontamento ${String(
        apontamentoIndex + 1
      ).padStart(2, '0')}`,
      HEADER_BOTTOM,
      `${apontamento.fotos.length} foto(s)`
    );

    const rows:
      Array<[string, string]> =
      [
        [
          'Elemento',
          apontamento.elemento,
        ],
        [
          'Identificação do Elemento',
          apontamento.identificacaoElemento,
        ],
      ];

    if (
      apontamento
        .descricaoComplementarElemento
    ) {
      rows.push([
        'Descrição complementar do elemento',
        apontamento.descricaoComplementarElemento,
      ]);
    }

    y = infoTable(
      doc,
      rows,
      y
    );

    y = drawDefects(
      doc,
      report,
      logo,
      y,
      apontamentoIndex
    );

    y += 5;

    const photoWidth = 92;
    const imageHeight = 62;
    const columnGap = 6;
        

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

  const blob = await fetch(logoUrl).then(r => r.blob());

  cachedLogo = await new Promise<string>(res => {
    const rd = new FileReader();
    rd.onload = () => res(String(rd.result));
    rd.readAsDataURL(blob);
  });

  return cachedLogo;
}

function now() {
  return new Date().toLocaleString('pt-BR');
}

function wrap(doc: jsPDF, text: unknown, width: number) {
  return doc.splitTextToSize(String(text ?? ''), width) as string[];
}

function addHeader(
  doc: jsPDF,
  r: ReceiptReport,
  logo: string
) {
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
    {

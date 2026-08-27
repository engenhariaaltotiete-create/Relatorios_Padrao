import type { AnyReport, BudgetLine, DefectLine, DiagnosisReport, Evidence, InspectionNote, ReceiptReport, Report, ServiceLine, StoredFile, WhyLine } from '../types';

export const uid = () => `r_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const today = () => new Date().toISOString().slice(0, 10);

export function blankService(): ServiceLine {
  return { id: uid(), tipo: '', preco: '', unid: '', qtde: '', precoUnit: '' };
}

export function blankEvidence(): Evidence {
  return { id: uid(), os: '', servicos: [blankService()], observacao: '', fotos: [] };
}

export function blankDefect(): DefectLine {
  return { id: uid(), tipoDefeito: '', descricaoDefeito: '', grau: '' };
}

export function blankInspectionNote(): InspectionNote {
  return {
    id: uid(),
    elemento: '',
    identificacaoElemento: '',
    descricaoComplementarElemento: '',
    defeitos: [blankDefect()],
    fotos: [],
  };
}

export function newReport(): Report {
  const now = new Date().toISOString();
  return {
    kind: 'services', version: 15, id: uid(), createdAt: now, updatedAt: now,
    generatedAt: null, archivedAt: null,
    responsavel: { elaboradoPor: '', data: today(), cargo: '', empresa: '' },
    obra: { municipio: '', endereco: '', tipoObra: '', aguaEsgoto: '' },
    evidencias: [blankEvidence()], anexos: [],
  };
}

export function newReceiptReport(): ReceiptReport {
  const now = new Date().toISOString();
  return {
    kind: 'receipt', version: 15, id: uid(), createdAt: now, updatedAt: now,
    generatedAt: null, archivedAt: null,
    responsavel: { elaboradoPor: '', data: today(), matricula: '', cargo: '', unidade: '' },
    obra: {
      municipio: '', endereco: '', tipoObra: '', aguaEsgoto: '', empresaExecutora: '',
      contrato: '', descricaoComplementar: '',
    },
    apontamentos: [blankInspectionNote()], anexos: [], observacoesGerais: '',
  };
}


export function blankWhy(): WhyLine { return { id: uid(), pergunta: '', resposta: '' }; }
export function blankBudget(): BudgetLine { return { id: uid(), descricao: '', preco: '', unid: '', quant: '', precoUnit: '' }; }
export function newDiagnosisReport(): DiagnosisReport {
 const now=new Date().toISOString(); return {kind:'diagnosis',version:16,id:uid(),createdAt:now,updatedAt:now,generatedAt:null,archivedAt:null,
 responsavel:{elaboradoPor:'',data:today(),matricula:'',cargo:'',unidade:''},demanda:{endereco:'',municipio:'',processo:'',origem:'',documento:'',problema:''},
 rede:{idade:'',diametro:'',material:'',declividade:'',pressao:'',conservacao:''},historico:{vazamentos:'',vazamentosDetalhe:'',obstrucoes:'',obstrucoesDetalhe:'',faltaAgua:'',faltaAguaDetalhe:'',retornoEsgoto:'',retornoEsgotoDetalhe:''},
 juridico:{judiciais:'',judiciaisDetalhe:'',procon:'',proconDetalhe:'',regulatorios:'',regulatoriosDetalhe:''},causa:{problema:'',porques:[blankWhy()],causaRaiz:''},
 solucao:{tipoObra:'',extensao:'',novasEconomias:'',pngs:'',diametro:'',material:'',necessidade:'',parecer:'',orcamento:[blankBudget()]},anexos:[]}; }
export function normalizeDiagnosisReport(input:any):DiagnosisReport { const b=newDiagnosisReport(); return {...b,...input,kind:'diagnosis',version:16,id:input?.id||uid(),responsavel:{...b.responsavel,...(input?.responsavel||{})},demanda:{...b.demanda,...(input?.demanda||{})},rede:{...b.rede,...(input?.rede||{})},historico:{...b.historico,...(input?.historico||{})},juridico:{...b.juridico,...(input?.juridico||{})},causa:{...b.causa,...(input?.causa||{}),porques:Array.isArray(input?.causa?.porques)&&input.causa.porques.length?input.causa.porques:[blankWhy()]},solucao:{...b.solucao,...(input?.solucao||{}),orcamento:Array.isArray(input?.solucao?.orcamento)&&input.solucao.orcamento.length?input.solucao.orcamento:[blankBudget()]},anexos:Array.isArray(input?.anexos)?input.anexos.map((a:any)=>({...normalizeFile(a),titulo:a?.titulo||''})):[]}; }

// Faz a leitura segura de relatórios antigos. Se não existir "kind", o arquivo é tratado
// como Relatório de Serviços Não Vinculados para manter compatibilidade com os JSON antigos.
export function normalizeReport(input: Partial<Report> | any): Report {
  const base = newReport();
  const r: Report = {
    ...base, ...input, kind: 'services', version: 15, id: input?.id || uid(),
    responsavel: { ...base.responsavel, ...(input?.responsavel || {}) },
    obra: { ...base.obra, ...(input?.obra || {}) },
    anexos: Array.isArray(input?.anexos) ? input.anexos.map(normalizeFile) : [], evidencias: [],
  };
  const oldEvidences = Array.isArray(input?.evidencias) && input.evidencias.length ? input.evidencias : [blankEvidence()];
  r.evidencias = oldEvidences.map((e: any) => {
    let services: ServiceLine[];
    if (Array.isArray(e?.servicos) && e.servicos.length) {
      services = e.servicos.map((s: any) => ({ ...blankService(), ...s, id: s?.id || uid() }));
    } else {
      services = [{ ...blankService(), tipo: e?.tipo || '', unid: e?.unidade || '', qtde: e?.quantidade ?? '' }];
    }
    return {
      id: e?.id || uid(), os: String(e?.os ?? ''), servicos: services,
      observacao: e?.observacao || '', fotos: Array.isArray(e?.fotos) ? e.fotos.map(normalizeFile) : [],
    };
  });
  return r;
}

export function normalizeReceiptReport(input: Partial<ReceiptReport> | any): ReceiptReport {
  const base = newReceiptReport();
  const r: ReceiptReport = {
    ...base, ...input, kind: 'receipt', version: 15, id: input?.id || uid(),
    responsavel: { ...base.responsavel, ...(input?.responsavel || {}) },
    obra: { ...base.obra, ...(input?.obra || {}) },
    anexos: Array.isArray(input?.anexos) ? input.anexos.map(normalizeFile) : [],
    observacoesGerais: input?.observacoesGerais || '', apontamentos: [],
  };
  const notes = Array.isArray(input?.apontamentos) && input.apontamentos.length ? input.apontamentos : [blankInspectionNote()];
  r.apontamentos = notes.map((n: any) => ({
    id: n?.id || uid(), elemento: n?.elemento || '', identificacaoElemento: n?.identificacaoElemento || '',
    descricaoComplementarElemento: n?.descricaoComplementarElemento || '',
    defeitos: Array.isArray(n?.defeitos) && n.defeitos.length
      ? n.defeitos.map((d: any) => ({ ...blankDefect(), ...d, id: d?.id || uid() }))
      : [blankDefect()],
    fotos: Array.isArray(n?.fotos) ? n.fotos.map(normalizeFile) : [],
  }));
  return r;
}

export function normalizeAnyReport(input: any): AnyReport {
  return input?.kind === 'diagnosis' ? normalizeDiagnosisReport(input) : input?.kind === 'receipt' ? normalizeReceiptReport(input) : normalizeReport(input);
}

function normalizeFile(f: any): StoredFile {
  return { id: f?.id || uid(), name: f?.name || 'arquivo', type: f?.type || 'application/octet-stream', data: f?.data || '', descricao: f?.descricao || '' };
}

export function normalizeText(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function moneyBR(value: number | string) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
export function numberBR(value: number | string) {
  return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function safeName(s: string) { return (s || 'NÃO INFORMADO').replace(/[\\/:*?"<>|]+/g, '-').trim(); }
export function fileNameBase(r: Report, when = new Date()) {
  const date = when.toLocaleDateString('pt-BR').replaceAll('/', '-');
  return `${safeName(r.obra.tipoObra)} - ${safeName(r.obra.aguaEsgoto)} - ${safeName(r.obra.endereco)} - ${safeName(r.obra.municipio)} - ${date}`;
}
export function receiptFileNameBase(r: ReceiptReport, when = new Date()) {
  const date = when.toLocaleDateString('pt-BR').replaceAll('/', '-');
  return `RECEBIMENTO - ${safeName(r.obra.tipoObra)} - ${safeName(r.obra.aguaEsgoto)} - ${safeName(r.obra.endereco)} - ${safeName(r.obra.municipio)} - ${date}`;
}
export function diagnosisFileNameBase(r: DiagnosisReport, when = new Date()) { const date=when.toLocaleDateString('pt-BR').replaceAll('/','-'); return `DIAGNOSTICO - ${safeName(r.demanda.processo)} - ${safeName(r.demanda.endereco)} - ${safeName(r.demanda.municipio)} - ${date}`; }
export function anyFileNameBase(r: AnyReport, when = new Date()) {
  return r.kind === 'diagnosis' ? diagnosisFileNameBase(r, when) : r.kind === 'receipt' ? receiptFileNameBase(r, when) : fileNameBase(r, when);
}

export async function fileToStored(file: File): Promise<StoredFile> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error); reader.readAsDataURL(file);
  });
  return { id: uid(), name: file.name, type: file.type, data, descricao: '' };
}

export function dataUrlToUint8(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(',')[1] || ''; const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Pesquisa em todos os campos textuais, ignorando somente o conteúdo pesado Base64.
export function searchableText(report: AnyReport) {
  const copy = JSON.parse(JSON.stringify(report, (key, value) => {
    if (key === 'data' && typeof value === 'string' && value.startsWith('data:')) return '';
    return value;
  }));
  return normalizeText(JSON.stringify(copy));
}

export function deepClone<T>(obj: T): T {
  return typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
}

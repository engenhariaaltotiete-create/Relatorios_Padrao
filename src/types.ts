// Tipos centrais do sistema. Eles funcionam como um "mapa" dos dados dos dois modelos de relatório.
// O campo kind permite guardar os dois relatórios no mesmo armazenamento sem misturá-los.

export type ReportKind = 'services' | 'receipt' | 'diagnosis';

export type PriceItem = {
  descricao: string;
  preco: number;
  unid: string;
  precoUnit: number;
};

export type ServiceLine = {
  id: string;
  tipo: string;
  preco: string;
  unid: string;
  qtde: string;
  precoUnit: string;
};

export type StoredFile = {
  id: string;
  name: string;
  type: string;
  data: string; // arquivo convertido em Data URL para poder ser salvo localmente/JSON
  descricao: string;
};

export type Evidence = {
  id: string;
  os: string;
  servicos: ServiceLine[];
  observacao: string;
  fotos: StoredFile[];
};

export type Report = {
  kind: 'services';
  version: number;
  id: string;
  createdAt: string;
  updatedAt: string;
  generatedAt: string | null;
  archivedAt: string | null;
  responsavel: {
    elaboradoPor: string;
    data: string;
    cargo: string;
    empresa: string;
  };
  obra: {
    municipio: string;
    endereco: string;
    tipoObra: string;
    aguaEsgoto: string;
  };
  evidencias: Evidence[];
  anexos: StoredFile[];
};

export type DefectLine = {
  id: string;
  tipoDefeito: string;
  descricaoDefeito: string;
  grau: string;
};

export type InspectionNote = {
  id: string;
  elemento: string;
  identificacaoElemento: string;
  descricaoComplementarElemento: string;
  defeitos: DefectLine[];
  fotos: StoredFile[];
};

export type ReceiptReport = {
  kind: 'receipt';
  version: number;
  id: string;
  createdAt: string;
  updatedAt: string;
  generatedAt: string | null;
  archivedAt: string | null;
  responsavel: {
    elaboradoPor: string;
    data: string;
    matricula: string;
    cargo: string;
    unidade: string;
  };
  obra: {
    municipio: string;
    endereco: string;
    tipoObra: string;
    aguaEsgoto: string;
    empresaExecutora: string;
    contrato: string;
    descricaoComplementar: string;
  };
  apontamentos: InspectionNote[];
  anexos: StoredFile[];
  observacoesGerais: string;
};

export type AnyReport = Report | ReceiptReport | DiagnosisReport;

export type WhyLine = { id:string; pergunta:string; resposta:string };
export type BudgetLine = { id:string; descricao:string; preco:string; unid:string; quant:string; precoUnit:string };
export type DiagnosisAttachment = StoredFile & { titulo:string };
export type DiagnosisReport = {
  kind:'diagnosis'; version:number; id:string; createdAt:string; updatedAt:string; generatedAt:string|null; archivedAt:string|null;
  responsavel:{ elaboradoPor:string; data:string; matricula:string; cargo:string; unidade:string };
  demanda:{ endereco:string; municipio:string; processo:string; origem:string; documento:string; problema:string };
  rede:{ idade:string; diametro:string; material:string; declividade:string; pressao:string; conservacao:string };
  historico:{ vazamentos:string; vazamentosDetalhe:string; obstrucoes:string; obstrucoesDetalhe:string; faltaAgua:string; faltaAguaDetalhe:string; retornoEsgoto:string; retornoEsgotoDetalhe:string };
  juridico:{ judiciais:string; judiciaisDetalhe:string; procon:string; proconDetalhe:string; regulatorios:string; regulatoriosDetalhe:string };
  causa:{ problema:string; porques:WhyLine[]; causaRaiz:string };
  solucao:{ tipoObra:string; extensao:string; novasEconomias:string; pngs:string; diametro:string; material:string; necessidade:string; parecer:string; orcamento:BudgetLine[] };
  anexos:DiagnosisAttachment[];
};

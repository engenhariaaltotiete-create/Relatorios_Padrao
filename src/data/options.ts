// Valores iniciais das listas simples do formulário.
// Todos os campos usam pesquisa por qualquer trecho digitado; campos editáveis também aceitam novos valores.
export const BASE_OPTIONS = {
  cargo: ['Engenheiro', 'Encarregado', 'Fiscal', 'Líder'],
  empresa: ['Sabesp', 'Zigurate'],
  municipio: ['BIRITIBA-MIRIM', 'GUARAREMA', 'POÁ', 'SALESÓPOLIS', 'SUZANO'],
  tipoObra: ['PROLONGAMENTO', 'REMANEJAMENTO', 'CONSTRUÇÃO DE PV', 'CONSTRUÇÃO DE CAIXA', 'INSTALAÇÃO DE VÁLVULA'],
  aguaEsgoto: ['ÁGUA', 'ESGOTO'],
} as const;

export const RECEIPT_OPTIONS = {
  tipoObra: ['PROLONGAMENTO', 'REMANEJAMENTO', 'RENOVAÇÃO', 'CONSTRUÇÃO DE CAIXA', 'INSTALAÇÃO DE VENTOSA', 'INSTALAÇÃO DE VRP'],
  elemento: ['Rede', 'Ramal', 'PV', 'PI', 'Válvula', 'VRP', 'Descarga', 'Ventosa'],
  tipoDefeito: [
    'Vazamento', 'Tubulação danificada', 'Tubulação fora de especificação', 'Cobertura insuficiente da rede',
    'Declividade inadequada', 'Infiltração de água subterrânea', 'Rede em desacordo com projeto', 'Reaterro inadequado',
    'Interferência não tratada', 'Registro danificado', 'Caixa de registro danificada', 'Poço de visita danificado',
    'Poço de visita fora de padrão', 'Ligação irregular', 'Ventosa ausente', 'Ventosa danificada', 'Descarga ausente',
    'Descarga danificada', 'Bloco de ancoragem ausente', 'Bloco de ancoragem inadequado', 'Falha no teste hidrostático',
    'Recomposição de pavimento inadequada', 'Falta de pintura de ligação', 'Sarjeta danificada', 'Guia danificada',
    'Calçada danificada', 'Área não restaurada', 'Cadastro divergente',
  ],
  grau: ['Leve', 'Moderado', 'Grave'],
} as const;

export const DIAGNOSIS_OPTIONS = {
  municipio: ['SUZANO','POÁ','SALESÓPOLIS','BIRITIBA-MIRIM','GUARAREMA'],
  processo: ['ÁGUA','ESGOTO'],
  material: ['Ferro fundido','PVC','PEAD','fibrocimento','Aço'],
  simNaoNa: ['SIM','NÃO','NÃO SE APLICA'],
  simNao: ['SIM','NÃO'],
  tipoObra: ['Remanejamento','Prolongamento'],
  necessidade: ['no longo prazo','a médio prazo','a curto prazo','imediata'],
} as const;

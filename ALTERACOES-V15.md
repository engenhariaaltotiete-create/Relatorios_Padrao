# Alterações V15 — Relatórios Padrão

Esta versão transforma o projeto em um portal com dois modelos de relatório:

1. **Relatórios de Serviços Não Vinculados** — preserva o módulo existente.
2. **Relatório de Recebimento de Obras** — novo módulo de vistoria e recebimento.

## Novo Relatório de Recebimento de Obras

- bloco Objetivo com texto padrão fixo;
- identificação do responsável com matrícula e unidade;
- dados da obra com empresa executora, contrato e descrição complementar;
- apontamentos repetíveis por elemento;
- vários defeitos por apontamento;
- classificação Leve / Moderado / Grave e legenda no PDF;
- fotos ilimitadas e botão para ativar a câmera do celular;
- anexos imagem, PDF e TIF/TIFF;
- observações gerais;
- armazenamento local, pesquisa, arquivamento, JSON e PDF no mesmo padrão do sistema existente.

## Ajustes no Relatório de Serviços Não Vinculados

- tabela-resumo passa a exibir **Nº do Preço** depois de Tipo de Serviço;
- subtotal mescla **Item + Nº OS + Tipo de Serviço + Nº do Preço**;
- grades das tabelas foram reduzidas para aproximadamente metade da espessura anterior.

## Compatibilidade

Relatórios antigos sem o campo `kind` continuam sendo reconhecidos automaticamente como Relatórios de Serviços Não Vinculados.

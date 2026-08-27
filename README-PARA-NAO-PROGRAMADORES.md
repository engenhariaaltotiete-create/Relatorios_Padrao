# Relatórios de Serviços Não Vinculados — versão 11 (React)

Esta versão foi reorganizada para ficar mais estável no celular e mais fácil de manter.

## O que mudou por dentro

### 1. React
Em vez de um único arquivo HTML com centenas de funções misturadas, a tela foi dividida em componentes. Exemplos:
- `Dashboard.tsx`: tela inicial e pesquisa.
- `Editor.tsx`: formulário do relatório.
- `EvidenceCard.tsx`: cada bloco de evidência.
- `ServiceSearch.tsx`: lista pesquisável do Tipo de Serviço.

Isso reduz o risco de um erro em uma parte impedir toda a tela de abrir.

### 2. TypeScript
Os formatos de dados estão descritos em `src/types.ts`. Isso ajuda a encontrar erros de programação antes da execução.

### 3. PDF gerado diretamente
O arquivo `src/lib/pdf.ts` cria o PDF usando código próprio. A versão antiga dependia de abrir outra janela e chamar a impressão do navegador. Isso costuma falhar em celular.

Agora o fluxo é:
1. o sistema cria o PDF em memória;
2. incorpora os PDFs anexados;
3. aplica rodapé e paginação;
4. gera um arquivo real `.pdf`;
5. oferece **Baixar**, **Compartilhar** ou **Abrir**.

### 4. Armazenamento local
`src/lib/storage.ts` usa IndexedDB, que é apropriado para relatórios com fotos e anexos. Se o IndexedDB estiver indisponível, existe um modo alternativo com `localStorage`.

### 5. Catálogo de preços
O catálogo está em `src/data/priceCatalog.ts` e foi montado a partir de:
`Novo MODELO PARA A PLANILHA DE PREÇOS-2.xlsx`.

## Estrutura de pastas

```text
src/
  assets/       logo
  components/   telas e partes visuais
  data/         listas e catálogo de preços
  lib/          armazenamento, PDF e funções auxiliares
  styles/       aparência do sistema
  App.tsx       coordena as telas
  main.tsx      inicia o React
```

## Como executar no computador

É necessário ter Node.js instalado.

```bash
npm install
npm run dev
```

O terminal mostrará um endereço como `http://localhost:5173`.

## Como gerar uma versão pronta para publicação

```bash
npm run build
```

Será criada a pasta `dist`. Essa é a pasta que pode ser publicada em GitHub Pages, Netlify, Vercel ou outro servidor estático.

## Android / Acode

O Acode consegue editar os arquivos, mas React/Vite precisa ser executado por um servidor de desenvolvimento ou por uma versão já compilada (`dist`).

No Android, uma alternativa é usar **Termux + Node.js** para executar `npm install` e `npm run dev`. Depois o endereço `localhost` pode ser aberto no navegador do celular.

## Comentários no código

Foram colocados comentários em português nos pontos principais. Eles começam normalmente com `//` e explicam para que serve aquela parte do programa.

## Versão 12 — uso pelo GitHub Pages

Esta versão pode ser publicada diretamente no GitHub. Depois de publicada, o usuário final acessa um link comum no navegador e não precisa instalar ferramentas de programação.

Para o passo a passo, consulte `README-GITHUB-PAGES.md`.

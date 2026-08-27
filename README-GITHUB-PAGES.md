# Publicação no GitHub Pages — versão 12

Esta versão foi preparada para funcionar hospedada no **GitHub Pages**.
O usuário final não precisa instalar Node.js, Termux ou Acode: ele acessa apenas o link publicado.

## Como publicar

1. Crie um repositório novo no GitHub.
2. Envie **todo o conteúdo desta pasta** para a raiz do repositório.
3. Use a branch `main`.
4. No GitHub, entre em **Settings > Pages**.
5. Em **Build and deployment > Source**, selecione **GitHub Actions**.
6. Abra a aba **Actions** do repositório. O fluxo `Publicar no GitHub Pages` será executado automaticamente.
7. Quando o processo ficar verde, o endereço do sistema aparecerá em **Settings > Pages**.

## O que o GitHub faz sozinho

O arquivo `.github/workflows/deploy-pages.yml` manda o GitHub:

- instalar as dependências do projeto;
- executar `npm run build`;
- gerar a pasta `dist`;
- publicar essa pasta no GitHub Pages.

Portanto, você **não precisa compilar no celular** para publicar.

## Dados dos relatórios

O GitHub Pages hospeda somente a aplicação. Os relatórios continuam salvos localmente no navegador/dispositivo do usuário, conforme a arquitetura atual.

Isso significa que os dados de um celular não aparecem automaticamente em outro aparelho. Para transferência/backup continua existindo a exportação/importação JSON.

## PDF

As bibliotecas usadas para gerar PDF fazem parte do pacote React e são incluídas na compilação do Vite. Assim, a geração não depende de carregar scripts de terceiros por CDN.

## Atualizações

Depois de alterar o código, basta enviar as alterações para a branch `main`. O GitHub Actions recompila e publica a nova versão automaticamente.

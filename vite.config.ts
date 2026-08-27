import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANTE PARA O GITHUB PAGES:
// "base: './'" faz os arquivos compilados (JavaScript, CSS, imagens etc.)
// serem carregados por caminhos relativos. Assim, o sistema funciona mesmo
// quando o endereço possui o nome do repositório no meio da URL, por exemplo:
// https://usuario.github.io/nome-do-repositorio/
export default defineConfig({
  plugins: [react()],
  base: './',
});

import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://castrojo.github.io',
  base: '/cncf-darkmode',
  outDir: './dist',
  server: { port: 4321 },
});

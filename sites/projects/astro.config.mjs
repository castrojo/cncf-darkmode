import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://castrojo.github.io',
  base: '/projects-website',
  outDir: './dist',
  vite: {
    resolve: {
      alias: {
        '@cncf/site-kit': new URL('../../packages/site-kit/src', import.meta.url).pathname,
      },
    },
  },
});

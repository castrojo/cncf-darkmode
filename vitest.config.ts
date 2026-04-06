import { defineConfig } from 'vitest/config';
import path from 'path';
export default defineConfig({
  resolve: {
    alias: {
      '@cncf/site-kit/lib': path.resolve('./src/lib'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
  },
});

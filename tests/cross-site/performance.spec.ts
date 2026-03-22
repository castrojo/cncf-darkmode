import { test, expect } from '@playwright/test';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Maximum JS bundle size per site: 500KB
const MAX_JS_KB = 500;

function getJsSize(distDir: string): number {
  try {
    const files = readdirSync(join(distDir, '_astro'), { withFileTypes: true })
      .filter(f => f.isFile() && f.name.endsWith('.js'))
      .map(f => statSync(join(distDir, '_astro', f.name)).size);
    return files.reduce((sum, size) => sum + size, 0) / 1024; // KB
  } catch {
    return 0;
  }
}

test('projects JS bundle is under 500KB', async () => {
  const distDir = join(process.cwd(), 'sites/projects/dist');
  const sizeKb = getJsSize(distDir);
  console.log(`projects JS bundle: ${sizeKb.toFixed(1)}KB`);
  expect(sizeKb).toBeLessThan(MAX_JS_KB);
});

test('endusers JS bundle is under 500KB', async () => {
  const distDir = join(process.cwd(), 'sites/endusers/dist');
  const sizeKb = getJsSize(distDir);
  console.log(`endusers JS bundle: ${sizeKb.toFixed(1)}KB`);
  expect(sizeKb).toBeLessThan(MAX_JS_KB);
});

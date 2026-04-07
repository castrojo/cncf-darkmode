import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { test, expect } from '@playwright/test';

const DIST = join(process.cwd(), 'dist');

function totalSizeKb(dir: string, ext: string): number {
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith(ext))
      .reduce((sum, f) => sum + statSync(join(dir, f)).size, 0) / 1024;
  } catch { return 0; }
}

// HTML size budgets
test('root HTML is under 50KB', () => {
  const size = statSync(join(DIST, 'index.html')).size / 1024;
  console.log(`root index.html: ${size.toFixed(1)}KB`);
  expect(size).toBeLessThan(50);
});

test('members HTML is under 75KB', () => {
  const size = statSync(join(DIST, 'members', 'index.html')).size / 1024;
  console.log(`members index.html: ${size.toFixed(1)}KB`);
  expect(size).toBeLessThan(75);
});

test('people HTML is under 1000KB (SSR-heavy — tracked)', () => {
  const size = statSync(join(DIST, 'people', 'index.html')).size / 1024;
  console.log(`people index.html: ${size.toFixed(1)}KB`);
  expect(size).toBeLessThan(1000);
});

// Bundle budgets
test('total JS bundle is under 200KB', () => {
  const sizeKb = totalSizeKb(join(DIST, '_astro'), '.js');
  console.log(`JS bundle total: ${sizeKb.toFixed(1)}KB`);
  expect(sizeKb).toBeLessThan(200);
});

test('total CSS bundle is under 80KB', () => {
  const sizeKb = totalSizeKb(join(DIST, '_astro'), '.css');
  console.log(`CSS bundle total: ${sizeKb.toFixed(1)}KB`);
  expect(sizeKb).toBeLessThan(80);
});

// JSON blob guards — these must never appear in production HTML
test('members HTML does not embed arch-data blob', () => {
  const html = readFileSync(join(DIST, 'members', 'index.html'), 'utf-8');
  expect(html).not.toContain('id="arch-data"');
});

test('members HTML does not embed initial-members-data blob', () => {
  const html = readFileSync(join(DIST, 'members', 'index.html'), 'utf-8');
  expect(html).not.toContain('id="initial-members-data"');
});

test('projects HTML does not embed initial-projects-data blob', () => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf-8');
  expect(html).not.toContain('id="initial-projects-data"');
});

test('projects HTML does not embed initial-changelog-data blob', () => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf-8');
  expect(html).not.toContain('id="initial-changelog-data"');
});

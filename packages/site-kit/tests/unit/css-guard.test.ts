import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const layoutCss = readFileSync(
  join(__dirname, '../../src/styles/layout.css'),
  'utf-8'
);

describe('layout.css regression guards', () => {
  it('.cncf-logo-wrapper img does NOT have display:block', () => {
    // display:block on the img breaks the flex layout
    const logoSection = layoutCss.match(/\.cncf-logo-wrapper\s+img\s*\{[^}]+\}/s)?.[0] ?? '';
    expect(logoSection).not.toMatch(/display\s*:\s*block/);
  });

  it('.site-title has white-space:nowrap', () => {
    expect(layoutCss).toMatch(/white-space\s*:\s*nowrap/);
  });

  it('.header-left uses flex: 0 0 240px', () => {
    expect(layoutCss).toMatch(/flex\s*:\s*0\s+0\s+240px/);
  });

  it('.cncf-logo-wrapper img has width:42px', () => {
    expect(layoutCss).toMatch(/width\s*:\s*42px/);
  });

  it('.section-nav has flex-wrap:nowrap', () => {
    expect(layoutCss).toMatch(/flex-wrap\s*:\s*nowrap/);
  });

  it('html has scrollbar-gutter:stable', () => {
    expect(layoutCss).toMatch(/scrollbar-gutter\s*:\s*stable/);
  });
});

/**
 * CSS regression guards — catch layout.css rules that cause visual regressions
 * without needing a browser. These tests run as unit tests (vitest).
 *
 * IMPORTANT: When a test here goes RED, it means a CSS change introduced a
 * specificity conflict or removed a critical guard. Fix layout.css, not the test.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const layoutCss = fs.readFileSync(
  path.resolve(__dirname, '../../src/styles/layout.css'),
  'utf8'
);

/**
 * Extract the CSS rule block for a given selector.
 * Returns the text between the selector's opening `{` and closing `}`.
 */
function getRuleBlock(css: string, selector: string): string | null {
  const idx = css.indexOf(selector);
  if (idx === -1) return null;
  const open = css.indexOf('{', idx);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

describe('layout.css — .cncf-logo-wrapper img specificity guard', () => {
  it('must NOT set display:block on .cncf-logo-wrapper img (specificity conflict with .logo-dark)', () => {
    const block = getRuleBlock(layoutCss, '.cncf-logo-wrapper img');
    expect(block, '.cncf-logo-wrapper img rule not found in layout.css').not.toBeNull();
    // If display: block is present here (specificity 0,1,1) it overrides
    // .logo-dark { display: none } (specificity 0,1,0) — making both logos visible
    // and pushing the title ~42px too far to the right.
    expect(
      block,
      '.cncf-logo-wrapper img must NOT set display: block — this causes a CSS specificity ' +
      'conflict with .logo-dark { display: none } (0,1,0) because .cncf-logo-wrapper img ' +
      'has specificity (0,1,1) which wins, making BOTH logo-light and logo-dark visible ' +
      'simultaneously. flex items do not need explicit display: block.'
    ).not.toMatch(/display\s*:\s*block/);
  });

  it('site-title must have white-space: nowrap to prevent wrapping', () => {
    const block = getRuleBlock(layoutCss, '.site-title');
    expect(block, '.site-title rule not found in layout.css').not.toBeNull();
    expect(
      block,
      '.site-title must have white-space: nowrap — absence causes title to wrap to two lines'
    ).toMatch(/white-space\s*:\s*nowrap/);
  });

  it('header-left must use flex: 0 0 240px for cross-site alignment', () => {
    const block = getRuleBlock(layoutCss, '.header-left');
    expect(block, '.header-left rule not found in layout.css').not.toBeNull();
    expect(
      block,
      '.header-left must use flex: 0 0 240px — using min-width allows growth when title ' +
      'text is wider, causing nav-group to drift between sites'
    ).toMatch(/flex\s*:\s*0\s+0\s+240px/);
  });

  it('.cncf-logo-wrapper img must have explicit width: 42px', () => {
    const block = getRuleBlock(layoutCss, '.cncf-logo-wrapper img');
    expect(block, '.cncf-logo-wrapper img rule not found in layout.css').not.toBeNull();
    expect(
      block,
      '.cncf-logo-wrapper img must have width: 42px — without explicit width, ' +
      'SVG images may render at auto size causing subpixel inconsistencies'
    ).toMatch(/width\s*:\s*42px/);
  });
});

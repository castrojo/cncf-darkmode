import { describe, it, expect, beforeEach } from 'vitest';
import { filterByTab } from '../../src/lib/tabs';
import type { SafeMember } from '../../src/lib/member-renderer';

const mk = (name: string, tier: string, isEndUser = false): SafeMember => ({
  name, slug: name.toLowerCase(), tier, isEndUser, logoUrl: '', updatedAt: '',
});

const members = [
  mk('Google', 'Platinum'), mk('Adidas', 'Silver', true), mk('MIT', 'Academic'),
  mk('CERN', 'Nonprofit'), mk('Apple', 'Gold'),
];

describe('filterByTab', () => {
  it('everyone returns all', () => expect(filterByTab(members, 'everyone')).toHaveLength(5));
  it('platinum returns platinum', () => expect(filterByTab(members, 'platinum').every(m => m.tier === 'Platinum')).toBe(true));
  it('academic returns academic and nonprofit', () => {
    const result = filterByTab(members, 'academic');
    expect(result.every(m => m.tier === 'Academic' || m.tier === 'Nonprofit')).toBe(true);
  });
  it('gold returns only gold', () => expect(filterByTab(members, 'gold').every(m => m.tier === 'Gold')).toBe(true));
  it('silver returns only silver', () => expect(filterByTab(members, 'silver').every(m => m.tier === 'Silver')).toBe(true));
  it('architectures returns empty list (separate arch grid)', () => {
    expect(filterByTab(members, 'architectures')).toHaveLength(0);
  });
});

describe('localStorage key', () => {
  it('STORAGE_KEY is cncf-endusers-tab (not legacy endusers-active-tab)', async () => {
    // Read the module source to verify the correct key constant is used
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(dir, '../../src/lib/tabs.ts'), 'utf-8');
    expect(src).toContain("'cncf-endusers-tab'");
    expect(src).toContain("STORAGE_KEY");
  });

  it('LEGACY_KEY migration code references endusers-active-tab', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(dir, '../../src/lib/tabs.ts'), 'utf-8');
    expect(src).toContain("'endusers-active-tab'");
    expect(src).toContain("LEGACY_KEY");
  });
});

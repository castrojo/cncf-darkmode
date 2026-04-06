import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function readJson(file: string): unknown {
  const p = path.resolve(process.cwd(), 'src/data', file);
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function expectString(value: unknown, field: string): void {
  expect(typeof value, `${field} must be a string`).toBe('string');
}

function expectOptionalString(value: unknown, field: string): void {
  if (value === undefined || value === null) return;
  expect(typeof value, `${field} must be a string when present`).toBe('string');
}

describe('members pipeline schema', () => {
  it('members.json entries match expected shape', () => {
    const data = readJson('members.json');
    expect(Array.isArray(data)).toBe(true);
    const members = data as Record<string, unknown>[];
    expect(members.length).toBeGreaterThan(0);

    for (const m of members) {
      expectString(m.name, 'name');
      expectString(m.slug, 'slug');
      expectString(m.logoUrl, 'logoUrl');
      expectString(m.tier, 'tier');
      expect(typeof m.isEndUser, 'isEndUser must be a boolean').toBe('boolean');
      expectString(m.updatedAt, 'updatedAt');
      expectOptionalString(m.description, 'description');
      expectOptionalString(m.homepageUrl, 'homepageUrl');
      expectOptionalString(m.joinedAt, 'joinedAt');

      if (m.industries !== undefined && m.industries !== null) {
        expect(Array.isArray(m.industries), 'industries must be an array').toBe(true);
      }
    }
  });

  it('architectures.json entries match expected shape', () => {
    const data = readJson('architectures.json');
    expect(Array.isArray(data)).toBe(true);
    const architectures = data as Record<string, unknown>[];
    expect(architectures.length).toBeGreaterThan(0);

    for (const a of architectures) {
      expectString(a.slug, 'slug');
      expectString(a.title, 'title');
      expectString(a.orgName, 'orgName');
      expectString(a.orgLogoUrl, 'orgLogoUrl');
      expectString(a.archUrl, 'archUrl');
      expectOptionalString(a.submittedAt, 'submittedAt');

      if (a.projects !== undefined && a.projects !== null) {
        expect(Array.isArray(a.projects), 'projects must be an array').toBe(true);
      }
    }
  });

  it('changelog.json entries have required event fields', () => {
    const data = readJson('changelog.json');
    expect(Array.isArray(data)).toBe(true);
    const events = data as Record<string, unknown>[];
    expect(events.length).toBeGreaterThan(0);

    for (const e of events) {
      expectString(e.id, 'id');
      expectString(e.type, 'type');
      expectString(e.timestamp, 'timestamp');
      expectString(e.description, 'description');
      expectOptionalString(e.memberSlug, 'memberSlug');
      expectOptionalString(e.memberName, 'memberName');
      expectOptionalString(e.memberTier, 'memberTier');
    }
  });
});

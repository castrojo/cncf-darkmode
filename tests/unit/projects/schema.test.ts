import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function readJson(file: string): unknown {
  const p = path.resolve(process.cwd(), 'src/data/projects', file);
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function expectString(value: unknown, field: string): void {
  expect(typeof value, `${field} must be a string`).toBe('string');
}

function expectOptionalString(value: unknown, field: string): void {
  if (value === undefined || value === null) return;
  expect(typeof value, `${field} must be a string when present`).toBe('string');
}

function expectOptionalNumber(value: unknown, field: string): void {
  if (value === undefined || value === null) return;
  expect(typeof value, `${field} must be a number when present`).toBe('number');
}

describe('projects pipeline schema', () => {
  it('projects.json entries match expected shape', () => {
    const data = readJson('projects.json');
    expect(Array.isArray(data)).toBe(true);
    const projects = data as Record<string, unknown>[];
    expect(projects.length).toBeGreaterThan(0);

    for (const p of projects) {
      expectString(p.name, 'name');
      expectString(p.slug, 'slug');
      expectString(p.logoUrl, 'logoUrl');
      expectString(p.maturity, 'maturity');
      expectString(p.category, 'category');
      expectString(p.subcategory, 'subcategory');
      expectString(p.updatedAt, 'updatedAt');

      expectOptionalString(p.description, 'description');
      expectOptionalString(p.homepageUrl, 'homepageUrl');
      expectOptionalString(p.repoUrl, 'repoUrl');
      expectOptionalString(p.acceptedDate, 'acceptedDate');
      expectOptionalString(p.incubatingDate, 'incubatingDate');
      expectOptionalString(p.graduatedDate, 'graduatedDate');
      expectOptionalString(p.archivedDate, 'archivedDate');
      expectOptionalString(p.license, 'license');
      expectOptionalString(p.primaryLanguage, 'primaryLanguage');
      expectOptionalNumber(p.stars, 'stars');
      expectOptionalNumber(p.forks, 'forks');
      expectOptionalNumber(p.contributors, 'contributors');

      if (p.topics !== undefined && p.topics !== null) {
        expect(Array.isArray(p.topics), 'topics must be an array').toBe(true);
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
      expectString(e.logoUrl, 'logoUrl');
      expectString(e.timestamp, 'timestamp');
      expectString(e.description, 'description');
      expectOptionalString(e.projectSlug, 'projectSlug');
      expectOptionalString(e.projectName, 'projectName');
      expectOptionalString(e.maturity, 'maturity');
    }
  });
});

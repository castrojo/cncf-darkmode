import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const FIXTURE_REQUIREMENTS = [
  { site: 'projects', file: 'projects-seed.json', minItems: 3 },
  { site: 'projects', file: 'changelog-seed.json', minItems: 1 },
  { site: 'endusers', file: 'members-seed.json', minItems: 3 },
  { site: 'endusers', file: 'architectures-seed.json', minItems: 1 },
];

for (const req of FIXTURE_REQUIREMENTS) {
  test(`${req.site}/fixtures/${req.file} exists and has >= ${req.minItems} items`, async () => {
    const path = join(process.cwd(), `sites/${req.site}/tests/fixtures/${req.file}`);
    expect(existsSync(path)).toBe(true);
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(req.minItems);
  });
}

test('fixture files contain no PII (email addresses)', async () => {
  const piiPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  for (const req of FIXTURE_REQUIREMENTS) {
    const path = join(process.cwd(), `sites/${req.site}/tests/fixtures/${req.file}`);
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8');
      expect(content).not.toMatch(piiPattern);
    }
  }
});

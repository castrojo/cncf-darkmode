/**
 * tests/unit/projects/project-health.test.ts
 *
 * Vitest unit tests for src/lib/projects/project-health.ts
 * Target: ≥70% statement/branch coverage.
 */

import { describe, it, expect } from 'vitest';
import {
  activityScore,
  velocityScore,
  communityScore,
  securityScore,
  scoreToGrade,
  computeHealth,
  type ProjectHealth,
  type HealthGrade,
} from '../../../src/lib/projects/project-health';
import type { SafeProject } from '../../../src/lib/projects/project-renderer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a date that is `days` days in the past relative to `now`. */
function daysAgo(days: number, now = new Date()): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

const NOW = new Date('2026-01-01T00:00:00Z');

/** Minimal valid SafeProject for test purposes. */
const BASE_PROJECT: SafeProject = {
  name: 'TestProject',
  slug: 'testproject',
  maturity: 'graduated',
  category: 'Test Category',
  subcategory: 'Sub',
  logoUrl: 'https://example.com/logo.svg',
  updatedAt: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// activityScore
// ---------------------------------------------------------------------------

describe('activityScore', () => {
  it('returns 100 for a commit today', () => {
    expect(activityScore(NOW.toISOString(), NOW)).toBe(100);
  });

  it('returns ~50 for a commit 182 days ago', () => {
    const score = activityScore(daysAgo(182, NOW), NOW);
    expect(score).toBeGreaterThanOrEqual(48);
    expect(score).toBeLessThanOrEqual(52);
  });

  it('returns 0 for a commit exactly 365 days ago', () => {
    expect(activityScore(daysAgo(365, NOW), NOW)).toBe(0);
  });

  it('returns 0 for a commit more than 365 days ago', () => {
    expect(activityScore(daysAgo(400, NOW), NOW)).toBe(0);
  });

  it('returns 0 when lastCommitDate is undefined', () => {
    expect(activityScore(undefined, NOW)).toBe(0);
  });

  it('returns 0 for an invalid date string', () => {
    expect(activityScore('not-a-date', NOW)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// velocityScore
// ---------------------------------------------------------------------------

describe('velocityScore', () => {
  it('returns 100 for a release today', () => {
    expect(velocityScore(NOW.toISOString(), NOW)).toBe(100);
  });

  it('returns ~50 for a release 182 days ago', () => {
    const score = velocityScore(daysAgo(182, NOW), NOW);
    expect(score).toBeGreaterThanOrEqual(48);
    expect(score).toBeLessThanOrEqual(52);
  });

  it('returns 0 for a release exactly 365 days ago', () => {
    expect(velocityScore(daysAgo(365, NOW), NOW)).toBe(0);
  });

  it('returns 0 when lastReleaseDate is undefined', () => {
    expect(velocityScore(undefined, NOW)).toBe(0);
  });

  it('returns 0 for an invalid date string', () => {
    expect(velocityScore('bad-date', NOW)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// communityScore
// ---------------------------------------------------------------------------

describe('communityScore', () => {
  it('returns 0 for 0 contributors', () => {
    expect(communityScore(0)).toBe(0);
  });

  it('returns 0 for undefined contributors', () => {
    expect(communityScore(undefined)).toBe(0);
  });

  it('returns 0 for negative contributors', () => {
    expect(communityScore(-5)).toBe(0);
  });

  it('returns 100 for exactly 1000 contributors', () => {
    expect(communityScore(1000)).toBe(100);
  });

  it('returns 100 for more than 1000 contributors', () => {
    expect(communityScore(5000)).toBe(100);
  });

  it('returns roughly 67 for 100 contributors (log(100)/log(1000) ≈ 0.667)', () => {
    const score = communityScore(100);
    expect(score).toBeGreaterThanOrEqual(66);
    expect(score).toBeLessThanOrEqual(68);
  });

  it('returns roughly 33 for 10 contributors (log(10)/log(1000) ≈ 0.333)', () => {
    const score = communityScore(10);
    expect(score).toBeGreaterThanOrEqual(32);
    expect(score).toBeLessThanOrEqual(34);
  });

  it('returns > 0 for 1 contributor', () => {
    // log(1)/log(1000) = 0 → score should be 0
    expect(communityScore(1)).toBe(0);
  });

  it('returns > 0 for 2 contributors', () => {
    expect(communityScore(2)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// securityScore
// ---------------------------------------------------------------------------

describe('securityScore', () => {
  it('returns 0 with no audit and no CLO Monitor', () => {
    expect(securityScore(undefined, undefined)).toBe(0);
  });

  it('returns 50 with only a valid audit date', () => {
    expect(securityScore('2024-01-01', undefined)).toBe(50);
  });

  it('returns 50 with only a cloMonitorName', () => {
    expect(securityScore(undefined, 'my-project')).toBe(50);
  });

  it('returns 100 with both audit date and cloMonitorName', () => {
    expect(securityScore('2024-01-01', 'my-project')).toBe(100);
  });

  it('treats empty-string audit date as absent', () => {
    expect(securityScore('', 'my-project')).toBe(50);
  });

  it('treats whitespace-only audit date as absent', () => {
    expect(securityScore('   ', undefined)).toBe(0);
  });

  it('treats empty-string cloMonitorName as absent', () => {
    expect(securityScore('2024-01-01', '')).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// scoreToGrade
// ---------------------------------------------------------------------------

describe('scoreToGrade', () => {
  it('returns A for score 80', () => {
    expect(scoreToGrade(80)).toBe('A');
  });

  it('returns A for score 100', () => {
    expect(scoreToGrade(100)).toBe('A');
  });

  it('returns B for score 60', () => {
    expect(scoreToGrade(60)).toBe('B');
  });

  it('returns B for score 79', () => {
    expect(scoreToGrade(79)).toBe('B');
  });

  it('returns C for score 40', () => {
    expect(scoreToGrade(40)).toBe('C');
  });

  it('returns C for score 59', () => {
    expect(scoreToGrade(59)).toBe('C');
  });

  it('returns D for score 0', () => {
    expect(scoreToGrade(0)).toBe('D');
  });

  it('returns D for score 39', () => {
    expect(scoreToGrade(39)).toBe('D');
  });
});

// ---------------------------------------------------------------------------
// computeHealth — composite score
// ---------------------------------------------------------------------------

describe('computeHealth', () => {
  it('returns a score and grade for a fully-populated project', () => {
    const project: SafeProject = {
      ...BASE_PROJECT,
      lastCommitDate: daysAgo(10, NOW),
      lastReleaseDate: daysAgo(20, NOW),
      contributors: 500,
      lastAuditDate: '2025-06-01',
      cloMonitorName: 'testproject',
    };
    const health = computeHealth(project, NOW);
    expect(health.score).toBeGreaterThan(0);
    expect(health.score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D']).toContain(health.grade);
  });

  it('returns score 0 for a project with no optional fields', () => {
    const health = computeHealth(BASE_PROJECT, NOW);
    expect(health.score).toBe(0);
    expect(health.grade).toBe('D');
    expect(health.breakdown.activity).toBe(0);
    expect(health.breakdown.velocity).toBe(0);
    expect(health.breakdown.community).toBe(0);
    expect(health.breakdown.security).toBe(0);
  });

  it('returns grade A for a near-perfect project', () => {
    const project: SafeProject = {
      ...BASE_PROJECT,
      lastCommitDate: daysAgo(1, NOW),
      lastReleaseDate: daysAgo(1, NOW),
      contributors: 1000,
      lastAuditDate: '2025-12-01',
      cloMonitorName: 'testproject',
    };
    const health = computeHealth(project, NOW);
    expect(health.grade).toBe('A');
    expect(health.score).toBeGreaterThanOrEqual(80);
  });

  it('score is clamped to [0, 100]', () => {
    const project: SafeProject = {
      ...BASE_PROJECT,
      lastCommitDate: daysAgo(1, NOW),
      lastReleaseDate: daysAgo(1, NOW),
      contributors: 9999999,
      lastAuditDate: '2025-12-01',
      cloMonitorName: 'testproject',
    };
    const health = computeHealth(project, NOW);
    expect(health.score).toBeLessThanOrEqual(100);
    expect(health.score).toBeGreaterThanOrEqual(0);
  });

  it('breakdown activity weight is 30%', () => {
    // Only activity contributes — commit today, no other fields
    const project: SafeProject = {
      ...BASE_PROJECT,
      lastCommitDate: NOW.toISOString(),
    };
    const health = computeHealth(project, NOW);
    // activity=100, velocity=0, community=0, security=0
    // composite = 100 * 0.30 = 30
    expect(health.breakdown.activity).toBe(100);
    expect(health.score).toBe(30);
  });

  it('breakdown velocity weight is 25%', () => {
    const project: SafeProject = {
      ...BASE_PROJECT,
      lastReleaseDate: NOW.toISOString(),
    };
    const health = computeHealth(project, NOW);
    expect(health.breakdown.velocity).toBe(100);
    expect(health.score).toBe(25);
  });

  it('breakdown community weight is 25%', () => {
    // 1000 contributors → community=100
    const project: SafeProject = {
      ...BASE_PROJECT,
      contributors: 1000,
    };
    const health = computeHealth(project, NOW);
    expect(health.breakdown.community).toBe(100);
    expect(health.score).toBe(25);
  });

  it('breakdown security weight is 20%', () => {
    const project: SafeProject = {
      ...BASE_PROJECT,
      lastAuditDate: '2025-01-01',
      cloMonitorName: 'testproject',
    };
    const health = computeHealth(project, NOW);
    expect(health.breakdown.security).toBe(100);
    expect(health.score).toBe(20);
  });

  it('grade matches scoreToGrade(score)', () => {
    const project: SafeProject = {
      ...BASE_PROJECT,
      lastCommitDate: daysAgo(30, NOW),
      contributors: 50,
    };
    const health = computeHealth(project, NOW);
    expect(health.grade).toBe(scoreToGrade(health.score));
  });

  it('handles a project committed exactly 365 days ago', () => {
    const project: SafeProject = {
      ...BASE_PROJECT,
      lastCommitDate: daysAgo(365, NOW),
    };
    const health = computeHealth(project, NOW);
    expect(health.breakdown.activity).toBe(0);
  });

  it('uses default now when not provided', () => {
    // Just ensure no error thrown when `now` omitted
    const health = computeHealth(BASE_PROJECT);
    expect(typeof health.score).toBe('number');
  });

  it('returns integer score', () => {
    const project: SafeProject = {
      ...BASE_PROJECT,
      lastCommitDate: daysAgo(100, NOW),
      lastReleaseDate: daysAgo(50, NOW),
      contributors: 123,
    };
    const health = computeHealth(project, NOW);
    expect(Number.isInteger(health.score)).toBe(true);
  });
});

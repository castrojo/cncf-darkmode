/**
 * project-health.ts
 *
 * Pure TypeScript DORA-style composite health score (0–100) derived from
 * existing SafeProject fields.  No external I/O — suitable for use in
 * both the browser bundle and Vitest unit tests.
 *
 * Score weights
 * ─────────────
 *  Activity   30 %  – days since lastCommitDate   (lower = better)
 *  Velocity   25 %  – days since lastReleaseDate  (lower = better)
 *  Community  25 %  – log(contributors)/log(1000) (higher = better)
 *  Security   20 %  – +50 if audited, +50 if cloMonitorName present
 *
 * Grade thresholds
 * ────────────────
 *  A  ≥ 80
 *  B  ≥ 60
 *  C  ≥ 40
 *  D  < 40
 */

import type { SafeProject } from './project-renderer';

export type HealthGrade = 'A' | 'B' | 'C' | 'D';

export interface ProjectHealth {
  /** Composite score 0–100 (integer) */
  score: number;
  /** Letter grade derived from composite score */
  grade: HealthGrade;
  /** Breakdown: individual dimension scores (0–100 each) */
  breakdown: {
    activity: number;   // 0–100
    velocity: number;   // 0–100
    community: number;  // 0–100
    security: number;   // 0–100
  };
}

// ---------------------------------------------------------------------------
// Dimension helpers — all return a value in [0, 100]
// ---------------------------------------------------------------------------

/**
 * Activity score: 100 pts if committed today, decays to 0 at 365 days.
 * Missing lastCommitDate → 0.
 */
export function activityScore(lastCommitDate: string | undefined, now = new Date()): number {
  if (!lastCommitDate) return 0;
  const d = new Date(lastCommitDate);
  if (isNaN(d.getTime())) return 0;
  const days = Math.max(0, (now.getTime() - d.getTime()) / 86_400_000);
  return Math.round(Math.max(0, 100 - (days / 365) * 100));
}

/**
 * Velocity score: 100 pts if released today, decays to 0 at 365 days.
 * Missing lastReleaseDate → 0.
 */
export function velocityScore(lastReleaseDate: string | undefined, now = new Date()): number {
  if (!lastReleaseDate) return 0;
  const d = new Date(lastReleaseDate);
  if (isNaN(d.getTime())) return 0;
  const days = Math.max(0, (now.getTime() - d.getTime()) / 86_400_000);
  return Math.round(Math.max(0, 100 - (days / 365) * 100));
}

/**
 * Community score: log(contributors) / log(1000) scaled to 0–100.
 * A project with 1000+ contributors scores 100.
 * Missing or zero contributors → 0.
 */
export function communityScore(contributors: number | undefined): number {
  if (!contributors || contributors < 1) return 0;
  const score = (Math.log(contributors) / Math.log(1000)) * 100;
  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Security score: +50 if audited (lastAuditDate present), +50 if cloMonitorName present.
 */
export function securityScore(
  lastAuditDate: string | undefined,
  cloMonitorName: string | undefined,
): number {
  let score = 0;
  if (lastAuditDate && lastAuditDate.trim() !== '') score += 50;
  if (cloMonitorName && cloMonitorName.trim() !== '') score += 50;
  return score;
}

// ---------------------------------------------------------------------------
// Grade assignment
// ---------------------------------------------------------------------------

export function scoreToGrade(score: number): HealthGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

// ---------------------------------------------------------------------------
// Composite score
// ---------------------------------------------------------------------------

const WEIGHTS = {
  activity: 0.30,
  velocity: 0.25,
  community: 0.25,
  security: 0.20,
} as const;

/**
 * Compute the composite health score for a SafeProject.
 *
 * @param project  The project to score.
 * @param now      Override "now" for deterministic tests (default: new Date()).
 */
export function computeHealth(project: SafeProject, now = new Date()): ProjectHealth {
  const breakdown = {
    activity: activityScore(project.lastCommitDate, now),
    velocity: velocityScore(project.lastReleaseDate, now),
    community: communityScore(project.contributors),
    security: securityScore(project.lastAuditDate, project.cloMonitorName),
  };

  const raw =
    breakdown.activity  * WEIGHTS.activity  +
    breakdown.velocity  * WEIGHTS.velocity  +
    breakdown.community * WEIGHTS.community +
    breakdown.security  * WEIGHTS.security;

  const score = Math.round(Math.min(100, Math.max(0, raw)));

  return {
    score,
    grade: scoreToGrade(score),
    breakdown,
  };
}

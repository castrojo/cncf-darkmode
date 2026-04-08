// sites/projects/src/lib/heroes.ts
// Site-specific hero selection wrapping @cncf/site-kit's heroSlots generic helper.

import { heroSlots } from '../heroes';
import type { SafeProject } from './project-renderer';

export { heroSlots };

export interface HeroSets {
  everyone:   SafeProject[];
  graduated:  SafeProject[];
  incubating: SafeProject[];
  sandbox:    SafeProject[];
}

/**
 * Selects hero sets for all maturity tabs.
 * everyone: row 1 = 4 graduated, row 2 = 3 incubating + 1 sandbox (8 total)
 */
export function selectHeroSets(projects: SafeProject[]): HeroSets {
  const graduated  = projects.filter(p => p.maturity === 'graduated');
  const incubating = projects.filter(p => p.maturity === 'incubating');
  const sandbox    = projects.filter(p => p.maturity === 'sandbox');

  return {
    // Everyone: 4 graduated + 3 incubating + 1 sandbox = 8 hero slots
    everyone: [
      ...heroSlots(graduated, 4),
      ...heroSlots(incubating, 3),
      ...heroSlots(sandbox, 1),
    ],
    graduated:  heroSlots(graduated, 8),
    incubating: heroSlots(incubating, 8),
    sandbox:    heroSlots(sandbox, 8),
  };
}

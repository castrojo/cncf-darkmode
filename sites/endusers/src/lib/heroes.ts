// sites/endusers/src/lib/heroes.ts
// Site-specific hero selection wrapping @cncf/site-kit's heroSlots generic helper.

import { heroSlots } from '@cncf/site-kit/lib/heroes';
import type { SafeMember } from './member-renderer';

export { heroSlots };

export interface HeroSets {
  everyone:  SafeMember[];
  platinum:  SafeMember[];
  gold:      SafeMember[];
  silver:    SafeMember[];
  academic:  SafeMember[];
}

/**
 * Selects hero sets for all tier tabs.
 * everyone: 2 platinum + 2 gold + 2 silver = 6 slots (showcase layout)
 */
export function selectHeroSets(members: SafeMember[]): HeroSets {
  const platinum = members.filter(m => m.tier === 'Platinum');
  const gold     = members.filter(m => m.tier === 'Gold');
  const silver   = members.filter(m => m.tier === 'Silver');
  const academic = members.filter(m => m.tier === 'Academic' || m.tier === 'Nonprofit');

  return {
    // Everyone: 2 platinum + 2 gold + 2 silver = 6 (showcase layout)
    everyone: [
      ...heroSlots(platinum, 2),
      ...heroSlots(gold, 2),
      ...heroSlots(silver, 2),
    ],
    platinum: heroSlots(platinum, 2),
    gold:     heroSlots(gold, 5),
    silver:   heroSlots(silver, 6),
    academic: heroSlots(academic, 4),
  };
}

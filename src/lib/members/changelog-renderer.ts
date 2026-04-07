import type { SafeMember } from './member-renderer';
import { escapeHtml } from '../search';

export interface MemberEvent {
  id: string;
  type: 'joined' | 'left' | 'tier_changed' | 'updated';
  memberName: string;
  memberSlug: string;
  logoUrl: string;
  tier: string;
  oldTier?: string;
  timestamp: string;
  description: string;
}

const EVENT_COLORS: Record<string, string> = {
  joined:       '#007a4d',
  left:         '#cc0000',
  tier_changed: '#996600',
  updated:      '#0060CC',
};

const EVENT_LABELS: Record<string, string> = {
  joined:       'Joined',
  left:         'Left',
  tier_changed: 'Tier Changed',
  updated:      'Updated',
};

const TIER_COLORS: Record<string, string> = {
  Platinum:             '#E5E4E2',
  Gold:                 '#ffb300',
  Silver:               '#C0C0C0',
  'End User':           '#0060CC',
  'End User Supporter': '#0060CC',
  Academic:             '#7B2FBE',
  Nonprofit:            '#007a4d',
};

function formatRelativeDate(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  } catch {
    return '';
  }
}

function formatFunding(n?: number): string {
  if (!n) return '';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function buildEventBanner(event: MemberEvent): string {
  const color = EVENT_COLORS[event.type] ?? '#57606a';
  const label = EVENT_LABELS[event.type] ?? event.type;
  const timeAgo = event.timestamp ? formatRelativeDate(event.timestamp) : '';
  const tierColor = TIER_COLORS[event.tier] ?? '#57606a';
  const tierTextColor = (['Platinum', 'Silver', 'Gold'].includes(event.tier)) ? '#24292f' : '#fff';
  const tierBadge = `<span style="font-size:0.65rem;font-weight:600;text-transform:uppercase;background:${tierColor};color:${tierTextColor};padding:0.1rem 0.35rem;border-radius:3px">${escapeHtml(event.tier)}</span>`;
  const oldTierNote = event.oldTier
    ? `<span style="font-size:0.75rem;color:var(--color-text-muted)">from ${escapeHtml(event.oldTier)}</span>`
    : '';
  return `<span style="font-size:0.65rem;font-weight:700;text-transform:uppercase;background:${color};color:#fff;padding:0.15rem 0.4rem;border-radius:3px;letter-spacing:0.04em">${escapeHtml(label)}</span>${tierBadge}${oldTierNote}<span style="font-size:0.75rem;color:var(--color-text-muted);margin-left:auto">${escapeHtml(timeAgo)}</span>`;
}

/**
 * Renders a member changelog event card.
 * When member data is provided, renders a rich card with full member details.
 * Falls back to a minimal skeleton when only event data is available.
 */
export function renderChangelogEvent(event: MemberEvent, member?: SafeMember): string {
  const color = EVENT_COLORS[event.type] ?? '#57606a';
  const banner = buildEventBanner(event);
  const name = escapeHtml(event.memberName);
  const logoSrc = escapeHtml(member?.logoUrl ?? event.logoUrl);

  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="${name} logo" width="48" height="48" loading="lazy" style="width:48px;height:48px;object-fit:contain;flex-shrink:0" />`
    : `<div style="width:48px;height:48px;background:${color}22;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:1.25rem;color:${color}">${name[0] ?? '?'}</span></div>`;

  let bodyHtml = `
    <div class="event-banner" style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem">${banner}</div>
    <div style="font-weight:600;font-size:1rem;margin-bottom:0.25rem">${name}</div>`;

  if (member) {
    const desc = member.description ? escapeHtml(member.description) : '';
    if (desc) bodyHtml += `<p style="margin:0 0 0.25rem;font-size:0.875rem;color:var(--color-text-secondary)">${desc}</p>`;

    const location = [
      member.city,
      member.countryFlag ? `${member.country} ${member.countryFlag}` : member.country,
    ].filter(Boolean).join(', ');
    if (location) bodyHtml += `<div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:0.2rem">${escapeHtml(location)}</div>`;

    if (member.industries?.length) {
      bodyHtml += `<div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:0.2rem">${escapeHtml(member.industries.slice(0, 3).join(', '))}</div>`;
    }

    const funding = formatFunding(member.totalFunding);
    if (funding) bodyHtml += `<div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:0.2rem">Funding: ${escapeHtml(funding)}</div>`;

    const links: string[] = [];
    if (member.homepageUrl) links.push(`<a href="${escapeHtml(member.homepageUrl)}" target="_blank" rel="noopener" style="font-size:0.8rem;color:var(--color-accent-emphasis)">Website</a>`);
    if (links.length) bodyHtml += `<div style="display:flex;gap:0.75rem;margin-top:0.25rem">${links.join('')}</div>`;
  } else {
    if (event.description) {
      bodyHtml += `<p style="margin:0;font-size:0.875rem;color:var(--color-text-secondary)">${escapeHtml(event.description)}</p>`;
    }
  }

  return `<article class="member-card member-event-card" style="display:flex;flex-direction:row;gap:1rem;align-items:flex-start;padding:1rem;--card-accent:${color}" data-slug="${escapeHtml(event.memberSlug)}" data-type="${escapeHtml(event.type)}">
  ${logoHtml}
  <div class="letterbox-body" style="flex:1;min-width:0">${bodyHtml}
  </div>
</article>`;
}

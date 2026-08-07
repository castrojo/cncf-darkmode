// person-lightbox.ts — People lightbox renderer and open/close controller.
//
// Architecture mirrors arch-modal.ts (members site):
//  - renderPersonLightboxContent() → pure function, returns HTML string (testable)
//  - openPersonLightbox(person)    → populates <dialog id="person-modal"> and calls showModal()
//  - closePersonLightbox()         → closes the dialog
//  - initPersonLightbox()          → wires close button + backdrop click + Escape
//
// Cross-linking: when projects[] is present, each chip links to the projects page
// (/cncf-darkmode/?project=<slug>-ish) so users can navigate from a person card to
// the corresponding project card.

import {
  esc,
  safeHref,
  CATEGORY_MAP,
  LOGO_PRIORITY,
  PROGRAM_LOGOS,
  type Person,
} from './person-renderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectDetail {
  name: string;
  logoUrl?: string;
  maturity?: string;
  slug?: string;
}

export interface PersonLightboxData extends Person {
  projectDetails?: ProjectDetail[];
}

// ---------------------------------------------------------------------------
// Maturity color helpers (mirrors arch-modal palette)
// ---------------------------------------------------------------------------

const MATURITY_COLORS: Record<string, string> = {
  graduated:  '#00B5D8',
  incubating: '#F6AD55',
  sandbox:    '#8b949e',
};

function maturityColor(maturity: string): string {
  return MATURITY_COLORS[maturity.toLowerCase()] ?? '#8b949e';
}

// ---------------------------------------------------------------------------
// Social icon SVG strings (inline, no external dependency)
// ---------------------------------------------------------------------------

const GH_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`;
const LI_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;
const TW_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
const BSKY_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/></svg>`;
const CERT_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`;
const WEB_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

// ---------------------------------------------------------------------------
// Project chip
// ---------------------------------------------------------------------------

/**
 * Render a single project chip.
 * If a projectsPageBase is supplied, the chip links to the projects page with a
 * `?project=<slug>` query param so users can navigate project ↔ person.
 */
export function renderProjectChip(
  projectName: string,
  detail: ProjectDetail | undefined,
  projectsPageBase: string,
): string {
  const name = esc(projectName);
  const logoUrl = detail?.logoUrl ?? '';
  const maturity = detail?.maturity ?? '';
  const slug = detail?.slug ?? projectName.toLowerCase().replace(/\s+/g, '-');

  const logoHtml = logoUrl
    ? `<img class="plb-project-logo" src="${esc(logoUrl)}" alt="" aria-hidden="true" loading="lazy" onerror="this.style.display='none'" />`
    : `<span class="plb-project-logo plb-project-logo--fallback" aria-hidden="true">${esc((projectName.trim().charAt(0) || '?').toUpperCase())}</span>`;

  const maturityDot = maturity
    ? `<span class="plb-maturity-dot" style="background:${esc(maturityColor(maturity))}" title="${esc(maturity)}"></span>`
    : '';

  const chipHref = projectsPageBase
    ? `${esc(projectsPageBase)}?project=${encodeURIComponent(slug)}`
    : '#';

  return `<a class="plb-project-chip plb-project-chip--${esc(maturity || 'unknown')}"
    href="${chipHref}"
    target="_blank"
    rel="noopener noreferrer"
    title="${name}${maturity ? ' · ' + esc(maturity) : ''}"
  >${logoHtml}${maturityDot}<span class="plb-project-name">${name}</span></a>`;
}

// ---------------------------------------------------------------------------
// Social links row
// ---------------------------------------------------------------------------

export function renderSocialLinks(p: Person): string {
  const links: string[] = [];

  if (p.github) links.push(`<a class="plb-social-link" href="${esc(safeHref(p.github))}" target="_blank" rel="noopener noreferrer" aria-label="GitHub profile for ${esc(p.name)}">${GH_ICON}</a>`);
  if (p.linkedin) links.push(`<a class="plb-social-link" href="${esc(safeHref(p.linkedin))}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile for ${esc(p.name)}">${LI_ICON}</a>`);
  if (p.twitter) links.push(`<a class="plb-social-link" href="${esc(safeHref(p.twitter))}" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter profile for ${esc(p.name)}">${TW_ICON}</a>`);
  if (p.bluesky) links.push(`<a class="plb-social-link" href="${esc(safeHref(p.bluesky))}" target="_blank" rel="noopener noreferrer" aria-label="Bluesky profile for ${esc(p.name)}">${BSKY_ICON}</a>`);
  if (p.website) links.push(`<a class="plb-social-link" href="${esc(safeHref(p.website))}" target="_blank" rel="noopener noreferrer" aria-label="Personal website for ${esc(p.name)}">${WEB_ICON}</a>`);
  if (p.certDirectory) links.push(`<a class="plb-social-link" href="${esc(safeHref(p.certDirectory))}" target="_blank" rel="noopener noreferrer" aria-label="Certificate directory for ${esc(p.name)}">${CERT_ICON}</a>`);

  return links.length ? `<div class="plb-social-links" role="list" aria-label="Social links">${links.join('')}</div>` : '';
}

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------

export function renderStatsRow(p: Person): string {
  const chips: string[] = [];
  const currentYear = new Date().getFullYear();

  if ((p.yearsContributing ?? 0) > 0) {
    const since = currentYear - p.yearsContributing!;
    chips.push(`<span class="plb-stat-chip" aria-label="Contributing since ${since}">
      <span class="plb-stat-icon" aria-hidden="true">🗓️</span>
      <span class="plb-stat-val">Since ${since}</span>
      <span class="plb-stat-label">(${p.yearsContributing}y)</span>
    </span>`);
  }
  if ((p.contributions ?? 0) > 0) {
    chips.push(`<span class="plb-stat-chip" aria-label="${p.contributions!.toLocaleString()} GitHub contributions last year">
      <span class="plb-stat-icon" aria-hidden="true">⭐</span>
      <span class="plb-stat-val">${p.contributions!.toLocaleString()}</span>
      <span class="plb-stat-label">contributions</span>
    </span>`);
  }
  if ((p.publicRepos ?? 0) > 0) {
    chips.push(`<span class="plb-stat-chip" aria-label="${p.publicRepos} public repos">
      <span class="plb-stat-icon" aria-hidden="true">📦</span>
      <span class="plb-stat-val">${esc(String(p.publicRepos))}</span>
      <span class="plb-stat-label">repos</span>
    </span>`);
  }

  return chips.length ? `<div class="plb-stats-row">${chips.join('')}</div>` : '';
}

// ---------------------------------------------------------------------------
// Main content renderer — pure function (no DOM side effects)
// ---------------------------------------------------------------------------

/**
 * Returns the inner HTML for the person lightbox.
 *
 * @param person           - the Person data object
 * @param projectDetails   - optional array of enriched project data (logo, maturity, slug)
 * @param projectsPageBase - base path for cross-links to the projects page
 *                           e.g. "/cncf-darkmode/" — empty string disables cross-links
 */
export function renderPersonLightboxContent(
  person: Person,
  projectDetails: ProjectDetail[] = [],
  projectsPageBase: string = '',
): string {
  const cats = person.category ?? [];
  const logoKey = person.primaryBadge
    ? (PROGRAM_LOGOS[person.primaryBadge] ? person.primaryBadge : undefined)
    : LOGO_PRIORITY.find(c => cats.includes(c));
  const accentKey = person.primaryBadge || LOGO_PRIORITY.find(c => cats.includes(c)) || cats[0] || '';
  const catInfo = CATEGORY_MAP[accentKey] ?? CATEGORY_MAP[cats[0] ?? ''] ?? { name: accentKey, color: '#888' };
  const programLogo = logoKey ? PROGRAM_LOGOS[logoKey] : '';

  const avatarSrc = person.avatarUrl || person.imageUrl || '';
  const profileUrl = person.github || (person.handle ? `https://github.com/${person.handle}` : person.linkedin || '#');

  const avatarHtml = avatarSrc
    ? `<img class="plb-avatar" src="${esc(avatarSrc)}" alt="${esc(person.name)}" width="80" height="80" loading="eager" />`
    : `<div class="plb-avatar plb-avatar--placeholder" aria-hidden="true">${esc(person.name.charAt(0).toUpperCase())}</div>`;

  const catBadges = cats.map(cat => {
    const ci = CATEGORY_MAP[cat] ?? catInfo;
    return `<span class="plb-badge" style="background:${ci.color}22;color:${ci.color};border:1px solid ${ci.color}44">${esc(ci.name ?? cat)}</span>`;
  }).join('');

  const programLogoHtml = programLogo
    ? `<img class="plb-program-logo" src="${esc(programLogo)}" alt="${esc(logoKey ?? '')}" loading="lazy" />`
    : '';

  const bioHtml = person.bio
    ? `<p class="plb-bio">${esc(person.bio)}</p>`
    : '';

  const locationHtml = person.location
    ? `<span class="plb-location">${person.countryFlag ? esc(person.countryFlag) + ' ' : ''}${esc(person.location)}</span>`
    : '';

  const companyHtml = person.company
    ? (person.companyLandscapeUrl
      ? `<a class="plb-company" href="${esc(safeHref(person.companyLandscapeUrl))}" target="_blank" rel="noopener noreferrer">${esc(person.company)}</a>`
      : `<span class="plb-company">${esc(person.company)}</span>`)
    : '';

  const socialLinksHtml = renderSocialLinks(person);
  const statsHtml = renderStatsRow(person);

  // Build project detail lookup map
  const detailMap = new Map(projectDetails.map(d => [d.name, d]));

  const projectsHtml = (person.projects?.length ?? 0) > 0
    ? `<section class="plb-section" aria-label="Projects">
        <h3 class="plb-section-heading">CNCF Projects</h3>
        <div class="plb-projects-grid" role="list">
          ${person.projects!.map(name => renderProjectChip(name, detailMap.get(name), projectsPageBase)).join('')}
        </div>
      </section>`
    : '';

  return `
    <div class="plb-header" style="--plb-accent:${esc(catInfo.color)}">
      <div class="plb-accent-bar"></div>
      <div class="plb-header-inner">
        <a class="plb-avatar-link" href="${esc(safeHref(profileUrl))}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(person.name)}'s profile">
          ${avatarHtml}
        </a>
        <div class="plb-identity">
          <h2 class="plb-name" id="person-modal-title">
            <a href="${esc(safeHref(profileUrl))}" target="_blank" rel="noopener noreferrer">${esc(person.name)}</a>
          </h2>
          ${person.handle ? `<a class="plb-handle" href="${esc(safeHref(profileUrl))}" target="_blank" rel="noopener noreferrer">@${esc(person.handle)}</a>` : ''}
          ${person.pronouns ? `<span class="plb-pronouns">(${esc(person.pronouns)})</span>` : ''}
          <div class="plb-meta-row">
            ${companyHtml}
            ${locationHtml}
          </div>
          <div class="plb-badges">${catBadges}</div>
        </div>
        ${programLogoHtml}
      </div>
    </div>

    <div class="plb-body">
      ${bioHtml}
      ${statsHtml}
      ${socialLinksHtml}
      ${projectsHtml}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Client-side open/close (browser only — tree-shaken from SSR builds)
// ---------------------------------------------------------------------------

export function openPersonLightbox(
  person: Person,
  projectDetails: ProjectDetail[] = [],
  projectsPageBase: string = '',
): void {
  const dialog = document.getElementById('person-modal') as HTMLDialogElement | null;
  const content = document.getElementById('person-modal-content');
  if (!dialog || !content) return;

  content.innerHTML = renderPersonLightboxContent(person, projectDetails, projectsPageBase);

  dialog.showModal();

  // Scroll inner content to top on re-open
  const inner = dialog.querySelector<HTMLElement>('.plb-dialog');
  if (inner) inner.scrollTop = 0;
}

export function closePersonLightbox(): void {
  const dialog = document.getElementById('person-modal') as HTMLDialogElement | null;
  dialog?.close();
}

export function initPersonLightbox(): void {
  const dialog = document.getElementById('person-modal') as HTMLDialogElement | null;
  if (!dialog) return;

  // Close button
  document.getElementById('person-modal-close')?.addEventListener('click', closePersonLightbox);

  // Backdrop click: <dialog> fills viewport; a direct click on it (not the inner div) is the backdrop
  dialog.addEventListener('click', (e: MouseEvent) => {
    if (e.target === dialog) closePersonLightbox();
  });

  // Escape is handled natively by <dialog> — no extra listener needed
}

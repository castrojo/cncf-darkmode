export interface SafeArchitecture {
  slug: string;
  title: string;
  orgName: string;
  orgTeam?: string;
  orgUrl?: string;
  orgLogoUrl: string;
  orgDescription?: string;
  orgSize?: string;
  userSize?: string;
  industries?: string[];
  tags?: string[];
  refArchTypes?: string[];
  archUrl: string;
  submittedAt?: string;
  projects?: ArchProject[];
  bodyHTML?: string;      // pre-rendered HTML body from Go pipeline
}

export interface ArchProject {
  name: string;
  logoUrl?: string;
  maturity?: string; // "graduated" | "incubating" | "sandbox" | ""
  usingSince?: string;
  description?: string;  // prose description extracted from card body
}

// Maturity accent colors for project ribbon chips.
const MATURITY_COLORS: Record<string, string> = {
  graduated:  '#00B5D8', // CNCF teal
  incubating: '#F6AD55', // CNCF amber
  sandbox:    '#8b949e', // muted gray
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderProjectChip(p: ArchProject): string {
  const color = p.maturity ? (MATURITY_COLORS[p.maturity] ?? '') : '';
  const dot = color
    ? `<span class="arch-maturity-dot" style="background:${color}" title="${escapeHtml(p.maturity ?? '')}"></span>`
    : '';
  const logo = p.logoUrl
    ? `<img class="arch-project-logo" src="${escapeHtml(p.logoUrl)}" alt="${escapeHtml(p.name)} logo" width="18" height="18" loading="lazy" />`
    : '';
  return `<span class="arch-project-chip arch-project-chip--${escapeHtml(p.maturity ?? 'unknown')}" title="${escapeHtml(p.name)}${p.usingSince ? ' · since ' + escapeHtml(p.usingSince) : ''}">${logo}${dot}<span class="arch-project-name">${escapeHtml(p.name)}</span></span>`;
}

function renderProjectRibbon(projects: ArchProject[]): string {
  if (!projects.length) return '';

  const chips = projects.map(renderProjectChip).join('');

  return `<div class="arch-ribbon">
      <div class="arch-ribbon-label">CNCF Projects Used</div>
      <div class="arch-ribbon-chips">${chips}</div>
    </div>`;
}

/** Renders a single Reference Architecture as a hero card. */
export function renderArchCard(a: SafeArchitecture): string {
  const orgName = escapeHtml(a.orgName);
  const title = escapeHtml(a.title);
  const description = a.orgDescription ? escapeHtml(a.orgDescription) : '';

  const logoHtml = a.orgLogoUrl
    ? `<img class="arch-org-logo" src="${escapeHtml(a.orgLogoUrl)}" alt="${orgName} logo" loading="lazy" />`
    : '';

  const meta: string[] = [];
  if (a.orgTeam) meta.push(`<span class="arch-meta-team">${escapeHtml(a.orgTeam)}</span>`);
  if (a.refArchTypes?.length) {
    const types = a.refArchTypes.map(t => `<span class="arch-reftype">${escapeHtml(t)}</span>`).join('');
    meta.push(`<div class="arch-reftypes">${types}</div>`);
  }
  if (a.tags?.length) {
    // Tags rendered as outlined gray pills, visually distinct from teal reftype chips.
    const tagChips = a.tags.map(t => `<span class="arch-tag">${escapeHtml(t)}</span>`).join('');
    meta.push(`<div class="arch-tags">${tagChips}</div>`);
  }
  if (a.industries?.length) {
    meta.push(`<div class="arch-industries">${escapeHtml(a.industries.slice(0, 3).join(' · '))}</div>`);
  }

  const sizes: string[] = [];
  if (a.orgSize) sizes.push(`${escapeHtml(a.orgSize)} org`);
  if (a.userSize) sizes.push(`${escapeHtml(a.userSize)} users`);
  const sizesHtml = sizes.length
    ? `<div class="arch-sizes">${sizes.join(' · ')}</div>`
    : '';

  // submittedAt rendered as a <time> element below the org metadata.
  // Note: "Read Architecture" link removed from card — it now lives in the modal footer
  // (arch-modal.ts wires arch-modal-ext-link to arch.archUrl on openArchModal).
  const submittedHtml = a.submittedAt
    ? `<time class="arch-submitted" datetime="${escapeHtml(a.submittedAt)}">Submitted ${escapeHtml(a.submittedAt)}</time>`
    : '';

  // Data attributes used by client-side search and filter (arch-search.ts + applyFilters).
  const searchText = [
    a.orgName, a.title, a.orgDescription ?? '',
    ...(a.tags ?? []), ...(a.industries ?? []), ...(a.refArchTypes ?? []),
  ].filter(Boolean).join(' ');

  const ribbon = renderProjectRibbon(a.projects ?? []);

  return `<article
    class="arch-card"
    role="button"
    tabindex="0"
    data-slug="${escapeHtml(a.slug)}"
    data-search-text="${escapeHtml(searchText)}"
    data-industries="${escapeHtml((a.industries ?? []).join(','))}"
    data-reftypes="${escapeHtml((a.refArchTypes ?? []).join(','))}"
    data-tags="${escapeHtml((a.tags ?? []).join(','))}"
  >
    <div class="arch-accent-bar"></div>
    <div class="arch-logo-box">${logoHtml}</div>
    <div class="arch-body">
      <div class="arch-badge">🏆 Reference Architecture</div>
      <h3 class="arch-org-name">${orgName}</h3>
      <p class="arch-title">${title}</p>
      ${description ? `<p class="arch-description">${description}</p>` : ''}
      ${meta.length ? `<div class="arch-meta">${meta.join('')}</div>` : ''}
      ${sizesHtml}
      ${submittedHtml}
    </div>
    ${ribbon}
  </article>`;
}

/** Renders all architectures into a grid string. */
export function renderArchCards(architectures: SafeArchitecture[]): string {
  return architectures.map(renderArchCard).join('\n');
}

/** Renders the modal content for a given arch entry. */
export function renderArchModalContent(arch: SafeArchitecture): string {
  const projectsHTML = arch.projects?.map(p => `
    <div class="arch-modal-project">
      <img class="arch-modal-project-logo" src="${p.logoUrl ?? ''}" alt="${escapeHtml(p.name)} logo" loading="lazy" />
      <div class="arch-modal-project-info">
        <span class="arch-modal-project-name">${escapeHtml(p.name)}</span>
        ${p.maturity ? `<span class="arch-modal-maturity arch-modal-maturity--${escapeHtml(p.maturity.toLowerCase())}">${escapeHtml(p.maturity)}</span>` : ''}
        ${p.usingSince ? `<span class="arch-modal-using-since">Since ${escapeHtml(p.usingSince)}</span>` : ''}
        ${p.description ? `<p class="arch-modal-project-desc">${escapeHtml(p.description)}</p>` : ''}
      </div>
    </div>
  `).join('') ?? '';

  const refType = arch.refArchTypes?.join(', ') ?? '';

  return `
    <div class="arch-modal-header">
      <img class="arch-modal-company-logo" src="${escapeHtml(arch.orgLogoUrl)}" alt="${escapeHtml(arch.orgName)} logo" />
      <div class="arch-modal-meta">
        <h2 class="arch-modal-title">${escapeHtml(arch.orgName)}</h2>
        ${arch.submittedAt ? `<span class="arch-modal-date">Submitted ${escapeHtml(arch.submittedAt)}</span>` : ''}
        ${refType ? `<span class="arch-modal-ref-type">${escapeHtml(refType)}</span>` : ''}
      </div>
    </div>
    ${projectsHTML ? `<div class="arch-modal-projects"><h3 class="arch-modal-projects-heading">CNCF Projects Used</h3>${projectsHTML}</div>` : ''}
    ${arch.bodyHTML ? `<div class="arch-modal-body">${arch.bodyHTML}</div>` : ''}
  `;
}

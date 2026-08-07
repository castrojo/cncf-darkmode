/**
 * project-lightbox.ts
 *
 * Pure TypeScript renderer + runtime controller for the project detail lightbox.
 * Returns an HTML string safe for direct innerHTML assignment.
 *
 * CSS namespace: plb2-*   (avoids collision with people plb-* namespace)
 *
 * Exports
 * ───────
 *  renderProjectLightboxContent(project, maintainers?, now?)  – pure renderer (testable)
 *  openProjectLightbox(slug, base?)                           – lazy fetch + showModal
 *  closeProjectLightbox()                                     – close dialog
 *  initProjectLightbox()                                      – wire close/backdrop/Escape
 */

import type { SafeProject } from './project-renderer';
import { computeHealth } from './project-health';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Maintainer {
  name: string;
  handle?: string;
  avatarUrl?: string;
  projects?: string[];
  projectDetails?: Array<{ name: string; maturity?: string }>;
  company?: string;
  location?: string;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Return a safe href attribute value: only allow http/https/mailto schemes.
 * Anything else is replaced with '#'.
 */
export function safeHref(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:') {
      return escapeHtml(url);
    }
  } catch {
    // fall through
  }
  return '#';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return escapeHtml(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

// ---------------------------------------------------------------------------
// Maturity badge colours
// ---------------------------------------------------------------------------

const MATURITY_COLORS: Record<string, string> = {
  graduated:  '#996600',
  incubating: '#0060CC',
  sandbox:    '#57606a',
  archived:   '#6b7280',
};

// ---------------------------------------------------------------------------
// Grade badge colours
// ---------------------------------------------------------------------------

const GRADE_COLORS: Record<string, string> = {
  A: '#22863a',
  B: '#0366d6',
  C: '#e36209',
  D: '#cb2431',
};

// ---------------------------------------------------------------------------
// Section builders (all pure — no side effects)
// ---------------------------------------------------------------------------

function renderHeader(p: SafeProject): string {
  const name = escapeHtml(p.name);
  const maturity = p.maturity ?? 'sandbox';
  const maturityColor = MATURITY_COLORS[maturity] ?? '#57606a';
  const maturityLabel = maturity.charAt(0).toUpperCase() + maturity.slice(1);
  const desc = p.description || p.summary || '';
  const descHtml = desc
    ? `<p class="plb2-description">${escapeHtml(desc)}</p>`
    : '';

  const logoHtml = p.logoUrl
    ? `<img class="plb2-logo" src="${escapeHtml(p.logoUrl)}" alt="${name} logo" width="80" height="80" loading="lazy" />`
    : `<div class="plb2-logo-placeholder" style="--plb2-color:${maturityColor}">${name.charAt(0)}</div>`;

  const categoryMeta = p.category
    ? `<span class="plb2-category">${escapeHtml(p.category)}${p.subcategory ? ` › ${escapeHtml(p.subcategory)}` : ''}</span>`
    : '';

  return `<div class="plb2-header">
  <div class="plb2-logo-wrap">${logoHtml}</div>
  <div class="plb2-header-info">
    <div class="plb2-title-row">
      <h2 class="plb2-title" id="project-modal-title">${name}</h2>
      <span class="plb2-maturity-badge" style="--plb2-color:${maturityColor}">${maturityLabel}</span>
    </div>
    <div class="plb2-meta-row">${categoryMeta}</div>
    ${descHtml}
  </div>
</div>`;
}

function renderHealthBar(p: SafeProject, now: Date): string {
  const health = computeHealth(p, now);
  const gradeColor = GRADE_COLORS[health.grade] ?? '#586069';

  const auditPart = p.lastAuditDate
    ? `<span class="plb2-health-item"><span class="plb2-health-label">Last audit:</span> ${escapeHtml(formatDate(p.lastAuditDate))}${p.lastAuditVendor ? ` (${escapeHtml(p.lastAuditVendor)})` : ''}</span>`
    : '';

  const cloLink = p.cloMonitorName
    ? `<a class="plb2-health-link" href="https://clomonitor.io/projects/cncf/${escapeHtml(p.cloMonitorName)}" target="_blank" rel="noopener noreferrer">CLO Monitor</a>`
    : '';

  return `<div class="plb2-health-bar">
  <span class="plb2-health-title">Health</span>
  <span class="plb2-health-score-badge" style="background:${gradeColor};color:#fff;font-size:0.85rem;font-weight:700;padding:0.15rem 0.45rem;border-radius:4px">${health.score} / 100 ${health.grade}</span>
  <span class="plb2-health-item" title="Activity">⚡ ${health.breakdown.activity}</span>
  <span class="plb2-health-item" title="Velocity">🚀 ${health.breakdown.velocity}</span>
  <span class="plb2-health-item" title="Community">👥 ${health.breakdown.community}</span>
  <span class="plb2-health-item" title="Security">🔒 ${health.breakdown.security}</span>
  ${auditPart}
  ${cloLink}
</div>`;
}

function renderStatsRow(p: SafeProject): string {
  const items: string[] = [];
  if (p.stars !== undefined && p.stars > 0)
    items.push(`<div class="plb2-stat"><span class="plb2-stat-icon">⭐</span><span class="plb2-stat-val">${formatNumber(p.stars)}</span><span class="plb2-stat-label">Stars</span></div>`);
  if (p.forks !== undefined && p.forks > 0)
    items.push(`<div class="plb2-stat"><span class="plb2-stat-icon">🍴</span><span class="plb2-stat-val">${formatNumber(p.forks)}</span><span class="plb2-stat-label">Forks</span></div>`);
  if (p.contributors !== undefined && p.contributors > 0)
    items.push(`<div class="plb2-stat"><span class="plb2-stat-icon">👥</span><span class="plb2-stat-val">${formatNumber(p.contributors)}</span><span class="plb2-stat-label">Contributors</span></div>`);
  if (p.lastCommitDate)
    items.push(`<div class="plb2-stat"><span class="plb2-stat-icon">📅</span><span class="plb2-stat-val" style="font-size:0.75rem">${escapeHtml(formatDate(p.lastCommitDate))}</span><span class="plb2-stat-label">Last Commit</span></div>`);
  if (p.primaryLanguage)
    items.push(`<div class="plb2-stat"><span class="plb2-stat-icon">💻</span><span class="plb2-stat-val" style="font-size:0.8125rem">${escapeHtml(p.primaryLanguage)}</span><span class="plb2-stat-label">Language</span></div>`);
  if (p.license)
    items.push(`<div class="plb2-stat"><span class="plb2-stat-icon">📄</span><span class="plb2-stat-val" style="font-size:0.75rem">${escapeHtml(p.license)}</span><span class="plb2-stat-label">License</span></div>`);
  if (items.length === 0) return '';
  return `<div class="plb2-stats-row">${items.join('')}</div>`;
}

function renderSecurityLinks(p: SafeProject): string {
  const links: string[] = [];
  if (p.repoUrl) {
    const ghPath = p.repoUrl.replace(/^https?:\/\/github\.com\//, '');
    links.push(`<a class="plb2-security-link" href="https://scorecard.dev/viewer/?uri=github.com/${escapeHtml(ghPath)}" target="_blank" rel="noopener noreferrer">🔐 OpenSSF Scorecard</a>`);
  }
  if (p.cloMonitorName) {
    links.push(`<a class="plb2-security-link" href="https://clomonitor.io/projects/cncf/${escapeHtml(p.cloMonitorName)}" target="_blank" rel="noopener noreferrer">🛡️ CLO Monitor</a>`);
  }
  if (links.length === 0) return '';
  return `<div class="plb2-security-links">
  <div class="plb2-section-label">Security</div>
  <div class="plb2-link-chips">${links.join('')}</div>
</div>`;
}

function renderContributorMinicards(p: SafeProject, maintainers: Maintainer[]): string {
  // Cross-ref by project name (case-insensitive)
  const projectName = p.name.toLowerCase();
  const matched = maintainers.filter(m => {
    if (m.projects?.some(proj => proj.toLowerCase() === projectName)) return true;
    if (m.projectDetails?.some(pd => pd.name.toLowerCase() === projectName)) return true;
    return false;
  });

  const shown = matched.slice(0, 6);

  if (shown.length === 0) {
    return `<div class="plb2-contributors">
  <div class="plb2-section-label">Maintainers</div>
  <p class="plb2-no-maintainers">No maintainers listed</p>
</div>`;
  }

  const cards = shown.map(m => {
    const name = escapeHtml(m.name);
    const avatar = m.avatarUrl
      ? `<img class="plb2-minicard-avatar" src="${escapeHtml(m.avatarUrl)}" alt="${name}" width="36" height="36" loading="lazy" />`
      : `<div class="plb2-minicard-avatar-placeholder">${name.charAt(0)}</div>`;
    const handleHref = m.handle
      ? `href="https://github.com/${escapeHtml(m.handle)}" target="_blank" rel="noopener noreferrer"`
      : '';
    const handleText = m.handle ? `<span class="plb2-minicard-handle">@${escapeHtml(m.handle)}</span>` : '';
    const tag = m.handle ? 'a' : 'div';
    return `<${tag} class="plb2-minicard" ${handleHref}>
  ${avatar}
  <div class="plb2-minicard-info">
    <span class="plb2-minicard-name">${name}</span>
    ${handleText}
  </div>
</${tag}>`;
  }).join('');

  return `<div class="plb2-contributors">
  <div class="plb2-section-label">Maintainers (${shown.length}${matched.length > 6 ? ` of ${matched.length}` : ''})</div>
  <div class="plb2-minicards">${cards}</div>
</div>`;
}

function renderEndUsers(p: SafeProject): string {
  const slug = escapeHtml(p.cloMonitorName || p.slug || '');
  const endUsersHref = `https://www.cncf.io/enduser/`;
  return `<div class="plb2-endusers">
  <div class="plb2-section-label">End Users</div>
  <a class="plb2-endusers-link" href="${endUsersHref}" target="_blank" rel="noopener noreferrer">
    🏢 CNCF End Users${slug ? ` using ${escapeHtml(p.name)}` : ''}
  </a>
</div>`;
}

function renderTopics(p: SafeProject): string {
  if (!p.topics || p.topics.length === 0) return '';
  const chips = p.topics.map(t =>
    `<span class="plb2-topic-chip">${escapeHtml(t)}</span>`
  ).join('');
  return `<div class="plb2-topics">
  <div class="plb2-section-label">Topics</div>
  <div class="plb2-topic-chips">${chips}</div>
</div>`;
}

function renderExternalLinks(p: SafeProject): string {
  const links: string[] = [];
  if (p.repoUrl)      links.push(`<a class="plb2-ext-link" href="${safeHref(p.repoUrl)}" target="_blank" rel="noopener noreferrer">🐙 GitHub</a>`);
  if (p.homepageUrl)  links.push(`<a class="plb2-ext-link" href="${safeHref(p.homepageUrl)}" target="_blank" rel="noopener noreferrer">🌐 Website</a>`);
  if (p.devStatsUrl)  links.push(`<a class="plb2-ext-link" href="${safeHref(p.devStatsUrl)}" target="_blank" rel="noopener noreferrer">📊 DevStats</a>`);
  if (p.blogUrl)      links.push(`<a class="plb2-ext-link" href="${safeHref(p.blogUrl)}" target="_blank" rel="noopener noreferrer">📝 Blog</a>`);
  if (p.twitterUrl)   links.push(`<a class="plb2-ext-link" href="${safeHref(p.twitterUrl)}" target="_blank" rel="noopener noreferrer">🐦 Twitter</a>`);
  if (p.slackUrl)     links.push(`<a class="plb2-ext-link" href="${safeHref(p.slackUrl)}" target="_blank" rel="noopener noreferrer">💬 Slack</a>`);
  if (p.lfxSlug)      links.push(`<a class="plb2-ext-link" href="https://insights.lfx.linuxfoundation.org/foundation/cncf/overview/github?project=${escapeHtml(p.lfxSlug)}" target="_blank" rel="noopener noreferrer">📈 LFX Insights</a>`);
  if (links.length === 0) return '';
  return `<div class="plb2-external-links">
  <div class="plb2-section-label">Links</div>
  <div class="plb2-link-chips">${links.join('')}</div>
</div>`;
}

// ---------------------------------------------------------------------------
// Main renderer export (pure — testable without DOM)
// ---------------------------------------------------------------------------

/**
 * Render the full HTML content for a project lightbox panel.
 *
 * @param project     The project to render.
 * @param maintainers Maintainers array from maintainers.json (cross-ref by project name).
 * @param now         Override "now" for deterministic health-score tests.
 * @returns           Safe HTML string for innerHTML assignment.
 */
export function renderProjectLightboxContent(
  project: SafeProject,
  maintainers: Maintainer[] = [],
  now = new Date(),
): string {
  return `<div class="plb2-content" data-slug="${escapeHtml(project.slug)}">
  ${renderHeader(project)}
  ${renderHealthBar(project, now)}
  ${renderStatsRow(project)}
  ${renderSecurityLinks(project)}
  ${renderContributorMinicards(project, maintainers)}
  ${renderEndUsers(project)}
  ${renderTopics(project)}
  ${renderExternalLinks(project)}
</div>`;
}

// ---------------------------------------------------------------------------
// Runtime: lazy fetch + dialog controller
// (browser-only — not called during Vitest)
// ---------------------------------------------------------------------------

let _projectsCache: SafeProject[] | null = null;
let _maintainersCache: Maintainer[] | null = null;

async function fetchProjects(base: string): Promise<SafeProject[]> {
  if (_projectsCache) return _projectsCache;
  const res = await fetch(`${base}/data/projects/projects.json`);
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
  _projectsCache = (await res.json()) as SafeProject[];
  return _projectsCache;
}

async function fetchMaintainers(base: string): Promise<Maintainer[]> {
  if (_maintainersCache) return _maintainersCache;
  try {
    const res = await fetch(`${base}/data/people/maintainers.json`);
    if (!res.ok) return [];
    _maintainersCache = (await res.json()) as Maintainer[];
    return _maintainersCache;
  } catch {
    return [];
  }
}

function getDialog(): HTMLDialogElement | null {
  return document.getElementById('project-modal') as HTMLDialogElement | null;
}

function getContent(): HTMLElement | null {
  return document.getElementById('project-modal-content');
}

/**
 * Close the project lightbox dialog.
 */
export function closeProjectLightbox(): void {
  getDialog()?.close();
}

/**
 * Open the project lightbox for the given slug.
 * Lazily fetches projects.json and maintainers.json on first call.
 */
export async function openProjectLightbox(slug: string, base = ''): Promise<void> {
  const dialog = getDialog();
  const content = getContent();
  if (!dialog || !content) return;

  // Show loading state immediately
  content.innerHTML = `<div class="plb2-loading" aria-live="polite" aria-label="Loading project details">
  <span class="plb2-loading-spinner" aria-hidden="true">⏳</span>
  <span>Loading…</span>
</div>`;
  dialog.showModal();

  try {
    const [projects, maintainers] = await Promise.all([
      fetchProjects(base),
      fetchMaintainers(base),
    ]);

    const project = projects.find(p => p.slug === slug);
    if (!project) {
      content.innerHTML = `<p class="plb2-error">Project "${escapeHtml(slug)}" not found.</p>`;
      return;
    }

    content.innerHTML = renderProjectLightboxContent(project, maintainers);
  } catch (err) {
    content.innerHTML = `<p class="plb2-error">Failed to load project data. Please try again.</p>`;
    console.error('[project-lightbox] fetch error:', err);
  }
}

/**
 * Wire up dialog close button, backdrop click, and Escape key.
 * Call once on page load.
 */
export function initProjectLightbox(): void {
  const dialog = getDialog();
  if (!dialog) return;

  // Close button
  document.getElementById('project-modal-close')?.addEventListener('click', () => {
    closeProjectLightbox();
  });

  // Backdrop click: the dialog element itself is the backdrop in native <dialog>.
  // A click on the backdrop (but not the content box) has target === dialog.
  dialog.addEventListener('click', (e: MouseEvent) => {
    if (e.target === dialog) {
      closeProjectLightbox();
    }
  });

  // Escape key is handled natively by <dialog> — no extra wiring needed.
  // We add a listener purely to allow tests / external code to hook in.
  dialog.addEventListener('close', () => {
    // Reset content after close animation
    const content = getContent();
    if (content) content.innerHTML = '';
  });
}

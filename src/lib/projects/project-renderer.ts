export interface SafeProject {
  name: string;
  slug: string;
  description?: string;
  homepageUrl?: string;
  repoUrl?: string;
  logoUrl: string;
  maturity: string;
  category: string;
  subcategory: string;
  twitterUrl?: string;
  acceptedDate?: string;
  incubatingDate?: string;
  graduatedDate?: string;
  archivedDate?: string;
  devStatsUrl?: string;
  blogUrl?: string;
  slackUrl?: string;
  stars?: number;
  forks?: number;
  summary?: string;
  firstCommitDate?: string;
  lfxSlug?: string;
  cloMonitorName?: string;
  artworkUrl?: string;
  contributors?: number;
  lastCommitDate?: string;
  lastReleaseDate?: string;
  license?: string;
  primaryLanguage?: string;
  topics?: string[];
  lastAuditDate?: string;
  lastAuditVendor?: string;
  updatedAt: string;
}

const MATURITY_COLORS: Record<string, string> = {
  graduated: '#FFB300',
  incubating: '#0086FF',
  sandbox: '#8b949e',
  archived: '#6b7280',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatAge(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const years = Math.floor(days / 365);
  if (years >= 1) return `${years} yr`;
  return `${Math.floor(days / 30)} mo`;
}

export function renderCard(p: SafeProject, eventBanner?: string): string {
  const color = MATURITY_COLORS[p.maturity] ?? '#8b949e';
  const label = p.maturity.charAt(0).toUpperCase() + p.maturity.slice(1);
  const name = escapeHtml(p.name);
  const rawDesc = p.description && p.description.length >= 80 ? p.description : (p.summary || p.description || '');
  const desc = rawDesc ? escapeHtml(rawDesc) : '';

  function escHtml(s: string): string { return escapeHtml(s); }

  const statsHtml = (p.stars || p.forks || p.contributors) ? `<div class="card-stats" style="display:flex;gap:1rem;font-size:0.8125rem;color:var(--color-text-secondary);margin-bottom:0.25rem">${
    p.stars ? `<span class="stat-item" style="display:inline-flex;align-items:center;gap:0.25rem" title="GitHub Stars"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg> ${formatNumber(p.stars)}</span>` : ''
  }${
    p.forks ? `<span class="stat-item" style="display:inline-flex;align-items:center;gap:0.25rem" title="Forks"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm0 2.122a2.25 2.25 0 1 0-1.5 0v.878A2.25 2.25 0 0 0 5.75 8.5h1.5v2.128a2.251 2.251 0 1 0 1.5 0V8.5h1.5a2.25 2.25 0 0 0 2.25-2.25v-.878a2.25 2.25 0 1 0-1.5 0v.878a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 6.25v-.878z"/></svg> ${formatNumber(p.forks)}</span>` : ''
  }${
    p.contributors ? `<span class="stat-item" style="display:inline-flex;align-items:center;gap:0.25rem" title="Contributors"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4.001 4.001 0 0 0-6.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.4.974.75.75 0 0 1-.974-.4 3.51 3.51 0 0 0-2.522-2.372.75.75 0 0 1-.22-1.228 1.5 1.5 0 1 0-1.114-2.496.75.75 0 0 1-.559-1.394A3 3 0 0 1 11 4Z"/></svg> ${formatNumber(p.contributors)}</span>` : ''
  }</div>` : '';

  const tagsHtml = (p.primaryLanguage || p.license) ? `<div class="card-tags" style="display:flex;gap:0.375rem;flex-wrap:wrap;margin:0.25rem 0">${
    p.primaryLanguage ? `<span class="tag tag-language">${escHtml(p.primaryLanguage)}</span>` : ''
  }${
    p.license ? `<span class="tag tag-license">${escHtml(p.license)}</span>` : ''
  }</div>` : '';

  const MAX_TOPICS = 5;
  const shownTopics = p.topics?.slice(0, MAX_TOPICS) ?? [];
  const topicOverflow = (p.topics?.length ?? 0) - shownTopics.length;
  const topicsHtml = shownTopics.length ? `<div class="card-topics" style="display:flex;gap:0.25rem;flex-wrap:wrap;margin:0.25rem 0">${shownTopics.map(t => `<span class="topic-tag">${escHtml(t)}</span>`).join('')}${topicOverflow > 0 ? `<span class="topic-overflow">+${topicOverflow}</span>` : ''}</div>` : '';

  const auditHtml = p.lastAuditDate ? `<span class="audit-badge" title="Last audit: ${escHtml(p.lastAuditDate)}${p.lastAuditVendor ? ' by ' + escHtml(p.lastAuditVendor) : ''}">Audited</span>` : '';

  const commitHtml = p.lastCommitDate ? `<span class="activity-item" style="color:var(--color-text-muted);font-size:0.8rem">${formatRelativeDate(p.lastCommitDate)}</span>` : '';
  const releaseHtml = p.lastReleaseDate ? `<span class="activity-item release-item" style="color:var(--color-text-muted);font-size:0.8rem">Released ${formatRelativeDate(p.lastReleaseDate)}</span>` : '';
  const activityHtml = commitHtml || releaseHtml ? `${commitHtml}${releaseHtml}` : '';
  const ageBadge = p.firstCommitDate ? `<span class="age-badge" title="Project age">${formatAge(p.firstCommitDate)}</span>` : '';

  const links: string[] = [];
  if (p.repoUrl) links.push(`<a class="card-link" href="${escHtml(p.repoUrl)}" target="_blank" rel="noopener">GitHub</a>`);
  if (p.homepageUrl) links.push(`<a class="card-link" href="${escHtml(p.homepageUrl)}" target="_blank" rel="noopener">Website</a>`);
  if (p.devStatsUrl) links.push(`<a class="card-link" href="${escHtml(p.devStatsUrl)}" target="_blank" rel="noopener">DevStats</a>`);
  if (p.lfxSlug) links.push(`<a class="card-link card-link-lfx" href="https://insights.lfx.linuxfoundation.org/foundation/cncf/overview/github?project=${escHtml(p.lfxSlug)}" target="_blank" rel="noopener">LFX</a>`);
  if (p.cloMonitorName) links.push(`<a class="card-link card-link-clo" href="https://clomonitor.io/projects/cncf/${escHtml(p.cloMonitorName)}" target="_blank" rel="noopener">CLO</a>`);
  if (p.blogUrl) links.push(`<a class="card-link" href="${escHtml(p.blogUrl)}" target="_blank" rel="noopener">Blog</a>`);
  if (p.twitterUrl) links.push(`<a class="card-link" href="${escHtml(p.twitterUrl)}" target="_blank" rel="noopener">Twitter</a>`);
  if (p.slackUrl) links.push(`<a class="card-link" href="${escHtml(p.slackUrl)}" target="_blank" rel="noopener">Slack</a>`);

  const logoHtml = p.logoUrl
    ? `<img src="${escHtml(p.logoUrl)}" alt="${name} logo" width="64" height="64" loading="lazy" style="width:64px;height:64px;object-fit:contain" />`
    : `<div style="width:64px;height:64px;background:${color}22;border-radius:8px;display:flex;align-items:center;justify-content:center"><span style="font-size:1.5rem;color:${color}">${name[0]}</span></div>`;

  return `<article
    class="project-card letterbox-card changelog-event-card"
    style="display:flex;flex-direction:row;gap:1rem;align-items:flex-start;padding:1rem;--card-accent:${color}"
    data-maturity="${escHtml(p.maturity)}"
    data-slug="${escHtml(p.slug)}"
    data-name="${name.toLowerCase()}"
    data-category="${escHtml(p.category.toLowerCase())}"
  >
    <div class="letterbox-logo" style="flex-shrink:0;width:64px;display:flex;align-items:flex-start;padding-top:0.25rem">
      ${logoHtml}
    </div>
    <div class="letterbox-body" style="flex:1;min-width:0">
      ${eventBanner ? `<div class="event-banner" style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem">${eventBanner}</div>` : ''}
      <div class="letterbox-header" style="display:flex;align-items:flex-start;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.375rem">
        <h3 class="card-name" style="margin:0;font-size:1rem;font-weight:600;flex:1;min-width:0">${name}</h3>
        <div style="display:flex;gap:0.375rem;align-items:center;flex-shrink:0">
          <span class="maturity-badge" style="background:${color};color:#fff;font-size:0.65rem;padding:0.1rem 0.4rem;border-radius:3px;text-transform:uppercase;font-weight:600">${label}</span>
          ${auditHtml}
        </div>
      </div>
      ${desc ? `<p class="card-description" style="margin:0 0 0.375rem;font-size:0.875rem;color:var(--color-text-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${desc}</p>` : ''}
      ${tagsHtml}
      ${topicsHtml}
      <div class="letterbox-footer" style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;margin-top:0.375rem;font-size:0.8rem">
        ${statsHtml}
        ${ageBadge}
        <span style="color:var(--color-text-muted)">${escHtml(p.category)}${p.subcategory ? ' > ' + escHtml(p.subcategory) : ''}</span>
        ${activityHtml ? `<div class="card-activity">${activityHtml}</div>` : ''}
      </div>
      ${links.length ? `<div class="card-links" style="margin-top:0.5rem;display:flex;flex-wrap:wrap;gap:0.375rem">${links.join('')}</div>` : ''}
    </div>
  </article>`;
}

export function renderCards(projects: SafeProject[]): string {
  return projects.map(renderCard).join('\n');
}

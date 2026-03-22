import type { SafeProject } from './project-renderer';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function getYear(iso: string): string {
  return iso ? iso.slice(0, 4) : 'Unknown';
}

function lifespanLabel(acceptedDate?: string, archivedDate?: string): string {
  if (!acceptedDate || !archivedDate) return '';
  const days = (new Date(archivedDate).getTime() - new Date(acceptedDate).getTime()) / 86_400_000;
  if (days < 0) return '';
  const years = days / 365;
  if (years >= 2) return `${Math.round(years)} yrs in CNCF`;
  if (years >= 1) return `${(Math.round(years * 10) / 10)} yr in CNCF`;
  const months = Math.floor(days / 30);
  return months > 0 ? `${months} mo in CNCF` : `${Math.floor(days)} days in CNCF`;
}

function peakMaturity(p: SafeProject): { label: string; color: string } {
  if (p.graduatedDate) return { label: 'Graduated', color: '#FFB300' };
  if (p.incubatingDate) return { label: 'Incubating', color: '#0086FF' };
  return { label: 'Sandbox', color: '#8b949e' };
}

export function renderTimeline(archived: SafeProject[]): string {
  const sorted = [...archived].sort((a, b) => {
    const ta = a.archivedDate ? new Date(a.archivedDate).getTime() : 0;
    const tb = b.archivedDate ? new Date(b.archivedDate).getTime() : 0;
    return tb - ta;
  });

  if (!sorted.length) return '<p class="empty-state">No archived projects yet.</p>';

  let html = `<p class="archived-subtitle">For every gardener, a winnower</p>
<div class="timeline-container">`;

  let currentYear = '';
  let idx = 0;

  for (const p of sorted) {
    const year = getYear(p.archivedDate ?? '');
    if (year !== currentYear) {
      currentYear = year;
      html += `
  <div class="timeline-year"><span class="timeline-year-badge">${escapeHtml(year)}</span></div>`;
    }

    idx++;
    const date = p.archivedDate ? formatDate(p.archivedDate) : 'Date unknown';
    const acceptedStr = p.acceptedDate ? formatDate(p.acceptedDate) : null;
    const lifespan = lifespanLabel(p.acceptedDate, p.archivedDate);
    const { label: peakLabel, color: peakColor } = peakMaturity(p);

    const logoHtml = p.logoUrl
      ? `<img src="${escapeHtml(p.logoUrl)}" alt="${escapeHtml(p.name)} logo" width="48" height="48" loading="lazy" class="timeline-logo" />`
      : `<div class="timeline-logo-placeholder">${escapeHtml(p.name[0] ?? '?')}</div>`;

    const lifespanHtml = (acceptedStr || lifespan) ? `
      <div class="timeline-lifespan">
        ${acceptedStr ? `<span class="timeline-lifespan-dates">
          <span class="lifespan-label">Accepted ${escapeHtml(acceptedStr)}</span>
          <span class="lifespan-arrow" aria-hidden="true">→</span>
          <span class="lifespan-label">Archived ${escapeHtml(date)}</span>
        </span>` : ''}
        ${lifespan ? `<span class="timeline-lifespan-badge">${escapeHtml(lifespan)}</span>` : ''}
      </div>` : '';

    const links: string[] = [];
    if (p.repoUrl) links.push(`<a class="timeline-link" href="${escapeHtml(p.repoUrl)}" target="_blank" rel="noopener">GitHub</a>`);
    if (p.homepageUrl) links.push(`<a class="timeline-link" href="${escapeHtml(p.homepageUrl)}" target="_blank" rel="noopener">Website</a>`);

    html += `
  <div class="timeline-item" data-slug="${escapeHtml(p.slug)}">
    <div class="timeline-node-wrap">
      <div class="timeline-node" aria-hidden="true">${idx}</div>
      <time class="timeline-date-label" datetime="${escapeHtml(p.archivedDate ?? '')}">${escapeHtml(date)}</time>
    </div>
    <div class="timeline-card">
      <div class="timeline-card-header">
        ${logoHtml}
        <div class="timeline-card-title">
          <h3 class="timeline-project-name">${escapeHtml(p.name)}</h3>
          <div class="timeline-card-meta">
            <span class="timeline-category">${escapeHtml(p.category)}${p.subcategory ? ` › ${escapeHtml(p.subcategory)}` : ''}</span>
            <span class="timeline-peak-badge" style="--peak-color:${peakColor}">${escapeHtml(peakLabel)}</span>
          </div>
        </div>
      </div>
      ${lifespanHtml}
      ${p.description ? `<p class="timeline-description">${escapeHtml(p.description)}</p>` : ''}
      ${links.length ? `<div class="timeline-links">${links.join('')}</div>` : ''}
    </div>
  </div>`;
  }

  html += '\n</div>';
  return html;
}

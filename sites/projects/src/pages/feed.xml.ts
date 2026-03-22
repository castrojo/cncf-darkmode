import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import fs from 'node:fs';

interface ChangelogEvent {
  id: string;
  type: string;
  projectName: string;
  projectSlug: string;
  logoUrl: string;
  maturity: string;
  oldMaturity?: string;
  timestamp: string;
  description: string;
}

export async function GET(context: APIContext) {
  let events: ChangelogEvent[] = [];
  try {
    const raw = fs.readFileSync('src/data/changelog.json', 'utf-8');
    events = JSON.parse(raw);
  } catch {
    events = [];
  }

  return rss({
    title: 'CNCF Projects — Indie Cloud Native',
    description: 'Changes to CNCF cloud native projects',
    site: context.site ?? 'https://castrojo.github.io',
    items: events.slice(0, 100).map(e => ({
      title: `${e.type.charAt(0).toUpperCase() + e.type.slice(1)}: ${e.projectName}`,
      pubDate: new Date(e.timestamp),
      description: e.description,
      link: `https://castrojo.github.io/projects-website/`,
      guid: e.id,
    })),
  });
}

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import type { SafeMember } from '../lib/member-renderer';

export const GET: APIRoute = () => {
  let members: SafeMember[] = [];
  try {
    const raw = fs.readFileSync('src/data/members.json', 'utf-8');
    members = JSON.parse(raw) as SafeMember[];
  } catch {
    // empty
  }

  const base = 'https://castrojo.github.io/endusers-website';
  const items = members.slice(0, 50).map(m => `
    <item>
      <title>${escapeXml(m.name)} (${escapeXml(m.tier)})</title>
      <link>${base}/</link>
      <guid isPermaLink="false">${escapeXml(m.slug)}-${escapeXml(m.updatedAt)}</guid>
      <pubDate>${new Date(m.updatedAt || m.joinedAt || '').toUTCString()}</pubDate>
      <description>${escapeXml(m.description ?? `${m.name} is a ${m.tier} CNCF member.`)}</description>
    </item>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>CNCF Members</title>
    <link>${base}/</link>
    <description>CNCF member organizations</description>
    <language>en-us</language>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

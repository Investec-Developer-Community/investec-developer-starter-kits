import { createHash } from 'node:crypto';
import type { Kit } from '../data/kits';
import { sourceReviewStatus } from '../data/source-review';
import { API_REVIEW_DATE, officialDocs } from '../data/official-api';

// Download text only. Never import, install, or run upstream files.
const ALLOWED_HOSTS = new Set(['github.com', 'api.github.com', 'raw.githubusercontent.com', 'developer.investec.com']);
const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 15_000;

export function licenceHash(text: string): string {
  return createHash('sha256').update(text.replace(/\r\n?/g, '\n').trim()).digest('hex');
}

function safeUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname) ||
      url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('Only approved public source HTTPS hosts are allowed');
  }
  return url;
}

export interface LinkResult {
  kind: 'repository' | 'readme' | 'licence' | 'official-doc';
  url: string;
  finalUrl?: string;
  status?: number;
  state: 'ok' | 'broken' | 'unavailable';
  error?: string;
  sha256?: string;
  /** Untrusted text for human comparison, never executable. */
  licenceText?: string;
}

export async function checkLink(
  kind: LinkResult['kind'], url: string, fetcher: typeof fetch = fetch,
): Promise<LinkResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let current = safeUrl(url);
    for (let redirects = 0; redirects <= 5; redirects++) {
      const response = await fetcher(current, {
        method: 'GET', redirect: 'manual', signal: controller.signal,
        headers: { Accept: 'application/vnd.github.raw+json', 'User-Agent': 'Launchpad-source-review' },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location || redirects === 5) throw new Error('Invalid or excessive redirects');
        current = safeUrl(new URL(location, current).href);
        continue;
      }
      const result: LinkResult = {
        kind, url, finalUrl: current.href, status: response.status,
        state: response.ok ? 'ok' : [404, 410].includes(response.status) ? 'broken' : 'unavailable',
      };
      if (!response.ok) {
        await response.body?.cancel();
        result.error = `HTTP ${response.status}${[403, 429].includes(response.status) ? ' (possibly rate limited; retry later)' : ''}`;
        return result;
      }
      if (kind === 'repository' || kind === 'official-doc') {
        await response.body?.cancel();
        return result;
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Empty response body');
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_BYTES) {
          await reader.cancel();
          throw new Error('Response exceeds 2 MB limit');
        }
        chunks.push(chunk.value);
      }
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text.trim() || /<!doctype html|<html[\s>]/i.test(text) ||
          /text\/html|application\/json/i.test(response.headers.get('content-type') || '')) {
        throw new Error('Expected raw source text, not an empty, HTML, or JSON response');
      }
      if (kind === 'licence') {
        result.sha256 = licenceHash(text);
        result.licenceText = text;
      }
      return result;
    }
    throw new Error('Too many redirects');
  } catch (error) {
    return { kind, url, state: 'unavailable', error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function reviewSources(kits: Kit[], fetcher: typeof fetch = fetch, now = new Date()) {
  const results = [];
  for (const kit of kits) {
    if (kit.origin !== 'community') continue;
    const metadata = kit.credit?.sourceReview;
    const findings: string[] = [];
    const links: LinkResult[] = [];
    if (!metadata) {
      findings.push('Missing source review metadata');
    } else {
      const age = sourceReviewStatus(metadata.checkedOn, now);
      if (!age.startsWith('Sources checked ')) findings.push(age);
      for (const [kind, url] of [
        ['repository', metadata.repositoryUrl],
        ['readme', metadata.readmeUrl],
        ['licence', metadata.licenceUrl],
      ] as const) {
        const result = await checkLink(kind, url, fetcher);
        links.push(result);
        if (result.state !== 'ok') findings.push(`${kind}: ${result.state} — ${result.error}`);
        if (result.finalUrl && result.finalUrl !== url) findings.push(`${kind}: redirected; review the new URL`);
      }
      const licence = links.find((link) => link.kind === 'licence');
      if (!metadata.licenceSha256) {
        findings.push('No human-approved licence baseline; inspect licence or README declaration before approving');
      } else if (licence?.sha256 && metadata.licenceSha256 !== licence.sha256) {
        findings.push('LICENCE CHANGED: text differs from the approved baseline; human review required');
      }
    }
    results.push({
      slug: kit.slug, checkedOn: metadata?.checkedOn ?? null,
      approvedLicenceSha256: metadata?.licenceSha256 ?? null,
      attribution: kit.credit?.licence ?? 'No licence claim recorded; independent Launchpad mock',
      needsReview: findings.length > 0, findings, links,
    });
  }
  const officialReferences = await Promise.all(Object.values(officialDocs).map(d => checkLink('official-doc', d.url, fetcher)));
  return {
    officialReferences,
    apiGuidanceReviewedOn: API_REVIEW_DATE,
    officialReviewNote: 'Reachability only; run pnpm review:api for read-only OpenAPI baseline comparison (see scripts/API_ALIGNMENT.md).',
    runAt: now.toISOString(), needsReview: results.some((result) => result.needsReview) || officialReferences.some(r => r.state !== 'ok') || !sourceReviewStatus(API_REVIEW_DATE, now).startsWith('Sources checked '),
    skippedIllustrativeKits: kits.filter((kit) => kit.origin === 'illustrative').map((kit) => kit.slug),
    results,
  };
}

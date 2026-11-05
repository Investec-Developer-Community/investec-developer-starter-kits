import { createHash } from 'node:crypto';
import { officialDocs } from '../data/official-api';
import { downloadOfficial, extractContract, isObject, validateContract, type Contract, type Json } from './official-contract-fetch';

export function canonical(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function contractHash(contract: Contract): string {
  return createHash('sha256').update(canonical(contract)).digest('hex');
}
export interface Snapshot {
  sourceUrl: string;
  finalUrl: string;
  retrievedAt: string;
  method: string;
  sha256: string;
  approval: null | { reviewedBy: string; reviewedOn: string; sha256: string };
  contract: Contract;
}
export interface Baseline {
  formatVersion: 1;
  documents: Partial<Record<keyof typeof officialDocs, Snapshot>>;
}

export function parseBaseline(value: unknown): Baseline {
  if (!isObject(value) || value.formatVersion !== 1 || !isObject(value.documents)) {
    throw new Error('Invalid baseline format; expected formatVersion: 1 and documents');
  }
  for (const [key, entry] of Object.entries(value.documents)) {
    if (!Object.hasOwn(officialDocs, key) || !isObject(entry)) throw new Error(`Invalid baseline document: ${key}`);
    validateContract(entry.contract);
    if (entry.sourceUrl !== officialDocs[key as keyof typeof officialDocs].url ||
        typeof entry.finalUrl !== 'string' || typeof entry.retrievedAt !== 'string' ||
        typeof entry.method !== 'string' || entry.sha256 !== contractHash(entry.contract)) {
      throw new Error(`Baseline metadata/hash mismatch: ${key}`);
    }
    if (entry.approval !== null) {
      const approval = entry.approval;
      if (!isObject(approval) || typeof approval.reviewedBy !== 'string' || !approval.reviewedBy.trim() ||
          typeof approval.reviewedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(approval.reviewedOn) ||
          !Number.isFinite(Date.parse(approval.reviewedOn)) ||
          new Date(approval.reviewedOn).toISOString().slice(0, 10) !== approval.reviewedOn ||
          approval.reviewedOn > new Date().toISOString().slice(0, 10) ||
          approval.sha256 !== entry.sha256) {
        throw new Error(`Invalid human approval: ${key}`);
      }
    }
  }
  return value as unknown as Baseline;
}

export interface Difference {
  kind: 'added' | 'removed' | 'changed';
  area: 'endpoint' | 'schema' | 'document';
  pointer: string;
  before?: Json;
  after?: Json;
}
const escapePointer = (key: string) => key.replace(/~/g, '~0').replace(/\//g, '~1');
export function compareContracts(before: Contract, after: Contract) {
  const differences: Difference[] = [];
  let total = 0;
  const walk = (a: Json | undefined, b: Json | undefined, pointer: string) => {
    if (a !== undefined && b !== undefined && canonical(a) === canonical(b)) return;
    if (isObject(a) && isObject(b)) {
      for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
        walk(Object.hasOwn(a, key) ? a[key] : undefined, Object.hasOwn(b, key) ? b[key] : undefined, `${pointer}/${escapePointer(key)}`);
      }
      return;
    }
    total++;
    if (differences.length >= 500) return;
    differences.push({
      kind: a === undefined ? 'added' : b === undefined ? 'removed' : 'changed',
      area: pointer.startsWith('/paths') ? 'endpoint'
        : /^\/(?:components|definitions|parameters|responses)(?:\/|$)/.test(pointer) ? 'schema' : 'document',
      pointer, ...(a === undefined ? {} : { before: a }), ...(b === undefined ? {} : { after: b }),
    });
  };
  walk(before, after, '');
  return { differences, total, truncated: total > differences.length };
}

export async function reviewOfficialContracts(baseline: Baseline, fetcher: typeof fetch = fetch, now = new Date()) {
  const candidate: Baseline = { formatVersion: 1, documents: {} };
  const results = [];
  for (const [id, source] of Object.entries(officialDocs)) {
    const key = id as keyof typeof officialDocs;
    try {
      const downloaded = await downloadOfficial(source.url, fetcher);
      const { contract, method } = extractContract(downloaded.text);
      const snapshot: Snapshot = {
        sourceUrl: source.url, finalUrl: downloaded.finalUrl, retrievedAt: now.toISOString(),
        method, sha256: contractHash(contract), approval: null, contract,
      };
      candidate.documents[key] = snapshot;
      const previous = baseline.documents[key];
      const diff = previous ? compareContracts(previous.contract, contract) : { differences: [], total: 0, truncated: false };
      const approved = !!previous?.approval;
      const redirected = downloaded.finalUrl !== source.url;
      const state = !approved ? 'missing-approval' : diff.total ? 'changed' : redirected ? 'redirected' : 'unchanged';
      results.push({
        id, label: source.label, sourceUrl: source.url, finalUrl: downloaded.finalUrl,
        method, sha256: snapshot.sha256, approvedSha256: previous?.approval?.sha256 ?? null,
        state, needsReview: state !== 'unchanged', redirected, ...diff,
      });
    } catch (error) {
      results.push({
        id, label: source.label, sourceUrl: source.url, state: 'unavailable', needsReview: true,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    runAt: now.toISOString(), needsReview: results.some(result => result.needsReview),
    note: 'Structural comparison only, not compatibility certification. No portal code executed, references resolved, banking operations called or approvals changed.',
    results, candidate,
  };
}

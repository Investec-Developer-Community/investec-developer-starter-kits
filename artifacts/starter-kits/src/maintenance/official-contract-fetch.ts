/** Public documentation only. Never follow OpenAPI servers, $refs or download links. */
const MAX_BYTES = 2_000_000;
const REDIRECT_LIMIT = 5;
export const CONTRACT_TIMEOUT_MS = 15_000;

export function officialUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'developer.investec.com' ||
      url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('Only HTTPS developer.investec.com documentation is allowed');
  }
  return url;
}

export async function downloadOfficial(
  value: string, fetcher: typeof fetch = fetch, timeoutMs = CONTRACT_TIMEOUT_MS,
): Promise<{ text: string; finalUrl: string }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let activeReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  // Race also bounds a stalled body or an injected fetcher that ignores AbortSignal.
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Official documentation request timed out'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([timeout, (async () => {
      let url = officialUrl(value);
      for (let redirects = 0; redirects <= REDIRECT_LIMIT; redirects++) {
        const response = await fetcher(url, {
          method: 'GET', redirect: 'manual', signal: controller.signal,
          credentials: 'omit',
          headers: { Accept: 'application/json, text/html', 'User-Agent': 'Launchpad-contract-review' },
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          await response.body?.cancel();
          const location = response.headers.get('location');
          if (!location || redirects === REDIRECT_LIMIT) throw new Error('Invalid or excessive redirects');
          url = officialUrl(new URL(location, url).href);
          continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error(`Official documentation HTTP ${response.status}`);
        }
        if (Number(response.headers.get('content-length')) > MAX_BYTES) {
          await response.body?.cancel();
          throw new Error('Response exceeds 2 MB limit');
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Empty response body');
        activeReader = reader;
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > MAX_BYTES) throw new Error('Response exceeds 2 MB limit');
            chunks.push(chunk.value);
          }
        } catch (error) {
          void reader.cancel().catch(() => {});
          throw error;
        } finally {
          activeReader = undefined;
          reader.releaseLock();
        }
        return { text: Buffer.concat(chunks).toString('utf8'), finalUrl: url.href };
      }
      throw new Error('Too many redirects');
    })()]);
  } finally {
    if (timer) clearTimeout(timer);
    // Release even a stalled response stream when the deadline wins the race.
    void activeReader?.cancel().catch(() => {});
  }
}

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Contract = { [key: string]: Json };
export function isObject(value: unknown): value is Contract {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateContract(value: unknown): asserts value is Contract {
  if (!isObject(value) ||
      !(typeof value.openapi === 'string' && /^3\.\d+\.\d+$/.test(value.openapi) || value.swagger === '2.0') ||
      !isObject(value.info) || typeof value.info.title !== 'string' ||
      typeof value.info.version !== 'string' || !isObject(value.paths)) {
    throw new Error('Expected an OpenAPI 3.x or Swagger 2.0 object with info and paths');
  }
  const queue: Array<[unknown, number]> = [[value, 0]];
  while (queue.length) {
    const [node, depth] = queue.pop()!;
    if (depth > 100) throw new Error('Contract nesting exceeds safe limit');
    if (node && typeof node === 'object') {
      for (const child of Object.values(node)) queue.push([child, depth + 1]);
    }
  }
}

/** JSON-only scanner: balance braces outside strings, parse only objects with an OAS key. */
function findObjects(text: string): Contract[] {
  const stack: Array<{ start: number; candidate: boolean }> = [];
  const found: Contract[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') {
      const start = i++;
      for (; i < text.length; i++) {
        if (text[i] === '\\') { i++; continue; }
        if (text[i] === '"') break;
      }
      if (stack.length && /^"(?:openapi|swagger)"$/.test(text.slice(start, i + 1)) &&
          /^\s*:/.test(text.slice(i + 1, i + 16))) {
        stack[stack.length - 1].candidate = true;
      }
    } else if (text[i] === '{') {
      if (stack.length >= 128) throw new Error('Portal nesting exceeds safe limit');
      stack.push({ start: i, candidate: false });
    } else if (text[i] === '}') {
      const frame = stack.pop();
      if (frame?.candidate) {
        try {
          const value: unknown = JSON.parse(text.slice(frame.start, i + 1));
          validateContract(value);
          found.push(value);
        } catch { /* Not a complete supported contract; fail below if none found. */ }
      }
    }
  }
  return found;
}

export function extractContract(text: string): { contract: Contract; method: string } {
  if (Buffer.byteLength(text) > MAX_BYTES) throw new Error('Response exceeds 2 MB limit');
  try {
    const value: unknown = JSON.parse(text);
    validateContract(value);
    return { contract: value, method: 'direct-json' };
  } catch { /* The official portal may embed the object instead. */ }
  // Decode string literals from Next.js data pushes, not JavaScript expressions.
  const chunks: string[] = [];
  const push = /self\.__next_f\.push\(\[1,\s*("(?:[^"\\]|\\.)*")\s*\]\)/g;
  for (const match of text.matchAll(push)) chunks.push(JSON.parse(match[1]) as string);
  const candidates = [
    ...findObjects(text),
    ...findObjects(chunks.join('')),
  ];
  const unique = new Map(candidates.map(value => [JSON.stringify(value), value]));
  if (unique.size !== 1) throw new Error(
    unique.size ? 'Ambiguous portal: multiple OpenAPI objects found' : 'No complete OpenAPI object found; portal layout may have changed (JSON only)',
  );
  return { contract: [...unique.values()][0], method: 'embedded-json' };
}

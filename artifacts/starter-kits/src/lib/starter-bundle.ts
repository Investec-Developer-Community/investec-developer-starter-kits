import type { Kit } from '../data/kits.ts';
import { sampleHelpersSource } from '../data/sample-helpers-source.ts';
import { apiReadmeGuidance } from '../data/official-api.ts';
import { downloadBlob } from './download.ts';

export function starterInstructions(kit: Kit) {
  const step = kit.setup.find(s => s.code?.startsWith(`node ${kit.scriptFile} `));
  if (!step?.code) throw new Error(`No run instructions recorded for ${kit.name}`);
  return { command: step.code, expected: step.body };
}

export function starterFiles(kit: Kit): Record<string, string> {
  const { command, expected } = starterInstructions(kit);
  const provenance = kit.credit
    ? [`Original project by ${kit.credit.authors.map(a => a.name).join(', ')}.`,
      kit.credit.upstream, `Launchpad adaptation: ${kit.credit.adaptation}`,
      `Source review: ${kit.credit.sourceReview.checkedOn ?? 'not yet recorded'}. Review scope: upstream documentation, not execution or certification.`,
      `Licence: ${kit.credit.licence ?? 'No upstream licence grant verified.'}`,
      ...kit.credit.links.map(l => `${l.label}: ${l.url}`)]
    : ['Original illustrative Launchpad example; no upstream project attribution.'];
  return {
    [kit.scriptFile]: kit.script,
    [kit.dataFile]: JSON.stringify(kit.mockData, null, 2),
    ...kit.additionalFiles,
    ...(kit.usesInvestecApi ? { 'sample-helpers.mjs': sampleHelpersSource } : {}),
    'README.md': [
      `# ${kit.name}`, '', kit.tagline, '',
      '## Run locally', 'Requires Node.js 20.12 or newer; the sample runs offline with no package installation.',
      'Download the ZIP, extract it, then `cd ' + kit.slug + '` and run:',
      '', '```sh', command, '```', '', '## Expected result', expected, '',
      ...(kit.additionalReadme ? [kit.additionalReadme, ''] : []),
      '## Safety', kit.usesInvestecApi
        ? 'The bundled runner uses fictional data only and makes no network requests.'
        : 'Fictional offline data only. No bank connection or real money movement.',
      ...kit.limitations.map(l => `- ${l}`), '', apiReadmeGuidance(kit.slug), '', '## Sources and licence', ...provenance,
      '', 'Preserve copyright and licence notices in the script. Upstream code was not certified compatible.',
    ].join('\n') + '\n',
  };
}

// ZIP "store" method: tiny text bundles need no compression dependency.
// Standard local headers, central directory, UTF-8 names and CRC-32.
export function createStarterZip(kit: Kit): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [], directory: Uint8Array[] = [];
  let offset = 0;
  const crc32 = (bytes: Uint8Array) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const files = Object.entries(starterFiles(kit)).map(([filename, text]) => [`${kit.slug}/${filename}`, text] as const);
  for (const [filename, text] of files) {
    const name = encoder.encode(filename), data = encoder.encode(text), crc = crc32(data);
    const local = new Uint8Array(30 + name.length), v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true); v.setUint16(12, 33, true); // 1980-01-01
    v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true);
    v.setUint16(26, name.length, true); local.set(name, 30);
    const central = new Uint8Array(46 + name.length), c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true); c.setUint16(14, 33, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint32(42, offset, true); central.set(name, 46);
    chunks.push(local, data); directory.push(central); offset += local.length + data.length;
  }
  const directorySize = directory.reduce((n, a) => n + a.length, 0);
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, directorySize, true); e.setUint32(16, offset, true);
  const result = new Uint8Array(offset + directorySize + end.length);
  let cursor = 0;
  for (const chunk of [...chunks, ...directory, end]) { result.set(chunk, cursor); cursor += chunk.length; }
  return result;
}

export async function downloadStarterBundle(kit: Kit): Promise<void> {
  downloadBlob(`${kit.slug}-starter.zip`, new Blob([createStarterZip(kit)], { type: 'application/zip' }));
}

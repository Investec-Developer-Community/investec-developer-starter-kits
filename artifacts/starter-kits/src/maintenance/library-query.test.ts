import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildLibraryUrl,
  defaultLibraryFilters,
  readLibraryFilters,
  writeLibraryFilters,
} from '../lib/library-query.ts';

const categories = ['All', 'Insights', 'Savings', 'Card controls'];
const languages = ['All', 'JavaScript'];

test('reads recognized query state and ignores invalid filter values', () => {
  assert.deepEqual(
    readLibraryFilters(
      '?q=spend%20explorer&cat=unknown&lang=Python&diff=Expert&sort=random&campaign=community',
      categories,
      languages,
    ),
    { ...defaultLibraryFilters, q: 'spend explorer' },
  );
});

test('query state round-trips while preserving unrelated search parameters', () => {
  const filters = {
    q: 'spend explorer',
    cat: 'Insights',
    lang: 'JavaScript',
    diff: 'Beginner',
    sort: 'time',
  } as const;
  const search = writeLibraryFilters('?campaign=community', filters);
  const params = new URLSearchParams(search);

  assert.deepEqual(readLibraryFilters(search, categories, languages), filters);
  assert.equal(params.get('campaign'), 'community');
  assert.equal(params.get('q'), filters.q);
  assert.equal(params.get('cat'), filters.cat);
  assert.equal(params.get('lang'), filters.lang);
  assert.equal(params.get('diff'), filters.diff);
  assert.equal(params.get('sort'), filters.sort);
});

test('omits defaults and removes stale filter parameters without dropping unrelated ones', () => {
  assert.equal(
    writeLibraryFilters('?campaign=community&q=stale&cat=bad&sort=bad', defaultLibraryFilters),
    'campaign=community',
  );
});

test('preserves the current base path and hash when building a filtered URL', () => {
  assert.equal(
    buildLibraryUrl('/investec-developer-starter-kits/', '?campaign=community', '#kits', {
      ...defaultLibraryFilters,
      q: 'spend',
    }),
    '/investec-developer-starter-kits/?campaign=community&q=spend#kits',
  );
});

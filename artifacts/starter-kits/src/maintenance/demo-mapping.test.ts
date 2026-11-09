import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getKit, kits } from '../data/kits.ts';
import { kitSlugs } from '../data/kit-slugs.ts';
import { demoRegistry } from '../lib/demo-registry.ts';

const catalogue = kits.map(kit => kit.slug);
const registered = Object.keys(demoRegistry);

test('kitSlugs lists exactly the catalogue kits, once each', () => {
  assert.equal(new Set(catalogue).size, catalogue.length, 'catalogue slugs must be unique');
  assert.equal(new Set(kitSlugs).size, kitSlugs.length, 'kitSlugs must be unique');
  assert.deepEqual([...kitSlugs].sort(), [...catalogue].sort());
});

test('every catalogue kit has a registered demo component', () => {
  for (const slug of catalogue) {
    assert.equal(typeof demoRegistry[slug], 'function', `${slug} has no demo in demoRegistry`);
  }
});

test('no demo is registered for a slug outside the catalogue', () => {
  for (const slug of registered) assert.ok(getKit(slug), `${slug} is registered but is not a catalogue kit`);
  assert.equal(registered.length, catalogue.length);
});

test('each kit has its own demo, never another kit demo', () => {
  const components = Object.values(demoRegistry);
  assert.equal(new Set(components).size, components.length, 'two kits share a demo component');
});

test('unknown URL slugs resolve to no kit, so kit-detail shows not-found rather than a demo', () => {
  for (const slug of ['not-a-kit', '', 'CARD-GUARD', 'card-guard/']) assert.equal(getKit(slug), undefined);
});

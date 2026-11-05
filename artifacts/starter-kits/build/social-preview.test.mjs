import assert from 'node:assert/strict';
import { test } from 'node:test';
import { socialPreview } from './social-preview.ts';

const template = '<meta property="og:image" content="__LAUNCHPAD_SOCIAL_IMAGE__"><meta name="twitter:image" content="__LAUNCHPAD_SOCIAL_IMAGE__">';
for (const base of ['/', '/starter-kits/']) {
  test(`preview metadata respects ${base}`, () => {
    const html = socialPreview(base).transformIndexHtml(template);
    assert.equal(html.match(new RegExp(`${base}brand/launchpad-social.png`, 'g')).length, 2);
    assert.ok(!html.includes('__LAUNCHPAD'));
  });
  test(`published metadata respects ${base}`, () => {
    // Reserved example domain is a test fixture, never production configuration.
    const html = socialPreview(base, `https://example.org${base}`).transformIndexHtml(template);
    assert.equal(html.match(new RegExp(`https://example.org${base}brand/launchpad-social.png`, 'g')).length, 2);
  });
}
test('reject invalid or mismatched publication addresses', () => {
  for (const url of ['http://example.org/', 'https://localhost/', 'https://example.org/?q=1', 'https://example.org/#x', 'https://user:pass@example.org/', 'https://example.org/wrong/']) {
    assert.throws(() => socialPreview('/', url));
  }
});

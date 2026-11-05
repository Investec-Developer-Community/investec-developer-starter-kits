import type { Plugin } from 'vite';

/** PUBLIC_SITE_URL is the hosting provider's full site URL, including its base path. */
export function socialPreview(basePath: string, siteUrl?: string): Plugin {
  let imageUrl = `${basePath}brand/launchpad-social.png`;
  if (siteUrl) {
    const url = new URL(siteUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        url.hostname === 'localhost') {
      throw new Error('PUBLIC_SITE_URL must be a public HTTPS site URL, without credentials, query or fragment.');
    }
    url.pathname = url.pathname.replace(/\/?$/, '/');
    if (url.pathname !== basePath) {
      throw new Error('PUBLIC_SITE_URL path must match BASE_PATH.');
    }
    imageUrl = new URL('brand/launchpad-social.png', url).href;
  }
  return {
    name: 'launchpad-social-preview',
    transformIndexHtml(html) {
      return html.replaceAll('__LAUNCHPAD_SOCIAL_IMAGE__', imageUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;'));
    },
    buildStart() {
      if (!siteUrl) this.warn('PUBLIC_SITE_URL is unset: share images use base-relative URLs. Set the verified published site URL for social crawlers.');
    },
  };
}

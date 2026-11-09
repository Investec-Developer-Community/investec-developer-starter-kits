# GitHub Pages

This website is fully static. Its demos, ZIP generation, command copying and
manual checklist progress run in the browser. Deploy only
`artifacts/starter-kits/dist/public`; never deploy `.env` files or the workspace
root. The repository has no server or database package, and no banking
credentials are needed. Node is required to **build** the website and run
downloaded local kits (Node 20.12+ for those kits), not to serve the built website.

## Enable deployment

1. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
2. Allow Actions in the repository. If the `github-pages` environment has approval
   rules, approve deployments there and allow the `main` branch.
3. Push to `main`, or run **Starter kits GitHub Pages** manually from
   **Actions → Run workflow**.
4. The site is published at
   <https://investec-developer-community.github.io/investec-developer-starter-kits/>
   (base path `/investec-developer-starter-kits/`; no custom domain).

The workflow reads Node from `.nvmrc` and pnpm from the root `packageManager`
field, installs with a frozen lockfile, and builds only `@workspace/starter-kits`.
It reads `base_path` and `base_url` from `actions/configure-pages`, so
`BASE_PATH` and `PUBLIC_SITE_URL` always match the published location. It uploads
only `artifacts/starter-kits/dist/public`. Only the deploy job has Pages write and
OIDC-token permissions. Concurrent deployments are serialized.

## Local build

With the Node version in `.nvmrc` and the pinned pnpm (`corepack enable`), from the
workspace root:

```sh
pnpm install --frozen-lockfile --filter @workspace/starter-kits...

# Root hosting (BASE_PATH defaults to /; PORT is not required)
pnpm --filter @workspace/starter-kits build

# Project-site hosting, as deployed on GitHub Pages
BASE_PATH=/investec-developer-starter-kits/ pnpm --filter @workspace/starter-kits build
```

Build output: `artifacts/starter-kits/dist/public/`. Publish its **contents**.
You do not need the workspace-wide `pnpm build`; it adds a typecheck of both workspace packages before the same site build.
Development (`pnpm --filter @workspace/starter-kits dev`) defaults to port 5173
and base `/`; `PORT` and `BASE_PATH` override them.
Changing the public hosting path requires a rebuild.

## Social share image

The committed `public/brand/launchpad-social.png` is shared by Open Graph and
Twitter metadata in every generated HTML route. GitHub Actions supplies
`PUBLIC_SITE_URL` from `actions/configure-pages`'s `base_url`, so root, repository
and custom-domain hosting use the provider's actual URL rather than a guessed host.
For other hosts, set `PUBLIC_SITE_URL` at build time to the verified published
HTTPS site URL (including the same path as `BASE_PATH`), then rebuild.
Never use a development URL. When unset, builds warn and retain base-relative
image URLs for local previews; these are not a substitute for absolute production
URLs required by social crawlers. No production hostname is hardcoded; the
workflow supplies it.

After publishing through your normal process, check the raw HTML and the image
URL: the latter must return HTTP 200 and `Content-Type: image/png` without login.
Existing shared links may require refreshing their cached preview in the social
platform's inspection tool.

## Static routing

The build copies the app shell into `getting-started/index.html`,
`reference/index.html`, `saved/index.html`, and `kits/<slug>/index.html` for every
kit in the catalogue. No route list of kit slugs needs separate maintenance.
Static hosts redirect directory URLs to trailing slashes; the router accepts
both forms. Section hashes survive refresh and navigation. `/saved` remains a
client-side redirect home, not a bookmarks page.

`404.html` uses the same shell, so Pages returns HTTP 404 for unknown URLs while
showing a useful not-found screen and a base-aware home link. Hosts other than
Pages must be configured to use this custom 404 document (not rewrite everything
to HTTP 200). `.nojekyll` disables Jekyll processing. These are client-rendered
entry pages, not server-rendered content: JavaScript must be enabled.

## Verification

```sh
# First-time browser installation
pnpm --filter @workspace/starter-kits exec playwright install chromium
pnpm --filter @workspace/starter-kits test:static
```

The suite builds both `/` and `/starter-kits/` with `PORT` unset and serves them
with a plain Node file server that has **no SPA fallback**. It checks every
known page and refresh, script/style/image/favicon requests, anchors, navigation,
legacy saved redirection, real HTTP 404s, every kit demo (kits 1–6 in
`hosting.spec.ts`, kits 7–9 in `learning-kits.spec.ts`), ZIP downloads,
clipboard copying and persisted manual progress. `invariants.spec.ts` also
checks every route for credential inputs and runtime or off-origin requests,
checks that downloads are client-side blobs, tolerates corrupted
`localStorage`, and scans the built bundle for network clients, banking API
hosts and backend packages. Browser requests outside the hosting prefix and
runtime fetch/XHR requests fail the suite.

In CI, `static-hosting.yml` runs this suite on every pull request inside the
pinned `mcr.microsoft.com/playwright:v1.64.1-noble` container. Bump the image tag
whenever `@playwright/test` changes in `pnpm-lock.yaml`. Generated builds and test
output stay in ignored `generated-artifacts/static-hosting/`.

## Troubleshooting and storage

- **Pages configuration step fails:** set Source to GitHub Actions first, confirm
  the repository/account supports Pages, and check Actions policies.
- **Deploy waits or is rejected:** check `github-pages` environment approvals and
  allowed branches (`main`).
- **Blank page or asset 404s:** verify the build's `BASE_PATH` matches the published
  path; do not move an already-built root site under a repository prefix.
- **Deep links 404:** upload the complete output including route directories and
  `404.html`, not just the top-level index and assets.
- **Copy unavailable:** Pages uses HTTPS. Browser clipboard restrictions can still
  block copying; the displayed command remains selectable.
- **Progress appears missing after moving hosts:** local storage belongs to the
  browser and origin (scheme, hostname and port). Progress saved on a previous
  host is not available on GitHub Pages, and a custom-domain change also uses a new
  origin. Paths on the same origin share storage; private browsing or clearing
  storage can remove it.

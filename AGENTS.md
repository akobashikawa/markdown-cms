# AGENTS.md

No-build Vue 3 SPA that reads and writes Markdown in `pages/` through the GitHub Contents API, then commits to `master` from the browser. No `package.json`, bundler, tests, lint, or CI.

## Run

- `python3 -m http.server 5500` and open `http://localhost:5500/`. The README's "open index.html" instruction fails on `file://` because ES modules/import maps are blocked.
- Hash routing: `/#/about` loads `pages/about.md`; `/#/` defaults to `pages/index.md`.
- Edit/save requires a GitHub token with contents read/write; log in through the OAuth device flow (or seed `localStorage.github_token`).

## Architecture and gotchas

- Dependencies are CDN URLs in the import map in `index.html` — there is no npm. Add libraries there.
- `js/components/App.js` is a single options-API component with a template string; `js/router.js` has one `/:page?` hash route.
- Reads use `api.github.com/repos/<owner>/<repo>/contents/pages/<page>.md`; `config.pagesBaseUrl` in `js/config.js` is unused, so changing it does nothing.
- Saving fetches the file SHA, then PUTs a commit straight to `master`. There is no PR/branch workflow.
- A 404 opens a blank edit form to create the page. A 401 shows an explicit login prompt instead of auto-starting OAuth (so logout sticks); a 403 is reported as an access/rate-limit error.
- UTF-8 round-trips through `btoa(unescape(encodeURIComponent(...)))` and `decodeURIComponent(escape(atob(...)))`; keep both sides paired or non-ASCII content breaks.
- `js/config.js` hardcodes owner/repo/branch and the OAuth client ID. Repoint all of them (and `pagesBaseUrl` for consistency) to use a different repository.
- `js/marked-config.js` rewrites internal Markdown links to `#/...` and strips `.md`; external links open in a new tab.
- `pages/*.md` is published CMS content while `README.md` is only repo documentation. Editing one does not update the other.
- The README's "Setup Token" step is stale: `setupToken` exists in `App.js` but no UI invokes it.

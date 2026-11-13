# AGENTS.md

No-build Vue 3 SPA that reads and writes Markdown in `pages/` through the GitHub Contents API and commits to `master` from the browser. No `package.json`, bundler, tests, lint, or CI. Designed to be published on GitHub Pages.

## Run

- `python3 -m http.server 5500` and open `http://localhost:5500/`. Opening `index.html` via `file://` fails because ES modules/import maps are blocked.
- Hash routing: `/#/about` loads `pages/about.md`; `/#/` defaults to `pages/index.md`.
- Editing requires a token with Contents read/write; log in through the token form (stored in `localStorage.github_token`).

## Architecture and gotchas

- Dependencies are CDN URLs in the import map in `index.html` — there is no npm. Add libraries there.
- `js/components/App.js` is a single options-API component with a template string; `js/router.js` has one `/:page?` hash route.
- Omit the `Authorization` header when no token is stored: `Authorization: token ` (empty) makes GitHub return 401 even for public repositories.
- Reads use `api.github.com/repos/<owner>/<repo>/contents/pages/<page>.md`; saving fetches the SHA, then PUTs a commit straight to `master`. There is no PR/branch workflow.
- Browser OAuth device flow is not viable: GitHub sends no CORS headers for `github.com/login/device/code`. Do not reintroduce it without a proxy.
- A 401 with a stored token drops the token and retries anonymously; a private repo then shows the login prompt. 403 is reported as an access/rate-limit error. A 404 opens the editor for authenticated users, otherwise shows "Page not found".
- UTF-8 round-trips through `btoa(unescape(encodeURIComponent(...)))` and `decodeURIComponent(escape(atob(...)))`; keep both sides paired or non-ASCII content breaks.
- `js/config.js` hardcodes owner/repo/branch; repoint them to use another repository. The token is restored from `localStorage`.
- `js/marked-config.js` rewrites internal Markdown links to `#/...` and strips `.md`; external links open in a new tab.
- `pages/*.md` is published CMS content while `README.md` is only repo documentation. Editing one does not update the other.

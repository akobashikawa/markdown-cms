# GitHub CMS 101

A simple CMS (Content Management System) that uses GitHub's infrastructure for deployment and publishing.

## Features

- Uses GitHub as content backend
- No server required (static hosting, works on GitHub Pages)
- Markdown content
- Edit content directly from the web interface
- Authentication via GitHub token
- Vue.js single page application

## Technologies

- Vue.js 3
- Vue Router
- Marked (for Markdown parsing)
- Matcha CSS
- GitHub Contents API

## How it works

- There is no build step: `index.html` loads Vue, Vue Router, axios and marked from CDNs through an import map.
- Markdown pages live in `pages/`. Hash routes map to files: `#/about` renders `pages/about.md`, while `#/` renders `pages/index.md`.
- Reading uses the GitHub Contents API. Saving commits directly to the configured branch.
- If a page does not exist, authenticated users get an empty editor to create it.

## Local development

```bash
python3 -m http.server 5500
```

Open <http://localhost:5500/>. A local HTTP server is required: ES modules and import maps do not work from `file://`.

## Authentication

Editing requires a GitHub token with **Contents: Read and write** access to this repository:

1. Create a [fine-grained token](https://github.com/settings/tokens?type=beta) scoped to this repository.
2. Click **Login with GitHub**, paste the token and save it. It is kept in `localStorage` as `github_token`.

The OAuth device flow cannot be used from a browser: GitHub does not send CORS headers for `github.com/login/device/code`.

## Deploy on GitHub Pages

1. Push the repository to GitHub.
2. In **Settings → Pages**, deploy from the `master` branch, root folder.
3. Update `js/config.js` (`owner`, `repo` and `branch`) to point at your repository.

Hash routing means no extra 404 fallback is needed on GitHub Pages.

## License

MIT

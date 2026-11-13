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

1. Click **Login with GitHub**, then **Create a fine-grained token**. The link pre-fills the token name, expiration and Contents permission.
2. Under **Repository access**, choose **Only select repositories** and select this repository.
3. Click **Generate token**, copy it, paste it into the form and save.

The token is stored in `localStorage` (`github_token`); logging out clears it. See [`docs/authentication.md`](docs/authentication.md) for why OAuth cannot be used from a static site and which alternatives exist.

## Deploy on GitHub Pages

1. Push the repository to GitHub.
2. In **Settings → Pages**, deploy from the `master` branch, root folder.
3. Update `js/config.js` (`owner`, `repo` and `branch`) to point at your repository.

Hash routing means no extra 404 fallback is needed on GitHub Pages.

## License

MIT

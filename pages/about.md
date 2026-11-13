# Acerca de Markdown CMS

A simple CMS (Content Management System) that uses GitHub's infrastructure for deployment and publishing.

## Features

- Uses GitHub as content backend
- No server required (static hosting)
- Markdown content
- Edit content directly from the web interface
- Authentication via GitHub token
- Vue.js single page application

## Technologies

- Vue.js 3
- Vue Router
- Marked (for Markdown parsing)
- Matcha CSS
- GitHub API

## Setup

1. Clone this repository
2. Create a GitHub token with **Contents: Read and write** access to this repository
3. Serve the site over HTTP (`python3 -m http.server 5500`) or publish it with GitHub Pages
4. Click "Login with GitHub" and paste the token

## Usage

- Navigate using the menu links
- Click "Edit" to modify content (requires a token)
- Content is saved as Markdown files in the `pages/` directory
- All changes are committed directly to the repository

## Development

```bash
git clone https://github.com/akobashikawa/markdown-cms.git
cd markdown-cms
```

## License

MIT


Github: [akobashikawa/markdown-cms: Idea de CMS usando github](https://github.com/akobashikawa/markdown-cms)

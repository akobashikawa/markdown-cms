const config = {
    // Branding: the single place to rename the app. The site title, the
    // footer, the token name and the docs snippets derive from these values.
    site: {
        name: 'Markdown CMS',
        description: 'A simple CMS for Markdown content, published with GitHub Pages.'
    },
    github: {
        owner: 'akobashikawa',
        repo: 'github-cms-101', // Repo rename pending: change after renaming on GitHub
        token: '', // Se llena desde localStorage con el token guardado
        user: '', // Login de GitHub asociado al token
        tokenExpires: '', // Fecha de expiración informada por GitHub
        branch: 'master'
    }
};

// Derived URLs keep the repository name in one place.
config.github.webUrl = `https://github.com/${config.github.owner}/${config.github.repo}`;
config.github.pagesUrl = `https://${config.github.owner}.github.io/${config.github.repo}/`;

// Intenta recuperar la sesión guardada en localStorage
const storedToken = localStorage.getItem('github_token');
if (storedToken) {
    config.github.token = storedToken;
    config.github.user = localStorage.getItem('github_user') || '';
    config.github.tokenExpires = localStorage.getItem('github_token_expires') || '';
}

export default config;

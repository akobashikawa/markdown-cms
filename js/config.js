const config = {
    github: {
        owner: 'akobashikawa',
        repo: 'github-cms-101',
        token: '', // Se llena desde localStorage con el token guardado
        user: '', // Login de GitHub asociado al token
        tokenExpires: '', // Fecha de expiración informada por GitHub
        branch: 'master'
    }
};

// Intenta recuperar la sesión guardada en localStorage
const storedToken = localStorage.getItem('github_token');
if (storedToken) {
    config.github.token = storedToken;
    config.github.user = localStorage.getItem('github_user') || '';
    config.github.tokenExpires = localStorage.getItem('github_token_expires') || '';
}

export default config;

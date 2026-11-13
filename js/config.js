const config = {
    github: {
        owner: 'akobashikawa',
        repo: 'github-cms-101',
        token: '', // Se llena desde localStorage con el token guardado
        branch: 'master'
    }
};

// Intenta recuperar el token de localStorage
const storedToken = localStorage.getItem('github_token');
if (storedToken) {
    config.github.token = storedToken;
}

export default config;

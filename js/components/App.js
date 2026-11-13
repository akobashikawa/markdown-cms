import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { marked } from '../marked-config.js';
import config from '../config.js';

const repoUrl = (path = '') =>
    `https://api.github.com/repos/${config.github.owner}/${config.github.repo}${path}`;

const contentsUrl = (page) => repoUrl(`/contents/pages/${page}.md`);

// Only send credentials when a token is stored: an empty "Authorization: token"
// header makes GitHub answer 401 even for public repositories.
const githubHeaders = () => {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (config.github.token) {
        headers.Authorization = `token ${config.github.token}`;
    }
    return headers;
};

const App = {
    template: `
    <div class="container">
        <nav>
            <router-link to="/">Home</router-link> &nbsp;|&nbsp;
            <router-link to="/about">About</router-link>
            
            <span v-if="!isAuthenticated">
                | <button type="button" class="link-button" @click="openTokenForm">Login with GitHub</button>
            </span>
            <span v-else>
                | <button type="button" class="link-button" @click="logout">Logout</button>
            </span>
        </nav>

        <div v-if="showTokenForm" class="login-box">
            <h2>Login with a GitHub token</h2>
            <p>
                Create a
                <a href="https://github.com/settings/tokens?type=beta" target="_blank">fine-grained token</a>
                with <strong>Contents: Read and write</strong> access to this repository.
            </p>
            <input
                type="password"
                v-model="tokenInput"
                class="form-control"
                placeholder="github_pat_..."
                @keyup.enter="saveToken">
            <p v-if="tokenError" class="error">{{ tokenError }}</p>
            <div class="mt-2">
                <button @click="saveToken" class="btn" :disabled="savingToken">
                    {{ savingToken ? 'Checking...' : 'Save token' }}
                </button>
                <button @click="cancelTokenForm" class="btn">Cancel</button>
            </div>
        </div>

        <div v-else-if="authRequired" class="login-box">
            <h2>Authentication required</h2>
            <p>This repository is private or the stored token has expired. Log in to read its content.</p>
            <button @click="openTokenForm" class="btn">Login with GitHub</button>
        </div>

        <div v-else-if="!showEditForm">
            <div v-if="loading" class="loading">Loading...</div>
            <div v-else v-html="content"></div>
            <div v-if="isAuthenticated && !loading" class="mt-2">
                <button @click="editContent" class="btn">Edit</button>
            </div>
        </div>
        
        <div v-else class="edit-form">
            <h2>Edit Page: {{currentPage}}</h2>
            <textarea v-model="newContent" rows="10" class="form-control" placeholder="Enter markdown content..."></textarea>
            <div class="mt-2">
                <button @click="saveContent" class="btn">Save</button>
                <button @click="cancelEdit" class="btn">Cancel</button>
            </div>
        </div>

        <footer>
            <em><a href="https://github.com/akobashikawa/github-cms-101" target="_blank">@GitHub</a></em>
        </footer>
    </div>
    `,

    setup() {
        const route = useRoute();
        const content = ref('');
        const showEditForm = ref(false);
        const newContent = ref('');
        const currentPage = ref('');
        const rawContent = ref('');
        const loading = ref(false);

        // Reactive authentication state (config is not reactive, so track it explicitly)
        const isAuthenticated = ref(!!config.github.token);
        const authRequired = ref(false);

        // Token login form state
        const showTokenForm = ref(false);
        const tokenInput = ref('');
        const tokenError = ref('');
        const savingToken = ref(false);

        const loadPage = async (pageName) => {
            currentPage.value = pageName || 'index';
            loading.value = true;
            authRequired.value = false;

            try {
                const response = await axios.get(contentsUrl(currentPage.value), {
                    headers: githubHeaders()
                });

                // Decodificar correctamente el contenido base64
                const decodedContent = decodeURIComponent(escape(atob(response.data.content)));
                rawContent.value = decodedContent;
                content.value = marked(decodedContent);
                showEditForm.value = false;
            } catch (error) {
                if (!error.response) {
                    console.error('Error loading content:', error);
                    content.value = 'Error loading content';
                    return;
                }

                const status = error.response.status;

                // Stored token is invalid/expired: drop it and retry anonymously.
                if (status === 401 && config.github.token) {
                    config.github.token = '';
                    localStorage.removeItem('github_token');
                    isAuthenticated.value = false;
                    return loadPage(currentPage.value);
                }

                // Unauthenticated 401 means the repository requires a login.
                if (status === 401) {
                    authRequired.value = true;
                    content.value = '';
                    return;
                }

                // 403 is not an auth-only signal: it can be a rate limit or
                // missing token permissions.
                if (status === 403) {
                    console.error('Access denied loading content:', error);
                    content.value = 'Access denied. Check that your token has content permissions and that the API rate limit has not been reached.';
                    return;
                }

                // Page not found - authenticated users get an editor to create it.
                if (status === 404) {
                    rawContent.value = '';
                    if (isAuthenticated.value) {
                        showEditForm.value = true;
                        newContent.value = '';
                    } else {
                        content.value = 'Page not found. If this repository is private, log in with a GitHub token.';
                    }
                    return;
                }

                console.error('Error loading content:', error);
                content.value = 'Error loading content';
            } finally {
                loading.value = false;
            }
        };

        watch(
            // Normalize the optional route param so the initial route object
            // (undefined) and the resolved route ('') don't both trigger a load.
            () => route.params.page || 'index',
            (page) => {
                loadPage(page);
            },
            { immediate: true }
        );

        const openTokenForm = () => {
            tokenInput.value = '';
            tokenError.value = '';
            showTokenForm.value = true;
        };

        const cancelTokenForm = () => {
            showTokenForm.value = false;
            tokenInput.value = '';
            tokenError.value = '';
        };

        const saveToken = async () => {
            const token = tokenInput.value.trim();
            if (!token) {
                tokenError.value = 'Enter a GitHub token';
                return;
            }

            savingToken.value = true;
            tokenError.value = '';

            try {
                // Validate the token and check that it can write to the repository.
                const response = await axios.get(repoUrl(), {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (response.data.permissions && !response.data.permissions.push) {
                    tokenError.value = 'This token does not have write access to the repository';
                    return;
                }

                config.github.token = token;
                localStorage.setItem('github_token', token);
                isAuthenticated.value = true;
                showTokenForm.value = false;
                tokenInput.value = '';
                authRequired.value = false;
                loadPage(currentPage.value || 'index');
            } catch (error) {
                tokenError.value = error.response && error.response.status === 401
                    ? 'Invalid or expired token'
                    : 'Could not validate the token';
            } finally {
                savingToken.value = false;
            }
        };

        const logout = () => {
            config.github.token = '';
            localStorage.removeItem('github_token');
            isAuthenticated.value = false;
            showTokenForm.value = false;
            showEditForm.value = false;
            newContent.value = '';
            tokenInput.value = '';
            tokenError.value = '';

            // Reload so a private repository stops showing protected content.
            loadPage(currentPage.value || 'index');
        };

        const saveContent = async () => {
            try {
                const base64Content = btoa(unescape(encodeURIComponent(newContent.value)));
                let sha = '';

                // Intentar obtener el sha del archivo si existe
                try {
                    const fileResponse = await axios.get(contentsUrl(currentPage.value), {
                        headers: githubHeaders()
                    });
                    sha = fileResponse.data.sha;
                } catch (error) {
                    // El archivo no existe, es una creación nueva
                    console.log('Creating new file');
                }

                // Preparar el payload para la actualización
                const payload = {
                    message: `Add/Update ${currentPage.value}.md`,
                    content: base64Content,
                    branch: config.github.branch
                };

                // Agregar sha solo si existe (actualización)
                if (sha) {
                    payload.sha = sha;
                }
                        
                // Commit a la rama principal
                await axios.put(contentsUrl(currentPage.value), payload, {
                    headers: githubHeaders()
                });

                content.value = marked(newContent.value);
                showEditForm.value = false;
                
            } catch (error) {
                console.error('Error saving content:', error);
                if (error.response && error.response.status === 401) {
                    config.github.token = '';
                    localStorage.removeItem('github_token');
                    isAuthenticated.value = false;
                    alert('Your session expired. Please log in again.');
                    openTokenForm();
                } else {
                    alert('Error saving content');
                }
            }
        };

        const editContent = () => {
            newContent.value = rawContent.value;
            showEditForm.value = true;
        };

        const cancelEdit = () => {
            showEditForm.value = false;
            newContent.value = '';
        };

        return {
            content,
            showEditForm,
            newContent,
            currentPage,
            isAuthenticated,
            authRequired,
            showTokenForm,
            tokenInput,
            tokenError,
            savingToken,
            loading,
            openTokenForm,
            cancelTokenForm,
            saveToken,
            logout,
            saveContent,
            editContent,
            cancelEdit
        }
    },
};

export default App;

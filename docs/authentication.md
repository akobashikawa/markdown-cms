# Autenticación en GitHub CMS 101

Este documento explica por qué el sitio no puede ofrecer un botón de "Login with GitHub" basado en OAuth sin añadir un backend, y qué alternativa usa la aplicación. Está dirigido a quien mantenga el proyecto.

## Contexto

- El sitio se publica como archivos estáticos (GitHub Pages): no hay servidor propio.
- La lectura de `pages/*.md` usa la API REST pública de GitHub.
- Editar requiere crear commits en el repositorio, es decir, credenciales con permiso de escritura.

## Resumen de flujos

| Flujo | ¿Necesita secreto? | ¿Funciona en el navegador? | Motivo |
| --- | --- | --- | --- |
| Personal Access Token (actual) | No | Sí | El usuario pega el token manualmente |
| OAuth web flow | Sí (`client_secret`) | No | Un sitio estático no puede guardar secretos |
| OAuth Device Flow | No | No | GitHub no envía cabeceras CORS en `github.com/login/*` |
| Implicit flow | No | No | GitHub no lo soporta |

## OAuth web flow

Sería el flujo "clásico" de un botón de login:

```text
1. Navegador  → GET  https://github.com/login/oauth/authorize?client_id=...&scope=repo
2. GitHub     → redirige de vuelta con ?code=...
3. Servidor   → POST https://github.com/login/oauth/access_token
                       client_id=...
                       client_secret=...   ← obligatorio
                       code=...
4. GitHub     → access_token
```

El paso 3 exige `client_secret`. En un sitio estático ese valor acabaría en el JavaScript y sería público: cualquiera podría suplantar la OAuth App y GitHub revocaría el secreto al detectarlo. Por eso no puede hacerse sin un componente servidor.

GitHub soporta PKCE (`code_challenge` / `code_verifier`), pero **no elimina la necesidad del `client_secret`**: PKCE protege la interceptación del `code`, no autentica al cliente.

## OAuth Device Flow

Este flujo **no necesita `client_secret`** y por eso parecía ideal. GitHub lo describe como el flujo para "apps sin acceso a un navegador" (CLI, Git Credential Manager):

```text
1. POST https://github.com/login/device/code       → device_code + user_code
2. El usuario entra el user_code en https://github.com/login/device
3. POST https://github.com/login/oauth/access_token (polling) → access_token
```

El problema es CORS:

- El navegador solo permite leer respuestas de otro origen si el servidor incluye `Access-Control-Allow-Origin`.
- GitHub habilita CORS en `api.github.com`, pero **no** en los endpoints `github.com/login/*`.
- La documentación de GitHub advierte que los preflight `OPTIONS` no están soportados en el endpoint de autorización.

Se puede comprobar con `curl` (endpoint correcto, sin cabecera CORS):

```bash
curl -i -X POST https://github.com/login/device/code \
  -H 'Accept: application/json' \
  -H 'Origin: http://localhost:5500' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'client_id=<CLIENT_ID>&scope=repo'
```

Devuelve `200` con JSON, pero sin `Access-Control-Allow-Origin`, así que el navegador bloquea la lectura. Lo mismo ocurre con el polling a `/login/oauth/access_token`.

Además, su experiencia no es la de un login directo: hay que copiar un código de 8 caracteres en otra página.

> Nota: `https://github.com/login/oauth/device/code` (la ruta que se usó en una versión anterior) no existe y responde `422`. La ruta correcta es `https://github.com/login/device/code`.

## Implicit flow

GitHub no soporta el grant implícito (`response_type=token`); la documentación indica explícitamente que no está soportado.

## Opciones para un login de un clic

Todas requieren una pieza fuera de GitHub Pages:

1. **Proxy OAuth en una función serverless** (Cloudflare Worker, Netlify/Vercel Function):
   - `/login` redirige a `github.com/login/oauth/authorize`.
   - `/callback` canjea el `code` con el `client_secret` (guardado como variable de entorno) y devuelve el token al navegador, por ejemplo con `postMessage`.
   - Ventaja: botón real de un clic. Coste: una cuenta/servicio extra y mantener la callback URL.
2. **GitHub App con proxy**: permisos finos y tokens de corta duración por instalación. Más configuración.
3. **Proveedor OAuth de terceros**: es lo que usan CMS estáticos como Decap CMS, que mantienen su propio servicio de OAuth por este mismo motivo.
4. **PAT con guía**: sin infraestructura, pero requiere que el usuario cree un token.

En todos los casos el token termina en el navegador si la app llama directamente a la API, así que el riesgo de XSS es equivalente al del PAT. Para evitarlo habría que proxyar también las escrituras a la API.

## Implementación actual: PAT guiado

La aplicación usa un token fine-grained con permiso **Contents: Read and write**:

- El modal de login enlaza a la creación de token con estos parámetros prellenados: `name`, `description`, `target_name`, `expires_in` y `contents=write`.
- El usuario debe elegir manualmente **Only select repositories** y el repositorio (ver limitación más abajo).
- El modal resalta ese paso y ofrece un botón **Copy** con `owner/repo` para pegarlo en el buscador de repositorios de GitHub.
- Al guardar, `js/components/App.js` valida con dos peticiones:
  - `GET /repos/{owner}/{repo}`: comprueba que el token llega al repositorio y que `permissions.push` es `true`.
  - `GET /user`: obtiene el login que se muestra en la cabecera.
- Se guarda en `localStorage`: `github_token`, `github_user` y, si GitHub la informa, `github_token_expires`.
- Si una petición devuelve `401`, el token se descarta y se reintenta la lectura sin credenciales. Si el repositorio es privado, se muestra el aviso de login.
- `Logout` limpia el token y recarga la página.

### Limitación: acceso a repositorios

La URL de plantilla de GitHub (`/settings/personal-access-tokens/new`) solo admite los parámetros documentados `name`, `description`, `target_name`, `expires_in` y los de permisos (`contents`, `issues`, …). **No existe un parámetro documentado para el tipo de acceso ni para la lista de repositorios**, así que la página siempre se abre con **All repositories** seleccionado.

Alternativas descartadas:

- Añadir parámetros no documentados (por ejemplo `repositories[]=`): GitHub los ignora y podrían cambiar sin aviso; no es fiable.
- Crear el token vía API (`POST /user/personal-access-tokens`): requiere un token con permisos de administración, lo que exige otro PAT y anula la ventaja de seguridad.
- Instalar una GitHub App: permitiría preseleccionar el repositorio, pero necesita backend para el canje OAuth (ver arriba).

Mitigación aplicada: el paso de **Repository access** se muestra resaltado, con el nombre `owner/repo` y un botón de copiado, y se advierte de que GitHub abre esa página con "All repositories".

## Seguridad

- `localStorage` es accesible desde JavaScript: cualquier XSS podría leer el token. No se debe inyectar HTML no confiable (el contenido Markdown se renderiza con `marked`, sin sanitizador).
- Usar permisos mínimos (solo ese repositorio, solo Contents) y una expiración corta.
- El token se puede revocar en cualquier momento desde la configuración de GitHub.
- Un `client_secret` de OAuth App **nunca** debe commitearse ni incluirse en el frontend.

## Referencias

- Autorización de OAuth Apps: <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps>
- Creación de tokens fine-grained (incluye parámetros de prellenado): <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens>
- CORS: <https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS>

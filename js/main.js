import { createApp } from 'vue'
import router from './router.js'
import App from './components/App.js'
import config from './config.js'

// Keep the tab title in sync with the configured site name.
document.title = config.site.name

const app = createApp(App)
app.use(router)
app.mount('#app')

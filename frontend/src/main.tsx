import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { setupVersionCheck } from './lib/versionCheck'

// Registrar service worker para PWA + push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[SW] registrado:', reg.scope))
      .catch((err) => console.warn('[SW] error:', err))
  })
}

// Auto-actualización: si hay un build nuevo deployado, la PWA se recarga sola (sin Ctrl+Shift+R).
setupVersionCheck()

const container = document.getElementById('root')!

const tree = (
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

// Las rutas publicas (/, /tutores, /faq, ...) se prerenderean con Puppeteer
// para SEO. Pero hydrateRoot fallaba con errores #425/#418/#423 porque el HTML
// prerenderizado no matchea exactamente con lo que renderiza el cliente
// (theme desde localStorage, auth state, fechas dinamicas, etc).
//
// Solucion: siempre createRoot. El HTML prerenderizado sigue ahi para los bots
// de Google (SEO), pero un usuario humano hace un mount limpio sin riesgo de
// mismatch. Si #root viene con contenido prerenderizado, lo vaciamos antes
// para que React no intente reusar/hidratar nada.
if (container.hasChildNodes()) {
  container.innerHTML = ''
}
ReactDOM.createRoot(container).render(tree)

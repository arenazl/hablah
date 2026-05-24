import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'

// Registrar service worker para PWA + push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[SW] registrado:', reg.scope))
      .catch((err) => console.warn('[SW] error:', err))
  })
}

const container = document.getElementById('root')!

const tree = (
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)

// Si el HTML viene prerenderizado (tiene contenido dentro de #root), hidratamos
// para "tomar" ese HTML sin re-pintar ni parpadear. Si está vacío (rutas de la
// app servidas por el fallback SPA), renderizamos normal.
if (container.hasChildNodes()) {
  ReactDOM.hydrateRoot(container, tree)
} else {
  ReactDOM.createRoot(container).render(tree)
}

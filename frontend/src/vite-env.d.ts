/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_SHORT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Inyectada por vite.config (define) — versión del build para el auto-update de la PWA.
declare const __APP_VERSION__: string

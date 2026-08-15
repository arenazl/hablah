import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

// Versión del kit auto-update (guía 6-GUIA-PWA): nº de commits + short SHA — sube en
// cada deploy. Fallback: COMMIT_REF de Netlify (clone shallow sin count) o 'dev'.
function appVersion(): string {
  try {
    const count = execSync('git rev-list --count HEAD').toString().trim()
    const sha = execSync('git rev-parse --short HEAD').toString().trim()
    return `${count}.${sha}`
  } catch {
    const ref = process.env.COMMIT_REF || process.env.VITE_COMMIT_REF
    return ref ? ref.slice(0, 7) : 'dev'
  }
}
const APP_VERSION = appVersion()

export default defineConfig({
  plugins: [
    react(),
    {
      // Emite dist/version.json con la versión del build → la app la compara y avisa
      // con un popup (el usuario dispara la recarga; ver src/lib/versionCheck.ts).
      name: 'emit-version-json',
      closeBundle() {
        try { writeFileSync('dist/version.json', JSON.stringify({ version: APP_VERSION })) } catch { /* dev */ }
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  server: {
    port: 5200,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8200',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          icons: ['lucide-react'],
          toast: ['sonner'],
        },
      },
    },
  },
})

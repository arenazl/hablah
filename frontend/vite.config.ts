import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

// Versión por commit (cambia en cada deploy). Netlify expone COMMIT_REF; fallback a git.
function appVersion(): string {
  const ref = process.env.COMMIT_REF || process.env.VITE_COMMIT_REF
  if (ref) return ref.slice(0, 7)
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
}
const APP_VERSION = appVersion()

export default defineConfig({
  plugins: [
    react(),
    {
      // Emite dist/version.json con la versión del build → la app lo consulta y se auto-recarga.
      name: 'emit-version-json',
      closeBundle() {
        try { writeFileSync('dist/version.json', JSON.stringify({ version: APP_VERSION })) } catch { /* dev */ }
      },
    },
  ],
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
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

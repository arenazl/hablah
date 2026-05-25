import { Component, ErrorInfo, ReactNode } from 'react'

import { API_BASE_URL } from '../services/api'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary global. Si la app crashea en cualquier parte:
 *  1. Postea el error al backend (/api/errors/frontend) con stack + URL + user.
 *  2. Muestra una pantalla amigable en vez de pantalla blanca.
 *  3. Ofrece un boton "Recargar" que ademas desregistra el SW (por las dudas).
 *
 * Esto NO previene el bug — lo amortigua. El smoke test pre-deploy es el que
 * captura regresiones antes de que lleguen a usuarios.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void this.reportError(error, info)
  }

  private async reportError(error: Error, info: ErrorInfo): Promise<void> {
    try {
      const payload = {
        message: error.message || String(error),
        stack: error.stack || '',
        component_stack: info.componentStack || '',
        url: window.location.href,
        user_agent: navigator.userAgent,
        ts: new Date().toISOString(),
      }
      await fetch(`${API_BASE_URL}/errors/frontend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      })
    } catch {
      // si ni siquiera podemos reportar, no hagamos crash en el boundary
    }
  }

  private handleReload = (): void => {
    try {
      // Desregistrar SW por las dudas (cache stale puede ser la causa)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          for (const r of regs) {
            void r.unregister()
          }
          window.location.reload()
        }).catch(() => window.location.reload())
      } else {
        window.location.reload()
      }
    } catch {
      window.location.reload()
    }
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'rgba(0,179,126,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00B37E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.83.93 6.6 2.46" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
            Se trabó algo
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#cbd5e1', margin: '0 0 24px' }}>
            La app encontró un error inesperado. Ya lo reportamos automáticamente.
            Recargá la página y seguís donde quedaste.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 28px',
              borderRadius: 10,
              border: 'none',
              background: '#00B37E',
              color: '#0f172a',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recargar app
          </button>
          {this.state.error?.message && (
            <details style={{ marginTop: 24, fontSize: 11, color: '#64748b' }}>
              <summary style={{ cursor: 'pointer' }}>Detalle técnico</summary>
              <pre style={{
                marginTop: 8,
                padding: 10,
                background: '#1e293b',
                borderRadius: 6,
                fontSize: 10,
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: 200,
              }}>
                {this.state.error.message}
                {this.state.error.stack ? '\n\n' + this.state.error.stack : ''}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}

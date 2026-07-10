// Laboratorio del motor (WO F0-04, docs/03-rework/02-hoja-de-ruta.md).
//
// Arbol completo de rutas /lab/*. Este modulo se carga con React.lazy() desde App.tsx, asi que
// ningun panel de laboratorio entra en el bundle inicial del producto. Cada panel individual
// TAMBIEN sigue siendo lazy() aca adentro (mismo patron que ya tenian en App.tsx), asi que
// ademas quedan en chunks separados por panel: visitar /lab/finaltest no baja el codigo de
// /lab/infra ni de ningun otro.
//
// Guard de acceso: lo aplica App.tsx (AuthGate) al montar <Route path="/lab/*">, NO aca adentro
// — un solo mecanismo de sesion (el mismo AuthGate que ya protege /admin/*), no duplicarlo.
import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

const LlmTestPage = lazy(() => import('../LlmTestPage').then(m => ({ default: m.LlmTestPage })))
const TestFinalConsole = lazy(() => import('../TestFinalConsole'))
const MiniTestPanel = lazy(() => import('../MiniTestPanel'))
const AuditoriaPanel = lazy(() => import('../AuditoriaPanel'))
const ComparacionPanel = lazy(() => import('../ComparacionPanel'))
const TranscripcionesPanel = lazy(() => import('../TranscripcionesPanel'))
const TranscripcionesVocabPanel = lazy(() => import('../TranscripcionesVocabPanel'))
const InfraTestPanel = lazy(() => import('../InfraTestPanel'))
const AudioTuningPage = lazy(() =>
  import('../AudioTuningPage').then(m => ({ default: m.AudioTuningPage })),
)
const LabClase = lazy(() => import('./LabClase'))
const KidsKitPanel = lazy(() => import('../kids/KidsKitPanel'))
const KidsGaleriaPanel = lazy(() => import('../kids/KidsGaleriaPanel'))
const KidsCurarPanel = lazy(() => import('../kids/KidsCurarPanel'))

export default function LabRoutes() {
  return (
    <Routes>
      {/* /lab a secas: no hay panel "indice", mandamos a la consola de clases (la mas usada) */}
      <Route index element={<Navigate to="finaltest" replace />} />
      <Route path="llm" element={<LlmTestPage />} />
      <Route path="finaltest" element={<TestFinalConsole />} />
      <Route path="mini-test" element={<MiniTestPanel />} />
      <Route path="auditoria" element={<AuditoriaPanel />} />
      <Route path="comparacion" element={<ComparacionPanel />} />
      <Route path="transcripciones" element={<TranscripcionesPanel />} />
      <Route path="transcripciones-vocab" element={<TranscripcionesVocabPanel />} />
      <Route path="infra" element={<InfraTestPanel />} />
      <Route path="tune" element={<AudioTuningPage />} />
      <Route path="clase" element={<LabClase />} />
      <Route path="kids/kit" element={<KidsKitPanel />} />
      <Route path="kids/galeria" element={<KidsGaleriaPanel />} />
      <Route path="kids/curar" element={<KidsCurarPanel />} />
      <Route path="*" element={<Navigate to="/lab/finaltest" replace />} />
    </Routes>
  )
}

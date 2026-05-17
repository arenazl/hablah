export function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <h1
        className="text-3xl font-bold mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        LinguaFlow
      </h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Plataforma adaptativa de aprendizaje de idiomas
      </p>
      <p className="mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        S0 bootstrap OK. Próximo sprint: modelo de datos.
      </p>
    </div>
  )
}

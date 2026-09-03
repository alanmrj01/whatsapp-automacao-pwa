export function LoadingState() {
  return (
    <div className="state-card" aria-live="polite" aria-busy="true">
      <span className="loading-spinner" aria-hidden="true" />
      <h2>Carregando informações</h2>
      <p>Aguarde um instante.</p>
    </div>
  )
}

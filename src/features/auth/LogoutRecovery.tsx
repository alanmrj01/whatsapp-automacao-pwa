import { SessionActions } from './SessionActions'

export function LogoutRecovery() {
  return <main className="auth-boundary page-stack">
    <h1>Confirme a saída</h1>
    <p role="alert">O acesso neste app foi bloqueado, mas a sessão ainda não foi revogada no servidor. Reconecte e tente sair novamente.</p>
    <SessionActions />
  </main>
}

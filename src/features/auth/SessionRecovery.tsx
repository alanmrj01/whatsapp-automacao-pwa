import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { BrandMark } from '../../components/BrandMark'
import { PrimaryButton } from '../../components/PrimaryButton'
import { useAuth } from './useAuth'

export function SessionRecovery() {
  const auth = useAuth()
  const [reconnecting, setReconnecting] = useState(false)
  const [leaving, setLeaving] = useState(false)

  async function reconnect() {
    setReconnecting(true)
    try { await auth.reconnect() }
    finally { setReconnecting(false) }
  }

  async function leave() {
    setLeaving(true)
    try { await auth.logout() }
    finally { setLeaving(false) }
  }

  return <main className="login-page session-recovery-page">
    <div className="login-brand"><BrandMark /><strong>Alovia</strong></div>
    <section className="login-card session-recovery-card">
      <span className="eyebrow">Sessão protegida</span>
      <h1>Vamos retomar sua sessão</h1>
      <p>Sua conexão oscilou e o acesso foi pausado por segurança. Reconecte para continuar de onde parou.</p>
      <div className="session-recovery-actions">
        <PrimaryButton
          fullWidth
          icon={<RefreshCw size={19} />}
          disabled={reconnecting || leaving}
          aria-busy={reconnecting}
          onClick={() => void reconnect()}
        >
          {reconnecting ? 'Reconectando…' : 'Reconectar'}
        </PrimaryButton>
        <button
          type="button"
          className="auth-secondary-button"
          disabled={reconnecting || leaving}
          onClick={() => void leave()}
        >
          {leaving ? 'Saindo…' : 'Sair da conta'}
        </button>
      </div>
      <p className="auth-footnote">Se a internet estiver lenta, a Alovia tenta recuperar sua sessão primeiro.</p>
    </section>
  </main>
}

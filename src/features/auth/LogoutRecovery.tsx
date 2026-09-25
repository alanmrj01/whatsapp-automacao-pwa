import { RefreshCw, LogIn } from 'lucide-react'
import { useState } from 'react'
import { BrandMark } from '../../components/BrandMark'
import { PrimaryButton } from '../../components/PrimaryButton'
import { useAuth } from './useAuth'

export function LogoutRecovery() {
  const auth = useAuth()
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState('')

  async function retry() {
    setRetrying(true)
    setError('')
    try {
      await auth.retryPendingLogout()
    } catch {
      setError('Ainda não foi possível falar com o servidor. Você pode tentar novamente ou voltar ao login.')
    } finally {
      setRetrying(false)
    }
  }

  function continueToLogin() {
    auth.continueToLogin()
  }

  return <main className="login-page session-recovery-page">
    <div className="login-brand"><BrandMark /><strong>Alovia</strong></div>
    <section className="login-card session-recovery-card">
      <span className="eyebrow">Recuperação de sessão</span>
      <h1>Não foi possível concluir a saída</h1>
      <p role="alert">
        A conexão com o servidor falhou durante a saída. A Alovia tenta concluir
        automaticamente quando a conexão volta.
      </p>
      <div className="session-recovery-actions">
        <PrimaryButton
          fullWidth
          icon={<RefreshCw size={19} />}
          disabled={retrying}
          aria-busy={retrying}
          onClick={() => void retry()}
        >
          {retrying ? 'Tentando novamente…' : 'Tentar novamente'}
        </PrimaryButton>
        <button
          type="button"
          className="auth-secondary-button"
          disabled={retrying}
          onClick={continueToLogin}
        >
          <LogIn size={18} />
          Voltar para entrar
        </button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="auth-footnote">
        Este estado não bloqueia mais o aplicativo permanentemente.
      </p>
    </section>
  </main>
}

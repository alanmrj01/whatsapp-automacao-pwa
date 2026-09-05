import { Eye, EyeOff } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { BrandMark } from '../../components/BrandMark'
import { LoadingState } from '../../components/LoadingState'
import { PrimaryButton } from '../../components/PrimaryButton'
import { ApiError } from '../../lib/httpClient'
import { LogoutRecovery } from './LogoutRecovery'
import { SessionRecovery } from './SessionRecovery'
import { homeFor } from './types'
import { useAuth } from './useAuth'

export function SignupPage() {
  const auth = useAuth()
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const idempotencyKey = useRef('')

  if (auth.state === 'logout_failed') return <LogoutRecovery />
  if (auth.state === 'unavailable') return <SessionRecovery />
  if (auth.state === 'loading' || auth.state === 'logging_out') return <div className="auth-boundary"><LoadingState /></div>
  if (auth.user) return <Navigate to={homeFor(auth.user)} replace />

  function resetAttempt() {
    idempotencyKey.current = ''
    setError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirmation) {
      setError('As senhas precisam ser iguais.')
      return
    }
    const key = idempotencyKey.current || crypto.randomUUID()
    idempotencyKey.current = key
    setBusy(true)
    setError('')
    try {
      await auth.signup(businessName.trim(), email.trim(), password, key)
      idempotencyKey.current = ''
    } catch (failure) {
      const transient = failure instanceof ApiError && (failure.status === 0 || failure.status >= 500)
      if (!transient) idempotencyKey.current = ''
      setError(
        failure instanceof ApiError && failure.status === 409
          ? 'Este e-mail já está cadastrado. Entre com sua conta ou use outro e-mail.'
          : failure instanceof ApiError && failure.status === 429
            ? 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'
            : failure instanceof ApiError && failure.status === 422
              ? 'Revise os dados. A senha precisa ter pelo menos 12 caracteres.'
              : transient
                ? 'A conexão oscilou durante o cadastro. Tente novamente: a Alovia reutilizará a mesma solicitação sem duplicar sua empresa.'
                : 'Não foi possível criar sua conta. Revise os dados e tente novamente.',
      )
    } finally {
      setPassword('')
      setConfirmation('')
      setBusy(false)
    }
  }

  return <main className="login-page signup-page">
    <div className="login-brand"><BrandMark /><strong>Alovia</strong></div>
    <section className="login-card signup-card">
      <span className="eyebrow">Conheça antes de decidir</span>
      <h1>Crie sua conta grátis</h1>
      <p>Veja como a Alovia organiza atendimento, agenda e rotina técnica da sua operação.</p>
      <form onSubmit={event => void submit(event)} className="auth-form">
        <label htmlFor="signup-business">Nome da empresa</label>
        <input
          id="signup-business"
          autoComplete="organization"
          maxLength={255}
          minLength={2}
          required
          value={businessName}
          onChange={event => { setBusinessName(event.target.value); resetAttempt() }}
          disabled={busy}
          placeholder="Ex.: João Refrigeração"
        />

        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          required
          value={email}
          onChange={event => { setEmail(event.target.value); resetAttempt() }}
          disabled={busy}
        />

        <label htmlFor="signup-password">Senha</label>
        <div className="password-field">
          <input
            id="signup-password"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={12}
            maxLength={1024}
            required
            value={password}
            onChange={event => { setPassword(event.target.value); resetAttempt() }}
            disabled={busy}
            placeholder="Mínimo de 12 caracteres"
          />
          <button type="button" className="icon-button" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible} onClick={() => setVisible(!visible)}>
            {visible ? <EyeOff size={20}/> : <Eye size={20}/>}
          </button>
        </div>

        <label htmlFor="signup-confirmation">Confirme a senha</label>
        <input
          id="signup-confirmation"
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          minLength={12}
          maxLength={1024}
          required
          value={confirmation}
          onChange={event => { setConfirmation(event.target.value); resetAttempt() }}
          disabled={busy}
        />

        {error && <p className="form-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" fullWidth disabled={busy} aria-busy={busy}>
          {busy ? 'Criando sua conta…' : 'Criar conta grátis'}
        </PrimaryButton>
      </form>

      <div className="auth-choice">
        <strong>Já tem uma conta?</strong>
        <Link to="/login" className="auth-secondary-link">Entrar</Link>
      </div>
      <p className="auth-footnote">Sem compromisso agora. Você conhece primeiro, decide depois.</p>
    </section>
  </main>
}

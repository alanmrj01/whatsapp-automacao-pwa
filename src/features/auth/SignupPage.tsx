import { Eye, EyeOff } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { trackEvent, trackEventOnce } from '../../lib/tracking'
import { Link, Navigate, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const idempotencyKey = useRef('')
  const started = useRef(false)

  if (auth.state === 'logout_failed') return <LogoutRecovery />
  if (auth.state === 'unavailable') return <SessionRecovery />
  if (auth.state === 'loading' || auth.state === 'logging_out') return <div className="auth-boundary"><LoadingState /></div>
  if (auth.user) return <Navigate to={homeFor(auth.user)} replace />

  function markStarted() {
    if (started.current) return
    started.current = true
    trackEvent('signup_started', {}, {surface:'signup'})
  }

  function resetAttempt() {
    idempotencyKey.current = ''
    setError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    markStarted()
    trackEvent('signup_submit', {}, {surface:'signup'})
    if (password !== confirmation) {
      trackEvent('signup_failed', {reason:'password_mismatch'}, {surface:'signup'})
      setError('As senhas precisam ser iguais.')
      return
    }
    const key = idempotencyKey.current || crypto.randomUUID()
    idempotencyKey.current = key
    let preserveAttempt = false
    setBusy(true)
    setError('')
    try {
      const createdUser = await auth.signup(businessName.trim(), email.trim(), password, key)
      idempotencyKey.current = ''
      const createdMembership = createdUser.memberships.find(item=>item.business_id===createdUser.active_business_id)
      trackEventOnce(`signup_completed:${createdUser.active_business_id}`, 'signup_completed', {
        funnel_stage:'registration_completed',
        access_mode:createdMembership?.access_mode ?? null,
        account_state:createdMembership?.account_state ?? null,
      }, {
        surface:'signup',
        businessId:createdUser.active_business_id,
        userId:createdUser.id,
      })
      const preactivation = createdMembership?.access_mode === 'free'
        && createdMembership?.has_had_operational_access !== true
      if(preactivation) {
        trackEventOnce(
          `preactivation_started:${createdUser.active_business_id}`,
          'preactivation_started',
          {
            funnel_stage:'demo_access_ready',
            whatsapp_connection_available:true,
          },
          {
            surface:'signup',
            businessId:createdUser.active_business_id,
            userId:createdUser.id,
          },
        )
      }
      navigate(homeFor(createdUser), {replace:true})
    } catch (failure) {
      const transient = failure instanceof ApiError && (failure.status === 0 || failure.status >= 500)
      preserveAttempt = transient
      if (!transient) idempotencyKey.current = ''
      trackEvent('signup_failed', {reason: failure instanceof ApiError ? String(failure.status) : 'unknown'}, {surface:'signup'})
      setError(
        failure instanceof ApiError && failure.status === 409
          ? 'Este e-mail já está cadastrado. Entre com sua conta ou use outro e-mail.'
          : failure instanceof ApiError && failure.status === 429
            ? 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'
            : failure instanceof ApiError && failure.status === 422
              ? 'Revise os dados. A senha precisa ter pelo menos 8 caracteres.'
              : transient
                ? 'A conexão oscilou durante o cadastro. Tente novamente: a Alovia reutilizará a mesma solicitação sem duplicar sua empresa.'
                : 'Não foi possível criar sua conta. Revise os dados e tente novamente.',
      )
    } finally {
      // If the response may have been lost after the server committed, keep the
      // exact payload in memory so the next click can safely reuse the same UUID.
      if (!preserveAttempt) {
        setPassword('')
        setConfirmation('')
      }
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
          onChange={event => { markStarted(); setBusinessName(event.target.value); resetAttempt() }}
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
          onChange={event => { markStarted(); setEmail(event.target.value); resetAttempt() }}
          disabled={busy}
        />

        <label htmlFor="signup-password">Senha</label>
        <div className="password-field">
          <input
            id="signup-password"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={8}
            maxLength={1024}
            required
            value={password}
            onChange={event => { markStarted(); setPassword(event.target.value); resetAttempt() }}
            disabled={busy}
            placeholder="Mínimo de 8 caracteres"
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
          minLength={8}
          maxLength={1024}
          required
          value={confirmation}
          onChange={event => { markStarted(); setConfirmation(event.target.value); resetAttempt() }}
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

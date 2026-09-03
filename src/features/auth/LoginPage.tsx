import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { BrandMark } from '../../components/BrandMark'
import { PrimaryButton } from '../../components/PrimaryButton'
import { LoadingState } from '../../components/LoadingState'
import { ApiError } from '../../lib/httpClient'
import { useAuth } from './useAuth'
import { homeFor } from './types'
import { LogoutRecovery } from './LogoutRecovery'

export function LoginPage() {
  const auth = useAuth()
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [visible,setVisible] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  if (auth.state === 'logout_failed') return <LogoutRecovery />
  if (auth.state === 'loading' || auth.state === 'logging_out') return <div className="auth-boundary"><LoadingState /></div>
  if (auth.user) return <Navigate to={homeFor(auth.user)} replace />

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    try { await auth.login(email,password) }
    catch (failure) { setError(failure instanceof ApiError && failure.status === 401 ? 'Email ou senha incorretos.' : 'Não foi possível entrar. Verifique a conexão e tente novamente.') }
    finally { setPassword(''); setBusy(false) }
  }

  return <main className="login-page">
    <div className="login-brand"><BrandMark /><strong>Alôvia</strong></div>
    <section className="login-card">
      <span className="eyebrow">Seu atendimento, em um só lugar</span>
      <h1>Bom ter você aqui</h1>
      <p>Entre para acompanhar sua empresa e suas conversas.</p>
      <form onSubmit={submit} className="auth-form">
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required value={email} onChange={event=>setEmail(event.target.value)} disabled={busy} />
        <label htmlFor="login-password">Senha</label>
        <div className="password-field">
          <input id="login-password" type={visible?'text':'password'} autoComplete="current-password" required maxLength={1024} value={password} onChange={event=>setPassword(event.target.value)} disabled={busy} />
          <button type="button" className="icon-button" aria-label={visible?'Ocultar senha':'Mostrar senha'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={20}/>:<Eye size={20}/>}</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" fullWidth disabled={busy} aria-busy={busy}>{busy?'Entrando…':'Entrar'}</PrimaryButton>
      </form>
      <div className="login-security"><LockKeyhole size={17}/><span>Acesso seguro à sua empresa</span></div>
    </section>
  </main>
}

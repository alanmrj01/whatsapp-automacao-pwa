import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrandMark } from '../../components/BrandMark'
import { PrimaryButton } from '../../components/PrimaryButton'
import { api } from '../../lib/api'
import { ApiError } from '../../lib/httpClient'

function AuthBrand() {
  return <div className="login-brand"><BrandMark /><strong>Alovia</strong></div>
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.forgotPassword(email.trim())
      setSent(true)
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.status === 429
          ? 'Muitas solicitações em pouco tempo. Aguarde um pouco e tente novamente.'
          : failure instanceof ApiError && failure.status === 503
            ? 'A recuperação de senha está temporariamente indisponível.'
            : 'Não foi possível enviar a solicitação. Verifique sua conexão e tente novamente.',
      )
    } finally {
      setBusy(false)
    }
  }

  return <main className="login-page password-recovery-page">
    <AuthBrand />
    <section className="login-card">
      <span className="eyebrow">Recuperação de acesso</span>
      <h1>Esqueceu sua senha?</h1>
      {sent
        ? <>
            <p>Se existir uma conta com este e-mail, você receberá as instruções para redefinir sua senha.</p>
            <div className="auth-status-note" role="status">
              <LockKeyhole size={18}/>
              <span>O link é válido por 30 minutos e pode ser usado uma única vez.</span>
            </div>
            <Link to="/login" className="auth-secondary-link auth-secondary-link--standalone">Voltar para entrar</Link>
          </>
        : <>
            <p>Informe o e-mail usado na Alovia. Enviaremos um link seguro para criar uma nova senha.</p>
            <form onSubmit={event => void submit(event)} className="auth-form">
              <label htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                disabled={busy}
              />
              {error && <p className="form-error" role="alert">{error}</p>}
              <PrimaryButton type="submit" fullWidth disabled={busy} aria-busy={busy}>
                {busy ? 'Enviando…' : 'Enviar link de recuperação'}
              </PrimaryButton>
            </form>
            <Link to="/login" className="auth-secondary-link auth-secondary-link--standalone">Voltar para entrar</Link>
          </>}
    </section>
  </main>
}

export function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = new URLSearchParams(location.hash.replace(/^#/, '')).get('token')?.trim() ?? ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 12) {
      setError('A nova senha precisa ter pelo menos 12 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('As senhas precisam ser iguais.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api.resetPassword(token, password)
      navigate('/redefinir-senha', {replace:true})
      setPassword('')
      setConfirmation('')
      setDone(true)
    } catch (failure) {
      setPassword('')
      setConfirmation('')
      setError(
        failure instanceof ApiError && failure.status === 400
          ? 'Este link é inválido, expirou ou já foi usado. Solicite um novo link.'
          : failure instanceof ApiError && failure.status === 503
            ? 'A recuperação de senha está temporariamente indisponível.'
            : 'Não foi possível redefinir sua senha. Verifique sua conexão e tente novamente.',
      )
    } finally {
      setBusy(false)
    }
  }

  return <main className="login-page password-recovery-page">
    <AuthBrand />
    <section className="login-card">
      <span className="eyebrow">Segurança da conta</span>
      <h1>{done ? 'Senha atualizada' : 'Crie uma nova senha'}</h1>
      {done
        ? <>
            <p>Sua senha foi alterada e as sessões anteriores foram encerradas.</p>
            <Link to="/login" className="auth-secondary-link auth-secondary-link--standalone auth-secondary-link--primary">Entrar com a nova senha</Link>
          </>
        : !token
          ? <>
              <p>Este link de recuperação não é válido.</p>
              <Link to="/esqueci-senha" className="auth-secondary-link auth-secondary-link--standalone auth-secondary-link--primary">Solicitar novo link</Link>
            </>
          : <>
              <p>Use pelo menos 12 caracteres. Ao concluir, as sessões anteriores serão encerradas.</p>
              <form onSubmit={event => void submit(event)} className="auth-form">
                <label htmlFor="reset-password">Nova senha</label>
                <div className="password-field">
                  <input
                    id="reset-password"
                    type={visible ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={1024}
                    required
                    value={password}
                    onChange={event => { setPassword(event.target.value); setError('') }}
                    disabled={busy}
                    placeholder="Mínimo de 12 caracteres"
                  />
                  <button type="button" className="icon-button" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible} onClick={() => setVisible(!visible)}>
                    {visible ? <EyeOff size={20}/> : <Eye size={20}/>}
                  </button>
                </div>
                <label htmlFor="reset-confirmation">Confirme a nova senha</label>
                <input
                  id="reset-confirmation"
                  type={visible ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={1024}
                  required
                  value={confirmation}
                  onChange={event => { setConfirmation(event.target.value); setError('') }}
                  disabled={busy}
                />
                {error && <p className="form-error" role="alert">{error}</p>}
                <PrimaryButton type="submit" fullWidth disabled={busy} aria-busy={busy}>
                  {busy ? 'Atualizando…' : 'Salvar nova senha'}
                </PrimaryButton>
              </form>
              <Link to="/login" className="auth-secondary-link auth-secondary-link--standalone">Voltar para entrar</Link>
            </>}
    </section>
  </main>
}

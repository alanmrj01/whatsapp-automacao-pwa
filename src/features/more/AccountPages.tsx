import { Building2, ChevronLeft, Eye, EyeOff, ExternalLink, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PrimaryButton } from '../../components/PrimaryButton'
import { api } from '../../lib/api'
import { ApiError } from '../../lib/httpClient'
import { useEntitlements } from '../access/useEntitlements'
import { SessionActions } from '../auth/SessionActions'
import { useAuth } from '../auth/useAuth'
import type { MembershipRole } from '../auth/types'

const roleLabels: Record<MembershipRole,string> = {
  owner:'Proprietário',
  admin:'Administrador',
  attendant:'Atendente',
  viewer:'Somente leitura',
}

function AccountHeader({eyebrow,title,description}:{eyebrow:string;title:string;description:string}) {
  return <section className="operational-heading account-heading">
    <div>
      <Link className="account-back" to="/app/mais"><ChevronLeft size={18}/>Configurações</Link>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  </section>
}

export function UserSettingsPage() {
  const {user,membership} = useAuth()
  const entitlement = useEntitlements()
  const accessLabel = entitlement.isPaid ? 'Acesso operacional liberado' : entitlement.isReadOnlyRetained ? 'Acesso pausado · dados preservados' : 'Conta gratuita demonstrativa'

  return <div className="page-stack operational-page compact-page account-page">
    <AccountHeader eyebrow="Conta" title="Usuário" description="Informações da sua conta e do acesso atual."/>
    <section className="account-card">
      <div className="account-detail"><span className="account-detail__icon"><Mail size={19}/></span><div><span>E-mail</span><strong>{user?.email??'—'}</strong></div></div>
      <div className="account-detail"><span className="account-detail__icon"><Building2 size={19}/></span><div><span>Empresa</span><strong>{membership?.business_name??'—'}</strong></div></div>
      <div className="account-detail"><span className="account-detail__icon"><UserRound size={19}/></span><div><span>Perfil</span><strong>{membership?roleLabels[membership.role]:'—'}</strong></div></div>
      <div className="account-detail"><span className="account-detail__icon"><ShieldCheck size={19}/></span><div><span>Acesso</span><strong>{accessLabel}</strong></div></div>
    </section>
    <section className="account-action-section">
      <h2>Sair da conta</h2>
      <p>Encerra a sessão atual e revoga o acesso deste navegador.</p>
      <SessionActions />
    </section>
  </div>
}

export function SecuritySettingsPage() {
  const {state} = useAuth()
  const [currentPassword,setCurrentPassword] = useState('')
  const [newPassword,setNewPassword] = useState('')
  const [confirmation,setConfirmation] = useState('')
  const [visible,setVisible] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [success,setSuccess] = useState('')

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (newPassword.length < 12) {
      setError('A nova senha precisa ter pelo menos 12 caracteres.')
      return
    }
    if (currentPassword === newPassword) {
      setError('A nova senha precisa ser diferente da senha atual.')
      return
    }
    if (newPassword !== confirmation) {
      setError('As novas senhas precisam ser iguais.')
      return
    }
    setBusy(true)
    try {
      await api.changePassword(currentPassword,newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setSuccess('Senha alterada. As outras sessões da sua conta foram encerradas.')
    } catch(failure) {
      const detail = failure instanceof ApiError ? failure.detail : undefined
      setError(
        failure instanceof ApiError && failure.status === 400 && detail === 'Current password is incorrect'
          ? 'A senha atual está incorreta.'
          : failure instanceof ApiError && failure.status === 400 && detail === 'New password must be different'
            ? 'A nova senha precisa ser diferente da senha atual.'
            : failure instanceof ApiError && failure.status === 503
              ? 'A alteração de senha está temporariamente indisponível.'
              : 'Não foi possível alterar sua senha. Verifique a conexão e tente novamente.',
      )
    } finally {
      setBusy(false)
    }
  }

  return <div className="page-stack operational-page compact-page account-page">
    <AccountHeader eyebrow="Conta" title="Segurança" description="Sessão e acesso ao ALOVIA."/>
    <section className="account-card">
      <div className="account-detail"><span className="account-detail__icon"><LockKeyhole size={19}/></span><div><span>Sessão</span><strong>{state==='authenticated'?'Ativa e autenticada':'Verificando sessão'}</strong><small>Seu acesso é validado pelo servidor a cada sessão.</small></div></div>
    </section>
    <section className="account-action-section account-password-section">
      <h2>Alterar senha</h2>
      <p>Use pelo menos 12 caracteres. Por segurança, as outras sessões da sua conta serão encerradas.</p>
      <form className="account-password-form" onSubmit={event=>void submit(event)}>
        <label htmlFor="current-password">Senha atual</label>
        <div className="password-field">
          <input id="current-password" type={visible?'text':'password'} autoComplete="current-password" maxLength={1024} required value={currentPassword} onChange={event=>{setCurrentPassword(event.target.value);setError('');setSuccess('')}} disabled={busy}/>
          <button type="button" className="icon-button" aria-label={visible?'Ocultar senhas':'Mostrar senhas'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={20}/>:<Eye size={20}/>}</button>
        </div>
        <label htmlFor="new-password">Nova senha</label>
        <input id="new-password" type={visible?'text':'password'} autoComplete="new-password" minLength={12} maxLength={1024} required value={newPassword} onChange={event=>{setNewPassword(event.target.value);setError('');setSuccess('')}} disabled={busy} placeholder="Mínimo de 12 caracteres"/>
        <label htmlFor="new-password-confirmation">Confirme a nova senha</label>
        <input id="new-password-confirmation" type={visible?'text':'password'} autoComplete="new-password" minLength={12} maxLength={1024} required value={confirmation} onChange={event=>{setConfirmation(event.target.value);setError('');setSuccess('')}} disabled={busy}/>
        {error&&<p className="form-error" role="alert">{error}</p>}
        {success&&<p className="form-success" role="status">{success}</p>}
        <PrimaryButton type="submit" fullWidth disabled={busy} aria-busy={busy}>{busy?'Alterando…':'Alterar senha'}</PrimaryButton>
      </form>
    </section>
  </div>
}

export function PrivacySettingsPage() {
  return <div className="page-stack operational-page compact-page account-page">
    <AccountHeader eyebrow="Conta" title="Privacidade" description="Documentos e controles relacionados aos seus dados."/>
    <section className="account-links" aria-label="Documentos de privacidade">
      <a href="https://politica-de-privacidade-alovia.netlify.app/politica-de-privacidade/" target="_blank" rel="noreferrer"><span><ShieldCheck size={19}/><strong>Política de Privacidade</strong></span><ExternalLink size={17}/></a>
      <a href="https://politica-de-privacidade-alovia.netlify.app/termos-de-uso/" target="_blank" rel="noreferrer"><span><ShieldCheck size={19}/><strong>Termos de Uso</strong></span><ExternalLink size={17}/></a>
      <a href="https://politica-de-privacidade-alovia.netlify.app/exclusao-de-dados/" target="_blank" rel="noreferrer"><span><ShieldCheck size={19}/><strong>Exclusão de dados</strong></span><ExternalLink size={17}/></a>
    </section>
  </div>
}
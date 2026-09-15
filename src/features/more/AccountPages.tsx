import { Building2, ChevronLeft, ExternalLink, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
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
      <Link className="account-back" to="/app/mais"><ChevronLeft size={18}/>Mais</Link>
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
  </div>
}

export function SecuritySettingsPage() {
  const {state} = useAuth()
  return <div className="page-stack operational-page compact-page account-page">
    <AccountHeader eyebrow="Conta" title="Segurança" description="Sessão e acesso ao ALOVIA."/>
    <section className="account-card">
      <div className="account-detail"><span className="account-detail__icon"><LockKeyhole size={19}/></span><div><span>Sessão</span><strong>{state==='authenticated'?'Ativa e autenticada':'Verificando sessão'}</strong><small>Seu acesso é validado pelo servidor a cada sessão.</small></div></div>
    </section>
    <section className="account-action-section">
      <h2>Sair com segurança</h2>
      <p>Encerra a sessão atual e revoga o acesso deste navegador.</p>
      <SessionActions />
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

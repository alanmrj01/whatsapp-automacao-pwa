import { Building2, CirclePower, Eye, KeyRound, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { BottomSheet } from '../../components/BottomSheet'
import { PrimaryButton } from '../../components/PrimaryButton'
import { ApiError } from '../../lib/httpClient'
import { withBusinessAccess } from './adminAccessState'
import { SessionActions } from './SessionActions'
import {
  createPlatformBusiness,
  listPlatformBusinesses,
  setPlatformBusinessAccess,
  setPlatformBusinessActive,
  type PlatformBusiness,
} from './platformAdmin'
import './AdminPage.css'

const whatsappLabel: Record<PlatformBusiness['whatsapp_status'], string> = {
  disconnected: 'WhatsApp desconectado',
  pending: 'WhatsApp pendente',
  connected: 'WhatsApp conectado',
  error: 'Erro no WhatsApp',
}

const emptyForm = () => ({
  name: '',
  owner_email: '',
  owner_password: '',
  timezone: 'America/Sao_Paulo',
})

export function AdminPage() {
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState<PlatformBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [accessConfirmation, setAccessConfirmation] = useState<PlatformBusiness|null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const creationKey = useRef('')

  const load = useCallback(async () => {
    setLoadError('')
    setLoading(true)
    try {
      setBusinesses(await listPlatformBusinesses())
    } catch (requestError) {
      setLoadError(requestError instanceof ApiError
        ? requestError.message
        : 'Não foi possível carregar as empresas da plataforma.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  function changeForm(field: keyof ReturnType<typeof emptyForm>, value: string) {
    creationKey.current = ''
    setForm(current => ({...current, [field]: value}))
  }

  function finishCreation(created: PlatformBusiness, currentBusinesses = businesses) {
    setBusinesses([...currentBusinesses.filter(item => item.id !== created.id), created]
      .sort((a,b) => a.name.localeCompare(b.name)))
    creationKey.current = ''
    setForm(emptyForm())
    setShowCreate(false)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.owner_email.trim() || form.owner_password.length < 12) return
    const idempotencyKey = creationKey.current || crypto.randomUUID()
    creationKey.current = idempotencyKey
    setCreating(true)
    setActionError('')
    setSuccess('')
    try {
      const created = await createPlatformBusiness({
        ...form,
        name: form.name.trim(),
        owner_email: form.owner_email.trim(),
      }, idempotencyKey)
      finishCreation(created)
    } catch (requestError) {
      const transient = requestError instanceof ApiError &&
        (requestError.status === 0 || requestError.status >= 500)
      if (transient) {
        // The POST may have committed even if its response was lost. Reconcile
        // by the operation UUID before asking the administrator to retry.
        try {
          const refreshed = await listPlatformBusinesses()
          const recovered = refreshed.find(item => item.id === idempotencyKey)
          if (recovered) {
            finishCreation(recovered, refreshed)
            return
          }
          setBusinesses(refreshed)
        } catch {
          // Keep the same idempotency key for a later retry.
        }
        setActionError('A conexão oscilou durante a criação. Tente novamente; a Alovia reutilizará a mesma solicitação sem duplicar a empresa.')
      } else {
        creationKey.current = ''
        setActionError(requestError instanceof ApiError && requestError.status === 409
          ? 'Este e-mail já está cadastrado na Alovia.'
          : 'Não foi possível criar a empresa. Revise os dados e tente novamente.')
      }
    } finally {
      setCreating(false)
    }
  }

  async function toggleBusiness(business: PlatformBusiness) {
    setBusyId(business.id)
    setActionError('')
    setSuccess('')
    try {
      const result = await setPlatformBusinessActive(business.id, !business.active)
      setBusinesses(current => current.map(item => item.id === business.id
        ? {...item, active: result.active} : item))
    } catch {
      setActionError('Não foi possível alterar o status da empresa.')
    } finally {
      setBusyId('')
    }
  }

  async function confirmAccessChange() {
    const business = accessConfirmation
    if (!business) return
    const previous = business.access_mode
    const next = previous === 'free' ? 'paid' : 'free'
    setAccessConfirmation(null)
    setBusyId(business.id)
    setActionError('')
    setSuccess('')
    setBusinesses(current => withBusinessAccess(current, business.id, next))
    try {
      const result = await setPlatformBusinessAccess(business.id, next)
      setBusinesses(current => withBusinessAccess(current, business.id, result.access_mode))
      setSuccess(next === 'paid'
        ? `Liberação administrativa concluída para ${business.name}. Nenhuma cobrança ou assinatura foi criada.`
        : `Liberação revogada para ${business.name}. A empresa voltou ao modo gratuito.`)
    } catch (requestError) {
      setBusinesses(current => withBusinessAccess(current, business.id, previous))
      setActionError(requestError instanceof ApiError
        ? requestError.message
        : 'Não foi possível alterar o acesso operacional da empresa.')
    } finally {
      setBusyId('')
    }
  }

  return <>
    <AppHeader title="Administração" />
    <main className="platform-admin">
      <section className="platform-admin__hero">
        <div>
          <span className="platform-admin__eyebrow"><ShieldCheck size={16}/> SUPER_ADMIN</span>
          <h1>Empresas da Alovia</h1>
          <p>Crie tenants, defina o primeiro OWNER e acompanhe o estado operacional de cada empresa.</p>
        </div>
        <div className="platform-admin__hero-actions">
          <button className="platform-admin__preview-button" type="button" onClick={()=>navigate('/admin/preview')}><Eye size={18}/> Prévia do aplicativo</button>
          <PrimaryButton icon={<Plus size={18}/>} onClick={()=>setShowCreate(value=>!value)}>
            {showCreate ? 'Fechar cadastro' : 'Nova empresa'}
          </PrimaryButton>
        </div>
      </section>

      {showCreate && <section className="platform-admin__panel">
        <div className="platform-admin__panel-title">
          <Building2 size={20}/><div><h2>Criar empresa</h2><p>O OWNER poderá entrar no /app assim que o cadastro for concluído.</p></div>
        </div>
        <form className="platform-admin__form" onSubmit={event=>void submit(event)}>
          <label>Nome da empresa
            <input value={form.name} maxLength={255} autoComplete="organization" required disabled={creating}
              onChange={event=>changeForm('name', event.target.value)} placeholder="Ex.: Refrigeração Piloto" />
          </label>
          <label>E-mail do OWNER
            <input value={form.owner_email} type="email" maxLength={254} autoComplete="email" required disabled={creating}
              onChange={event=>changeForm('owner_email', event.target.value)} placeholder="proprietario@empresa.com.br" />
          </label>
          <label>Senha inicial do OWNER
            <input value={form.owner_password} type="password" minLength={12} maxLength={1024}
              autoComplete="new-password" required disabled={creating}
              onChange={event=>changeForm('owner_password', event.target.value)} placeholder="Mínimo de 12 caracteres" />
          </label>
          <label>Fuso horário
            <input value={form.timezone} readOnly aria-readonly="true" />
          </label>
          <p className="platform-admin__security-note">A senha é enviada somente nesta criação e não é armazenada no navegador.</p>
          <PrimaryButton fullWidth type="submit" disabled={creating || form.owner_password.length < 12}>
            {creating ? 'Criando empresa…' : 'Criar empresa e OWNER'}
          </PrimaryButton>
        </form>
      </section>}

      {actionError && <p className="form-error platform-admin__error" role="alert">{actionError}</p>}
      {success && <p className="form-success platform-admin__success" role="status">{success}</p>}
      {loadError && businesses.length > 0 && <div className="platform-admin__refresh-error" role="alert">
        <span>{loadError}</span>
        <button type="button" onClick={()=>void load()}>Tentar novamente</button>
      </div>}

      <section className="platform-admin__list-header">
        <div><h2>Empresas cadastradas</h2><p>{businesses.length} {businesses.length === 1 ? 'empresa' : 'empresas'}</p></div>
        <button className="platform-admin__refresh" type="button" onClick={()=>void load()} disabled={loading} aria-label="Atualizar empresas">
          <RefreshCw size={18}/>
        </button>
      </section>

      {loading ? <div className="platform-admin__empty">Carregando empresas…</div> :
        loadError && businesses.length === 0 ? <div className="platform-admin__empty platform-admin__load-error" role="alert">
          <Building2 size={28}/><strong>Não foi possível carregar as empresas</strong><span>{loadError}</span>
          <PrimaryButton onClick={()=>void load()}>Tentar novamente</PrimaryButton>
        </div> :
        businesses.length === 0 ? <div className="platform-admin__empty">
          <Building2 size={28}/><strong>Nenhuma empresa cadastrada</strong><span>Crie o primeiro tenant da Alovia.</span>
        </div> :
        <div className="platform-admin__businesses">
          {businesses.map(business => <article className="platform-admin__business" key={business.id}>
            <div className="platform-admin__business-top">
              <div className="platform-admin__business-icon"><Building2 size={20}/></div>
              <div className="platform-admin__business-name"><h3>{business.name}</h3><span>{business.owners.join(', ') || 'Sem OWNER'}</span></div>
              <span className={`platform-admin__status ${business.active ? 'is-active' : 'is-inactive'}`}>
                {business.active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <div className="platform-admin__meta">
              <span>{whatsappLabel[business.whatsapp_status]}</span>
              <span>{business.timezone}</span>
            </div>
            <div className="platform-admin__access">
              <strong className={business.access_mode==='paid'?'is-paid':'is-free'}>{business.access_mode==='paid'?'Acesso liberado':'Gratuito'}</strong>
              <span>{business.access_mode==='paid'
                ? 'Plano comercial: não registrado. A origem da liberação não existe no modelo atual.'
                : 'Acesso demonstrativo, sem operação liberada.'}</span>
            </div>
            <div className="platform-admin__actions">
              <button className="platform-admin__toggle" type="button" disabled={busyId === business.id}
                onClick={()=>setAccessConfirmation(business)}>
                <KeyRound size={18}/>{busyId === business.id ? 'Salvando…' : business.access_mode==='free' ? 'Liberar funcionalidades' : 'Revogar liberação'}
              </button>
              <button className="platform-admin__toggle" type="button" disabled={busyId === business.id}
                onClick={()=>void toggleBusiness(business)}>
                <CirclePower size={18}/>{busyId === business.id ? 'Salvando…' : business.active ? 'Desativar empresa' : 'Reativar empresa'}
              </button>
            </div>
          </article>)}
        </div>}

      <div className="platform-admin__logout"><SessionActions /></div>
    </main>
    <BottomSheet
      open={!!accessConfirmation}
      title={accessConfirmation?.access_mode === 'free' ? 'Liberar funcionalidades' : 'Revogar liberação'}
      description={accessConfirmation?.name}
      onClose={()=>setAccessConfirmation(null)}
    >
      {accessConfirmation && <div className="platform-admin__access-confirmation">
        <p>{accessConfirmation.access_mode === 'free'
          ? 'Liberar funcionalidades pagas para esta empresa sem criar cobrança ou assinatura?'
          : 'Revogar a liberação e retornar esta empresa ao modo gratuito?'}</p>
        <p>Esta ação altera somente o acesso operacional. Nenhum pagamento ou assinatura será criado ou modificado.</p>
        <div>
          <button className="platform-admin__toggle" type="button" onClick={()=>setAccessConfirmation(null)}>Cancelar</button>
          <PrimaryButton onClick={()=>void confirmAccessChange()}>
            {accessConfirmation.access_mode === 'free' ? 'Confirmar liberação' : 'Confirmar revogação'}
          </PrimaryButton>
        </div>
      </div>}
    </BottomSheet>
  </>
}

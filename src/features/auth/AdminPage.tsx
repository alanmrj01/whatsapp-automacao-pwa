import { Building2, CirclePower, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AppHeader } from '../../components/AppHeader'
import { PrimaryButton } from '../../components/PrimaryButton'
import { ApiError } from '../../lib/httpClient'
import { SessionActions } from './SessionActions'
import {
  createPlatformBusiness,
  listPlatformBusinesses,
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

export function AdminPage() {
  const [businesses, setBusinesses] = useState<PlatformBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '',
    owner_email: '',
    owner_password: '',
    timezone: 'America/Sao_Paulo',
  })

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      setBusinesses(await listPlatformBusinesses())
    } catch {
      setError('Não foi possível carregar as empresas da plataforma.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.owner_email.trim() || form.owner_password.length < 12) return
    setCreating(true)
    setError('')
    try {
      const created = await createPlatformBusiness({
        ...form,
        name: form.name.trim(),
        owner_email: form.owner_email.trim(),
      })
      setBusinesses(current => [...current, created].sort((a,b) => a.name.localeCompare(b.name)))
      setForm({name:'', owner_email:'', owner_password:'', timezone:'America/Sao_Paulo'})
      setShowCreate(false)
    } catch (requestError) {
      setError(requestError instanceof ApiError && requestError.status === 409
        ? 'Este e-mail já está cadastrado na Alovia.'
        : 'Não foi possível criar a empresa. Revise os dados e tente novamente.')
    } finally {
      setCreating(false)
    }
  }

  async function toggleBusiness(business: PlatformBusiness) {
    setBusyId(business.id)
    setError('')
    try {
      const result = await setPlatformBusinessActive(business.id, !business.active)
      setBusinesses(current => current.map(item => item.id === business.id
        ? {...item, active: result.active} : item))
    } catch {
      setError('Não foi possível alterar o status da empresa.')
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
        <PrimaryButton icon={<Plus size={18}/>} onClick={()=>setShowCreate(value=>!value)}>
          {showCreate ? 'Fechar cadastro' : 'Nova empresa'}
        </PrimaryButton>
      </section>

      {showCreate && <section className="platform-admin__panel">
        <div className="platform-admin__panel-title">
          <Building2 size={20}/><div><h2>Criar empresa</h2><p>O OWNER poderá entrar no /app assim que o cadastro for concluído.</p></div>
        </div>
        <form className="platform-admin__form" onSubmit={event=>void submit(event)}>
          <label>Nome da empresa
            <input value={form.name} maxLength={255} autoComplete="organization" required
              onChange={event=>setForm({...form,name:event.target.value})} placeholder="Ex.: Refrigeração Piloto" />
          </label>
          <label>E-mail do OWNER
            <input value={form.owner_email} type="email" maxLength={254} autoComplete="email" required
              onChange={event=>setForm({...form,owner_email:event.target.value})} placeholder="proprietario@empresa.com.br" />
          </label>
          <label>Senha inicial do OWNER
            <input value={form.owner_password} type="password" minLength={12} maxLength={1024}
              autoComplete="new-password" required
              onChange={event=>setForm({...form,owner_password:event.target.value})} placeholder="Mínimo de 12 caracteres" />
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

      {error && <p className="form-error platform-admin__error" role="alert">{error}</p>}

      <section className="platform-admin__list-header">
        <div><h2>Empresas cadastradas</h2><p>{businesses.length} {businesses.length === 1 ? 'empresa' : 'empresas'}</p></div>
        <button className="platform-admin__refresh" type="button" onClick={()=>void load()} disabled={loading} aria-label="Atualizar empresas">
          <RefreshCw size={18}/>
        </button>
      </section>

      {loading ? <div className="platform-admin__empty">Carregando empresas…</div> :
        businesses.length === 0 ? <div className="platform-admin__empty">
          <Building2 size={28}/><strong>Nenhuma empresa cadastrada</strong><span>Crie o primeiro tenant da Alovia.</span>
        </div> :
        <div className="platform-admin__businesses">
          {businesses.map(business => <article className="platform-admin__business" key={business.id}>
            <div className="platform-admin__business-top">
              <div className="platform-admin__business-icon"><Building2 size={20}/></div>
              <div className="platform-admin__business-name"><h3>{business.name}</h3><span>{business.owners[0] ?? 'Sem OWNER'}</span></div>
              <span className={`platform-admin__status ${business.active ? 'is-active' : 'is-inactive'}`}>
                {business.active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <div className="platform-admin__meta">
              <span>{whatsappLabel[business.whatsapp_status]}</span>
              <span>{business.timezone}</span>
            </div>
            <button className="platform-admin__toggle" type="button" disabled={busyId === business.id}
              onClick={()=>void toggleBusiness(business)}>
              <CirclePower size={18}/>{busyId === business.id ? 'Salvando…' : business.active ? 'Desativar empresa' : 'Reativar empresa'}
            </button>
          </article>)}
        </div>}

      <div className="platform-admin__logout"><SessionActions /></div>
    </main>
  </>
}

import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import { useAuth } from './useAuth'

export function BusinessSelector() {
  const {user,selectBusiness} = useAuth()
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  if (!user || user.platform_role === 'super_admin') return null
  if (!user.memberships.length) return <EmptyState icon={Building2} title="Nenhuma empresa disponível" description="Peça ao administrador para autorizar seu acesso." />
  if (user.memberships.length === 1 && user.active_business_id) return null
  async function change(value:string) {
    if (!value) return
    setBusy(true); setError('')
    try { await selectBusiness(value) } catch { setError('Não foi possível selecionar a empresa. Tente novamente.') }
    finally { setBusy(false) }
  }
  return <section className="business-selector">
    <label htmlFor="active-business">Empresa ativa</label>
    <select id="active-business" value={user.active_business_id??''} disabled={busy} onChange={e=>void change(e.target.value)}>
      <option value="" disabled>Selecione uma empresa</option>
      {user.memberships.map(m=><option key={m.business_id} value={m.business_id}>{m.business_name}</option>)}
    </select>
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>
}

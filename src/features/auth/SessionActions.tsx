import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from './useAuth'

export function SessionActions() {
  const {logout} = useAuth()
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  async function leave() {
    setBusy(true)
    try { await logout() } catch { setError('Não foi possível revogar a sessão. Reconecte e tente sair novamente.') }
    finally { setBusy(false) }
  }
  return <div>
    <button className="logout-button" type="button" disabled={busy} onClick={()=>void leave()}><LogOut size={19}/>{busy?'Saindo…':'Sair da conta'}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>
}

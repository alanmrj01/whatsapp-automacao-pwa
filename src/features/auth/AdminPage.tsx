import { ShieldCheck } from 'lucide-react'
import { AppHeader } from '../../components/AppHeader'
import { EmptyState } from '../../components/EmptyState'
import { SessionActions } from './SessionActions'

export function AdminPage() {
  return <><AppHeader title="Administração"/><main className="app-content"><div className="page-stack">
    <EmptyState icon={ShieldCheck} title="Administração da plataforma" description="Seu acesso SUPER_ADMIN está ativo. A gestão da plataforma será disponibilizada em uma próxima etapa."/>
    <SessionActions />
  </div></main></>
}

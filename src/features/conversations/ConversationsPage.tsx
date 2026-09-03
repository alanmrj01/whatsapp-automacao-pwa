import { MessagesSquare, Search } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'

export function ConversationsPage() {
  return (
    <div className="page-stack compact-page">
      <section className="page-intro">
        <span className="eyebrow">Atendimento</span>
        <h1>Conversas</h1>
        <p>Acompanhe atendimentos automáticos e humanos.</p>
      </section>
      <label className="search-field">
        <Search size={19} aria-hidden="true" />
        <span className="sr-only">Buscar conversa</span>
        <input type="search" placeholder="Buscar conversa" />
      </label>
      <EmptyState
        icon={MessagesSquare}
        title="Nenhuma conversa ainda"
        description="As conversas aparecerão aqui após a conexão do WhatsApp."
      />
    </div>
  )
}

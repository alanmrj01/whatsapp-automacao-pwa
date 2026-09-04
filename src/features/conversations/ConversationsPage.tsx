import { Clock3, MessagesSquare, Search, Snowflake } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'

export function ConversationsPage() {
  return (
    <div className="page-stack compact-page">
      <section className="page-intro">
        <span className="eyebrow">Atendimento técnico</span>
        <h1>Conversas</h1>
        <p>Encontre rapidamente quem precisa de retorno e qual serviço está por trás de cada contato.</p>
      </section>

      <section className="priority-queue-note" aria-label="Como a fila é organizada">
        <span className="priority-queue-note__icon"><Clock3 size={19}/></span>
        <div>
          <strong>Fila inteligente</strong>
          <p>Clientes aguardando resposta ficam fixados no topo. Depois, as demais conversas aparecem da resposta mais recente para a mais antiga.</p>
        </div>
      </section>

      <label className="search-field">
        <Search size={19} aria-hidden="true" />
        <span className="sr-only">Buscar conversa</span>
        <input type="search" placeholder="Buscar cliente, equipamento ou serviço" />
      </label>

      <div className="context-pills" aria-label="Contextos de atendimento">
        <span><Snowflake size={14}/> Refrigeração</span>
        <span>Instalação</span>
        <span>Manutenção</span>
        <span>Orçamento</span>
      </div>

      <EmptyState
        icon={MessagesSquare}
        title="Nenhuma conversa ainda"
        description="Após conectar o WhatsApp, os atendimentos serão organizados aqui com prioridade para quem está esperando sua resposta."
      />
    </div>
  )
}

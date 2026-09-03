import { CalendarDays } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'

export function AgendaPage() {
  return (
    <div className="page-stack compact-page">
      <section className="page-intro">
        <span className="eyebrow">Organização</span>
        <h1>Sua agenda</h1>
        <p>Os próximos agendamentos aparecerão aqui.</p>
      </section>
      <div className="date-strip" aria-label="Período selecionado">
        <span>Hoje</span>
        <strong>Nenhum horário</strong>
      </div>
      <EmptyState
        icon={CalendarDays}
        title="Agenda livre por enquanto"
        description="Quando o atendimento estiver configurado, seus compromissos serão organizados neste espaço."
      />
    </div>
  )
}

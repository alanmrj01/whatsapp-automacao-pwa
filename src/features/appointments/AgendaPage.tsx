import { CalendarDays, Snowflake, Wrench, ShieldCheck } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'

export function AgendaPage() {
  return (
    <div className="page-stack compact-page">
      <section className="page-intro">
        <span className="eyebrow">Operação em campo</span>
        <h1>Agenda técnica</h1>
        <p>Organize visitas, instalações e manutenções sem depender de anotações soltas no WhatsApp.</p>
      </section>

      <div className="date-strip" aria-label="Período selecionado">
        <span>Hoje</span>
        <strong>Nenhuma visita técnica</strong>
      </div>

      <section className="service-context-grid" aria-label="Tipos de serviço">
        <div><span><Wrench size={18}/></span><strong>Visita técnica</strong><small>Avaliação e diagnóstico</small></div>
        <div><span><Snowflake size={18}/></span><strong>Instalação</strong><small>Split, refrigeração e afins</small></div>
        <div><span><ShieldCheck size={18}/></span><strong>Preventiva</strong><small>Manutenção programada</small></div>
      </section>

      <EmptyState
        icon={CalendarDays}
        title="Agenda livre por enquanto"
        description="Quando os atendimentos estiverem configurados, a Alovia organizará os compromissos por serviço, horário e contexto técnico."
      />
    </div>
  )
}

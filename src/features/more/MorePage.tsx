import { Bell, Building2, CircleHelp, Clock3, MapPinned, Settings2, ShieldCheck, Snowflake, UsersRound, Wrench } from 'lucide-react'
import { ListRow } from '../../components/ListRow'
import { Section } from '../../components/Section'
import { useAuth } from '../auth/useAuth'
import { SessionActions } from '../auth/SessionActions'

export function MorePage() {
  const {membership} = useAuth()
  const name = membership?.business_name ?? 'Sua empresa'
  return (
    <div className="page-stack compact-page">
      <section className="business-profile business-profile--hvac">
        <div className="business-avatar business-avatar--large" aria-hidden="true">
          <Snowflake size={24}/>
        </div>
        <div>
          <span className="eyebrow">Sua operação</span>
          <h1>{name}</h1>
          <p>Personalize a Alovia para a rotina da sua equipe técnica.</p>
        </div>
      </section>

      <Section title="Estrutura da operação">
        <div className="list-surface">
          <ListRow icon={Wrench} title="Serviços e equipamentos" subtitle="Tipos atendidos e catálogo técnico" />
          <ListRow icon={UsersRound} title="Equipe técnica" subtitle="Técnicos, funções e permissões" iconTone="violet" />
          <ListRow icon={MapPinned} title="Área de atendimento" subtitle="Regiões, deslocamentos e cobertura" iconTone="slate" />
          <ListRow icon={Clock3} title="Horários e agenda" subtitle="Disponibilidade da operação" iconTone="amber" />
        </div>
      </Section>

      <Section title="Preferências">
        <div className="list-surface">
          <ListRow icon={Building2} title="Dados da empresa" subtitle="Informações e identificação" />
          <ListRow icon={Bell} title="Notificações" subtitle="Alertas importantes" iconTone="violet" />
          <ListRow icon={Settings2} title="Configurações" subtitle="Preferências do aplicativo" iconTone="slate" />
        </div>
      </Section>

      <Section title="Ajuda e segurança">
        <div className="list-surface">
          <ListRow icon={CircleHelp} title="Central de ajuda" iconTone="amber" />
          <ListRow icon={ShieldCheck} title="Privacidade e segurança" iconTone="slate" />
        </div>
      </Section>
      <SessionActions />
    </div>
  )
}

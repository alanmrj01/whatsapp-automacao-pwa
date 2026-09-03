import { Bell, Building2, CircleHelp, Settings2, ShieldCheck } from 'lucide-react'
import { ListRow } from '../../components/ListRow'
import { Section } from '../../components/Section'
import { mockBusiness } from '../../lib/mocks'

export function MorePage() {
  return (
    <div className="page-stack compact-page">
      <section className="business-profile">
        <div className="business-avatar business-avatar--large" aria-hidden="true">
          {mockBusiness.initials}
        </div>
        <div>
          <span className="eyebrow">Empresa</span>
          <h1>{mockBusiness.name}</h1>
          <p>Configurações do ambiente</p>
        </div>
      </section>
      <Section title="Preferências">
        <div className="list-surface">
          <ListRow icon={Building2} title="Dados da empresa" subtitle="Informações e horários" />
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
    </div>
  )
}

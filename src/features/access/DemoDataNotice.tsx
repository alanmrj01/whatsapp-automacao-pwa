import { InfoHelp } from '../../components/InfoHelp'
import { DEMO_DATA_NOTICE } from './entitlements'

export function DemoDataNotice() {
  return (
    <aside className="demo-banner" aria-label="Aviso de dados demonstrativos">
      <strong>{DEMO_DATA_NOTICE}</strong>
      <InfoHelp title="Modo demonstração">
        Estes exemplos são fictícios, não são salvos e nunca se misturam aos dados reais da sua empresa.
      </InfoHelp>
    </aside>
  )
}

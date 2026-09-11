import { InfoHelp } from '../../components/InfoHelp'
import { DEMO_DATA_NOTICE } from './entitlements'

export function DemoDataNotice() {
  return (
    <aside className="demo-banner" aria-label="Aviso de dados demonstrativos">
      <strong>{DEMO_DATA_NOTICE}</strong>
      <InfoHelp title="Dados de demonstração">
        Nada desta tela pertence a clientes reais, é persistido ou enviado às APIs operacionais.
      </InfoHelp>
    </aside>
  )
}

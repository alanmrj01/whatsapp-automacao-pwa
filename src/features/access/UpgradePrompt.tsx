import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '../../components/BottomSheet'
import { UpgradePromptContext } from './upgradePromptContext'
import { useEntitlements } from './useEntitlements'
import { useConnection } from '../whatsapp/useConnection'

export function UpgradePromptProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const entitlement = useEntitlements()
  const connection = useConnection()
  const [feature, setFeature] = useState<string | null>(null)
  const value = useMemo(() => ({
    openUpgrade: (name = 'Este recurso') => {
      if (entitlement.isPreactivation && connection.data?.status !== 'connected') {
        navigate('/app/whatsapp?from=activation&continuar=1')
        return
      }
      setFeature(name)
    },
  }), [connection.data?.status, entitlement.isPreactivation, navigate])

  function viewPlans() {
    setFeature(null)
    navigate('/app/mais/plano')
  }

  return (
    <UpgradePromptContext.Provider value={value}>
      {children}
      <BottomSheet
        open={feature !== null}
        title="Disponível com assinatura"
        description={`${feature ?? 'Este recurso'} pode ser usado com os dados reais da sua empresa.`}
        onClose={() => setFeature(null)}
      >
        <div className="upgrade-prompt upgrade-prompt--compact">
          <p>Use esta função com os dados reais da sua empresa.</p>
          <div className="upgrade-prompt__offer">
            <strong>Basic: R$ 147,90/mês no plano mensal · até 600 mensagens por mês.</strong>
            <span>Atendimento automático quando o cliente chama · 7 dias de garantia.</span>
          </div>
          <div className="upgrade-prompt__actions">
            <button className="primary-button" type="button" onClick={viewPlans}>Ver planos</button>
            <button className="compact-button" type="button" onClick={() => setFeature(null)}>Agora não</button>
          </div>
        </div>
      </BottomSheet>
    </UpgradePromptContext.Provider>
  )
}

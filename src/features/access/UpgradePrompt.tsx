import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '../../components/BottomSheet'
import { UpgradePromptContext } from './upgradePromptContext'

export function UpgradePromptProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [feature, setFeature] = useState<string | null>(null)
  const value = useMemo(() => ({openUpgrade: (name = 'Este recurso') => setFeature(name)}), [])

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
            <strong>Basic: R$ 197/mês no plano mensal · 7 dias de garantia.</strong>
            <span>Trimestral e anual têm condições de economia.</span>
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

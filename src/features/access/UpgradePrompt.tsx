import { useMemo, useState, type ReactNode } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { UpgradePromptContext } from './upgradePromptContext'

export function UpgradePromptProvider({ children }: { children: ReactNode }) {
  const [feature, setFeature] = useState<string | null>(null)
  const value = useMemo(() => ({openUpgrade: (name = 'este recurso') => setFeature(name)}), [])

  return (
    <UpgradePromptContext.Provider value={value}>
      {children}
      <BottomSheet
        open={feature !== null}
        title="Disponível no plano pago"
        description={`${feature ?? 'Este recurso'} faz parte da experiência operacional da Alovia.`}
        onClose={() => setFeature(null)}
      >
        <div className="upgrade-prompt">
          <p>Sua conta gratuita continua sem cobrança. A demonstração permanece disponível somente para leitura.</p>
          <p>O plano pago libera a operação real deste recurso para a empresa ativa. Nenhuma cobrança é criada sem sua confirmação.</p>
          <button className="primary-button" type="button" onClick={() => setFeature(null)}>Continuar no modo demonstração</button>
        </div>
      </BottomSheet>
    </UpgradePromptContext.Provider>
  )
}

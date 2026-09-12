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
          <p>A contratação seguirá o fluxo comercial oficial quando ele estiver disponível; nenhuma cobrança é criada por esta tela.</p>
          <button className="primary-button" type="button" onClick={() => setFeature(null)}>Entendi</button>
        </div>
      </BottomSheet>
    </UpgradePromptContext.Provider>
  )
}

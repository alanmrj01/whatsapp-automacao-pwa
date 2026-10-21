import { useEntitlements } from './useEntitlements'
import { useUpgradePrompt } from './upgradePromptContext'

export function ActivateAloviaCta() {
  const entitlement=useEntitlements()
  const {openUpgrade}=useUpgradePrompt()

  if(entitlement.isPaid)return null

  return <button
    className="compact-button activate-alovia-cta"
    type="button"
    data-track-action="Ativar Alovia"
    onClick={()=>openUpgrade('Ativar Alovia')}
  >Ativar Alovia</button>
}

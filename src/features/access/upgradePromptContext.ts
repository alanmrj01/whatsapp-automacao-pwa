import { createContext, useContext } from 'react'

export type UpgradePromptValue = { openUpgrade: (feature?: string) => void }

export const UpgradePromptContext = createContext<UpgradePromptValue | null>(null)

export function useUpgradePrompt() {
  const context = useContext(UpgradePromptContext)
  if (!context) throw new Error('UpgradePromptProvider ausente')
  return context
}

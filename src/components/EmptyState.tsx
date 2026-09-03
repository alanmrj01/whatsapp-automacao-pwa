import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="state-card">
      <span className="state-card__icon"><Icon size={26} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  )
}

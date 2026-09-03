import type { ReactNode } from 'react'

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

type StatusBadgeProps = {
  children: ReactNode
  tone?: StatusTone
  withDot?: boolean
}

export function StatusBadge({
  children,
  tone = 'neutral',
  withDot = true,
}: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      {withDot && <span className="status-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

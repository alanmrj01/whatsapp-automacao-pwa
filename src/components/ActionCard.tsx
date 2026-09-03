import { ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

type ActionCardProps = {
  icon: LucideIcon
  title: string
  description: string
  to: string
}

export function ActionCard({ icon: Icon, title, description, to }: ActionCardProps) {
  return (
    <Link className="action-card" to={to}>
      <span className="action-card__icon"><Icon size={21} /></span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ArrowUpRight size={18} className="action-card__arrow" aria-hidden="true" />
    </Link>
  )
}

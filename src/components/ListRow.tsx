import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type ListRowProps = {
  icon: LucideIcon
  title: string
  subtitle?: string
  trailing?: ReactNode
  to?: string
  onClick?: () => void
  iconTone?: 'blue' | 'slate' | 'amber' | 'violet'
}

export function ListRow({
  icon: Icon,
  title,
  subtitle,
  trailing,
  to,
  onClick,
  iconTone = 'blue',
}: ListRowProps) {
  const content = (
    <>
      <span className={`list-row__icon list-row__icon--${iconTone}`}>
        <Icon size={20} />
      </span>
      <span className="list-row__copy">
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </span>
      <span className="list-row__trailing">
        {trailing ?? (to && <ChevronRight size={19} aria-hidden="true" />)}
      </span>
    </>
  )

  return to ? (
    <Link className="list-row" to={to}>
      {content}
    </Link>
  ) : onClick ? (
    <button className="list-row" type="button" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="list-row">{content}</div>
  )
}

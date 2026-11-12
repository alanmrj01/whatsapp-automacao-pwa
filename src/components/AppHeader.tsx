import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from './BrandMark'

type AppHeaderProps = {
  title: string
  showBack?: boolean
  backTo?: string
  actions?: ReactNode
  brandContent?: ReactNode
}

export function AppHeader({ title, showBack = false, backTo = '/app/whatsapp', actions, brandContent }: AppHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="app-header">
      <div className="app-header__leading">
        {showBack ? (
          <button
            className="icon-button"
            type="button"
            aria-label="Voltar"
            onClick={() => navigate(backTo)}
          >
            <ArrowLeft size={22} />
          </button>
        ) : (
          <BrandMark />
        )}
        <span className="app-header__title">{title}</span>
      </div>
      <div className="app-header__actions">{!showBack && (brandContent ?? <span className="app-header__brand-name">Alovia</span>)}{actions}</div>
    </header>
  )
}

import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from './BrandMark'

type AppHeaderProps = {
  title: string
  showBack?: boolean
}

export function AppHeader({ title, showBack = false }: AppHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="app-header">
      <div className="app-header__leading">
        {showBack ? (
          <button
            className="icon-button"
            type="button"
            aria-label="Voltar"
            onClick={() => navigate('/app/whatsapp')}
          >
            <ArrowLeft size={22} />
          </button>
        ) : (
          <BrandMark />
        )}
        <span className="app-header__title">{title}</span>
      </div>
      {!showBack && <span className="app-header__brand-name">Atende</span>}
    </header>
  )
}

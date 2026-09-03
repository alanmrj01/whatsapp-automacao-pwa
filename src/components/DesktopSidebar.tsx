import { NavLink } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { BrandMark } from './BrandMark'
import { navigationItems } from './navigation'

export function DesktopSidebar() {
  const {membership} = useAuth()
  const name = membership?.business_name ?? 'Sua empresa'
  return (
    <aside className="desktop-sidebar">
      <div className="desktop-sidebar__brand">
        <BrandMark />
        <div>
          <strong>Atende</strong>
          <span>Automação e agenda</span>
        </div>
      </div>
      <nav aria-label="Navegação principal">
        {navigationItems.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `desktop-sidebar__link${isActive ? ' is-active' : ''}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="desktop-sidebar__business">
        <div className="business-avatar" aria-hidden="true">{name.slice(0,2).toUpperCase()}</div>
        <div>
          <strong>{name}</strong>
          <span>Empresa ativa</span>
        </div>
      </div>
    </aside>
  )
}

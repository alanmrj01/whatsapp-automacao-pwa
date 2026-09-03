import { NavLink } from 'react-router-dom'
import { mockBusiness } from '../lib/mocks'
import { BrandMark } from './BrandMark'
import { navigationItems } from './navigation'

export function DesktopSidebar() {
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
        <div className="business-avatar" aria-hidden="true">{mockBusiness.initials}</div>
        <div>
          <strong>{mockBusiness.name}</strong>
          <span>Ambiente de demonstração</span>
        </div>
      </div>
    </aside>
  )
}

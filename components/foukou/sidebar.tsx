'use client'

import {
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  UsersRound,
  UserRound,
} from 'lucide-react'
import { BrandLockup, BrandMaskArt } from './brand-mark'
import type { ViewKey } from './types'

const navigation: { key: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { key: 'students', label: 'Élèves et classes', icon: UsersRound },
  { key: 'teachers', label: 'Enseignants', icon: UserRound },
  { key: 'grades', label: 'Notes et bulletins', icon: BookOpenCheck },
  { key: 'schedule', label: 'Présences et emplois du temps', icon: CalendarDays },
  { key: 'communication', label: 'Communication', icon: MessageSquareText },
  { key: 'settings', label: 'Paramètres', icon: Settings2 },
]

export function Sidebar({
  activeView,
  collapsed,
  mobileOpen,
  isMobile,
  onSelect,
  onToggleCollapsed,
}: {
  activeView: ViewKey
  collapsed: boolean
  mobileOpen: boolean
  isMobile: boolean
  onSelect: (key: ViewKey) => void
  onToggleCollapsed: () => void
}) {
  return (
    <aside
      className={`sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`}
      aria-label="Navigation de l’espace scolaire"
      aria-hidden={isMobile && !mobileOpen ? true : undefined}
      inert={isMobile && !mobileOpen ? true : undefined}
    >
      <div className="sidebar-brand-block">
        <button
          type="button"
          className="sidebar-brand-button"
          onClick={() => onSelect('dashboard')}
          aria-label="Revenir au tableau de bord FOUKOU-NEXA"
        >
          <BrandLockup />
          <BrandMaskArt className="brand-mark-compact" />
        </button>
        <p className="sidebar-kicker">ESPACE SCOLAIRE</p>
      </div>

      <button
        type="button"
        className="sidebar-collapse-button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Développer le menu' : 'Réduire le menu'}
        title={collapsed ? 'Développer le menu' : 'Réduire le menu'}
      >
        {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
      </button>

      <nav id="main-navigation" className="sidebar-nav" aria-label="Navigation principale">
        <p className="sidebar-nav-label">PILOTAGE</p>
        <ul>
          {navigation.map(({ key, label, icon: Icon }) => (
            <li key={key}>
              <button
                type="button"
                className={`sidebar-nav-item${activeView === key ? ' is-active' : ''}`}
                onClick={() => onSelect(key)}
                aria-current={activeView === key ? 'page' : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon aria-hidden="true" className="sidebar-nav-icon" />
                <span className="sidebar-nav-text">{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-bronze-rule" aria-hidden="true" />
        <p>L’éducation d’aujourd’hui,<br />les talents de demain.</p>
        <span className="sidebar-footer-signature">APPRENDRE · GRANDIR · DEMAIN</span>
      </div>
    </aside>
  )
}

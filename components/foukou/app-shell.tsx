'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Bell, ChevronDown, FileCheck2, LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logoutAction } from '@/app/connexion/actions'
import { initials } from '@/lib/school-calculations.mjs'
import { roleLabels } from '@/lib/permissions.mjs'
import type { SchoolData, ViewKey } from './types'
import { Sidebar } from './sidebar'
import { DashboardView } from './dashboard-view'
import { ManagementView } from './management-view'
import { TeachersView } from './teachers-view'
import { GradesView } from './grades-view'
import { ScheduleView } from './schedule-view'
import { CommunicationView } from './communication-view'
import { SettingsView } from './settings-view'

const viewLabels: Record<ViewKey, string> = { dashboard: 'Tableau de bord', students: 'Élèves et classes', teachers: 'Enseignants', grades: 'Notes et bulletins', schedule: 'Présences et emplois du temps', communication: 'Communication', settings: 'Paramètres' }

export function FoukouApp({ data }: { data: SchoolData }) {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)')
    const sync = () => { setIsMobile(media.matches); if (!media.matches) setMobileNavOpen(false) }
    sync(); media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMobileNavOpen(false); setNotificationsOpen(false); setProfileOpen(false) } }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  function navigate(view: ViewKey) { setActiveView(view); setMobileNavOpen(false); setNotificationsOpen(false); setProfileOpen(false) }
  let view: ReactNode
  switch (activeView) {
    case 'students': view = <ManagementView data={data} />; break
    case 'teachers': view = <TeachersView data={data} onNavigate={navigate} />; break
    case 'grades': view = <GradesView data={data} />; break
    case 'schedule': view = <ScheduleView data={data} />; break
    case 'communication': view = <CommunicationView data={data} />; break
    case 'settings': view = <SettingsView data={data} />; break
    default: view = <DashboardView data={data} onNavigate={navigate} />
  }
  const notices = data.communications.filter((item) => item.status === 'published').slice(0, 3)
  return <div className={`school-app${darkMode ? ' dark' : ''}${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
    <Sidebar activeView={activeView} collapsed={sidebarCollapsed} mobileOpen={mobileNavOpen} isMobile={isMobile} onSelect={navigate} onToggleCollapsed={() => setSidebarCollapsed((value) => !value)} />
    {mobileNavOpen ? <button type="button" className="sidebar-scrim" aria-label="Fermer le menu de navigation" onClick={() => setMobileNavOpen(false)} /> : null}
    <div className="app-main"><header className="topbar"><div className="topbar-left"><Button variant="ghost" size="icon-lg" className="mobile-menu-button" aria-label={mobileNavOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={mobileNavOpen} aria-controls="main-navigation" onClick={() => setMobileNavOpen((value) => !value)}>{mobileNavOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</Button><div className="topbar-section-label"><span>{data.school.name.toUpperCase()}</span><strong>{viewLabels[activeView]}</strong></div></div>
      <div className="topbar-actions"><Button variant="ghost" size="icon-lg" className="topbar-icon-button" aria-label={darkMode ? 'Passer au thème clair' : 'Passer au thème sombre'} onClick={() => setDarkMode((value) => !value)}>{darkMode ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</Button>
        <div className="topbar-popover-wrap"><Button variant="ghost" size="icon-lg" className="topbar-icon-button notification-button" aria-label="Afficher les communications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false) }}><Bell aria-hidden="true" />{notices.length ? <span className="notification-dot" aria-hidden="true" /> : null}</Button>{notificationsOpen ? <section className="topbar-popover notification-popover" aria-label="Communications récentes"><div className="popover-heading"><div><p className="eyebrow">ÉTABLISSEMENT</p><h2>Communications</h2></div><span className="notification-count">{notices.length}</span></div>{notices.map((notice) => <button type="button" className="popover-notice" key={notice.id} onClick={() => navigate('communication')}><span className="popover-notice-icon"><FileCheck2 aria-hidden="true" /></span><span><strong>{notice.title}</strong><small>{notice.audience}</small></span></button>)}{!notices.length ? <p className="popover-empty">Aucune annonce publiée.</p> : null}</section> : null}</div>
        <div className="topbar-popover-wrap profile-wrap"><Button variant="ghost" className="profile-button" aria-expanded={profileOpen} onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false) }}><span className="profile-avatar" aria-hidden="true">{initials(data.user.fullName)}</span><span className="profile-copy"><strong>{data.user.fullName}</strong><small>{roleLabels[data.user.role]}</small></span><ChevronDown aria-hidden="true" /></Button>{profileOpen ? <section className="topbar-popover profile-popover" aria-label="Profil utilisateur"><p className="eyebrow">COMPTE CONNECTÉ</p><strong>{data.user.fullName}</strong><span>{data.user.email}</span><p>{roleLabels[data.user.role]} · {data.school.name}</p><form action={logoutAction}><button type="submit" className="logout-link"><LogOut aria-hidden="true" />Se déconnecter</button></form></section> : null}</div>
      </div></header><main id="main-content" className="app-content-area" tabIndex={-1}>{view}<footer className="app-footer"><span>FOUKOU-NEXA · {data.school.name}</span><span>Données enregistrées dans PostgreSQL · {data.settings.academicYear}</span></footer></main></div>
  </div>
}

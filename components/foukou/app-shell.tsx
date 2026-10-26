'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Bell, ChevronDown, FileCheck2, Menu, Moon, Sun, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from './sidebar'
import { DashboardView } from './dashboard-view'
import { ManagementView } from './management-view'
import { TeachersView } from './teachers-view'
import { GradesView } from './grades-view'
import { ScheduleView } from './schedule-view'
import { CommunicationView } from './communication-view'
import { SettingsView } from './settings-view'
import { demoAnnouncements, demoClassrooms, demoStudents, demoTeachers } from './data'
import type { Announcement, Classroom, Student, Teacher, ViewKey } from './types'

const viewLabels: Record<ViewKey, string> = {
  dashboard: 'Tableau de bord',
  students: 'Élèves et classes',
  teachers: 'Enseignants',
  grades: 'Notes et bulletins',
  schedule: 'Présences et emplois du temps',
  communication: 'Communication',
  settings: 'Paramètres',
}

export function FoukouApp() {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard')
  const [students, setStudents] = useState<Student[]>(demoStudents)
  const [classrooms, setClassrooms] = useState<Classroom[]>(demoClassrooms)
  const [teachers, setTeachers] = useState<Teacher[]>(demoTeachers)
  const [announcements, setAnnouncements] = useState<Announcement[]>(demoAnnouncements)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)')
    const syncViewport = () => {
      setIsMobile(media.matches)
      if (!media.matches) setMobileNavOpen(false)
    }
    syncViewport()
    media.addEventListener('change', syncViewport)
    return () => media.removeEventListener('change', syncViewport)
  }, [])

  useEffect(() => {
    function closeOverlays(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileNavOpen(false)
        setNotificationsOpen(false)
        setProfileOpen(false)
      }
    }
    window.addEventListener('keydown', closeOverlays)
    return () => window.removeEventListener('keydown', closeOverlays)
  }, [])

  function navigate(view: ViewKey) {
    setActiveView(view)
    setMobileNavOpen(false)
    setNotificationsOpen(false)
    setProfileOpen(false)
  }

  const studentTotal = 1248 + Math.max(0, students.length - demoStudents.length)
  const classTotal = 32 + Math.max(0, classrooms.length - demoClassrooms.length)
  const teacherTotal = 48 + Math.max(0, teachers.length - demoTeachers.length)

  let view: ReactNode
  switch (activeView) {
    case 'students':
      view = <ManagementView students={students} setStudents={setStudents} classrooms={classrooms} setClassrooms={setClassrooms} />
      break
    case 'teachers':
      view = <TeachersView teachers={teachers} setTeachers={setTeachers} onNavigate={navigate} />
      break
    case 'grades':
      view = <GradesView />
      break
    case 'schedule':
      view = <ScheduleView students={students} />
      break
    case 'communication':
      view = <CommunicationView announcements={announcements} setAnnouncements={setAnnouncements} />
      break
    case 'settings':
      view = <SettingsView />
      break
    default:
      view = <DashboardView onNavigate={navigate} studentTotal={studentTotal} classTotal={classTotal} teacherTotal={teacherTotal} />
  }

  return (
    <div className={`school-app${darkMode ? ' dark' : ''}${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
      <Sidebar
        activeView={activeView}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileNavOpen}
        isMobile={isMobile}
        onSelect={navigate}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
      />
      {mobileNavOpen ? <button type="button" className="sidebar-scrim" aria-label="Fermer le menu de navigation" onClick={() => setMobileNavOpen(false)} /> : null}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <Button variant="ghost" size="icon-lg" className="mobile-menu-button" aria-label={mobileNavOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={mobileNavOpen} aria-controls="main-navigation" onClick={() => setMobileNavOpen((value) => !value)}>
              {mobileNavOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
            <div className="topbar-section-label"><span>ESPACE SCOLAIRE</span><strong>{viewLabels[activeView]}</strong></div>
          </div>
          <div className="topbar-actions">
            <span className="topbar-demo-chip">DÉMO</span>
            <Button variant="ghost" size="icon-lg" className="topbar-icon-button" aria-label={darkMode ? 'Passer au thème clair' : 'Passer au thème sombre'} onClick={() => setDarkMode((value) => !value)}>
              {darkMode ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </Button>
            <div className="topbar-popover-wrap">
              <Button variant="ghost" size="icon-lg" className="topbar-icon-button notification-button" aria-label="Afficher les notifications de démonstration" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false) }}>
                <Bell aria-hidden="true" /><span className="notification-dot" aria-hidden="true" />
              </Button>
              {notificationsOpen ? (
                <section className="topbar-popover notification-popover" aria-label="Notifications de démonstration">
                  <div className="popover-heading"><div><p className="eyebrow">APERÇU · DÉMO</p><h2>Notifications</h2></div><span className="notification-count">2</span></div>
                  <button type="button" className="popover-notice" onClick={() => navigate('grades')}><span className="popover-notice-icon"><FileCheck2 aria-hidden="true" /></span><span><strong>Notes à vérifier</strong><small>Relevé fictif · 5e B</small></span></button>
                  <button type="button" className="popover-notice" onClick={() => navigate('communication')}><span className="popover-notice-icon"><Bell aria-hidden="true" /></span><span><strong>Réunion parents-professeurs</strong><small>Annonce de démonstration</small></span></button>
                </section>
              ) : null}
            </div>
            <div className="topbar-popover-wrap profile-wrap">
              <Button variant="ghost" className="profile-button" aria-expanded={profileOpen} onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false) }}>
                <span className="profile-avatar" aria-hidden="true">MK</span>
                <span className="profile-copy"><strong>M. Koné Armand</strong><small>Directeur · démo</small></span>
                <ChevronDown aria-hidden="true" />
              </Button>
              {profileOpen ? (
                <section className="topbar-popover profile-popover" aria-label="Profil de démonstration">
                  <p className="eyebrow">PROFIL D’APERÇU</p>
                  <strong>M. Koné Armand</strong>
                  <span>Rôle illustratif : Directeur</span>
                  <p>Authentification et permissions non configurées.</p>
                  <Link href="/connexion" onClick={() => setProfileOpen(false)}>Voir l’écran de connexion</Link>
                </section>
              ) : null}
            </div>
          </div>
        </header>

        <main id="main-content" className="app-content-area" tabIndex={-1}>
          {view}
          <footer className="app-footer"><span>FOUKOU-NEXA · ESPACE SCOLAIRE</span><span>Maquette fonctionnelle · aucune donnée réelle</span></footer>
        </main>
      </div>
    </div>
  )
}


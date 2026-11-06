'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface EstablishmentProfile {
  name: string
  city: string
  country: string
  logoDataUrl: string | null
}

export const DEFAULT_ESTABLISHMENT: EstablishmentProfile = {
  name: 'Établissement de démonstration',
  city: 'Abidjan',
  country: 'Côte d’Ivoire',
  logoDataUrl: null,
}

const STORAGE_KEY = 'foukou-establishment-profile-v1'

interface EstablishmentContextValue {
  profile: EstablishmentProfile
  hydrated: boolean
  updateProfile: (patch: Partial<EstablishmentProfile>) => void
  clearLogo: () => void
}

const EstablishmentContext = createContext<EstablishmentContextValue | null>(null)

export function EstablishmentProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<EstablishmentProfile>(DEFAULT_ESTABLISHMENT)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<EstablishmentProfile>
        setProfile((current) => ({ ...current, ...parsed }))
      }
    } catch {
      // Stockage indisponible : le profil par défaut reste actif.
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    } catch {
      // Profil conservé en mémoire uniquement pour cette session.
    }
  }, [profile, hydrated])

  function updateProfile(patch: Partial<EstablishmentProfile>) {
    setProfile((current) => ({ ...current, ...patch }))
  }

  function clearLogo() {
    setProfile((current) => ({ ...current, logoDataUrl: null }))
  }

  return (
    <EstablishmentContext.Provider value={{ profile, hydrated, updateProfile, clearLogo }}>
      {children}
    </EstablishmentContext.Provider>
  )
}

export function useEstablishment(): EstablishmentContextValue {
  const context = useContext(EstablishmentContext)
  if (!context) throw new Error('useEstablishment doit être utilisé dans un EstablishmentProvider.')
  return context
}

export function establishmentInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'É'
  const first = words[0]?.charAt(0) ?? ''
  const second = words.length > 1 ? words[1]?.charAt(0) ?? '' : ''
  const letters = (first + second).toLocaleUpperCase('fr-FR')
  return letters || 'É'
}

import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'FOUKOU-NEXA · Espace scolaire',
    template: '%s | FOUKOU-NEXA',
  },
  description: 'FOUKOU-NEXA, plateforme de gestion scolaire avec suivi des années scolaires, inscriptions et parcours des élèves.',
  generator: 'FOUKOU-NEXA',
  applicationName: 'FOUKOU-NEXA',
  openGraph: {
    title: 'FOUKOU-NEXA · Espace scolaire',
    description: 'Gestion scolaire FOUKOU-NEXA : années scolaires, inscriptions et parcours des élèves.',
    locale: 'fr_CI',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#f1eee5',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  )
}


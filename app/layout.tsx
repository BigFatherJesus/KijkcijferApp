import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kijkcijfers Visualisatie',
  description: 'Visualisatie van kijkcijfers per uur en per dag',
  icons: {
    icon: '/images/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  )
} 
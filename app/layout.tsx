import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UX Brief',
  description: 'Stakeholder-driven design brief generator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

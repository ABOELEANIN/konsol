import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ByKonsol — Logistics Orchestration',
  description: 'B2B logistics process orchestration platform for manufacturers and traders in Egypt and MENA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-konsol-900 text-white antialiased">
        {children}
      </body>
    </html>
  )
}

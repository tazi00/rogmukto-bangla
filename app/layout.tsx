import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rogmukto Bangla',
  description: 'Sankalpa Bharat Mission — Patient Tracking System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

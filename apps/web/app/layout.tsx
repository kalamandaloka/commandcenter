import React from 'react'
import './globals.css'

export const metadata = {
  title: 'Joint Command Demo',
  description: 'Command Exercise Visualization Demo'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

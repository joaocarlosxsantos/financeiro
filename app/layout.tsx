// app/layout.tsx
"use client" // necessário pois usa hook do React

import { SessionProvider } from "next-auth/react"
import React from "react"

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}

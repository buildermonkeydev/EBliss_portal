import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './components/providers'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
  title: 'Ebliss Cloud Admin',
  description: 'Ebliss Cloud Infrastructure Management Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
        <Providers>
          {children}
        </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}
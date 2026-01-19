import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Oswald } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-stats',
})

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700'],
  variable: '--font-oswald',
})

export const metadata: Metadata = {
  title: {
    default: 'EHA Connect - Player Profiles & Stats',
    template: '%s | EHA Connect',
  },
  description:
    'The official player profile and stats tracking platform for Elite Hoops Association events. Track your basketball journey, showcase your achievements, and get exposure to college coaches.',
  keywords: [
    'youth basketball',
    'player profiles',
    'basketball stats',
    'AAU basketball',
    'EHA',
    'Elite Hoops Association',
    'college recruiting',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EHA Connect',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },
  openGraph: {
    title: 'EHA Connect',
    description: 'Player Profiles & Stats for Elite Hoops Association',
    url: 'https://connect.ehacircuit.com',
    siteName: 'EHA Connect',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0D2B5B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} ${oswald.variable} font-sans antialiased bg-navy-gradient text-white min-h-screen`}>
        <SessionProvider>
          <Navbar />
          <main className="pt-16 min-h-[calc(100vh-80px)]">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  )
}

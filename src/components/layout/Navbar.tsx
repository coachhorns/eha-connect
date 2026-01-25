'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Menu, X, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Avatar } from '@/components/ui'

const navLinks = [
  { href: '/players', label: 'Players' },
  { href: '/teams', label: 'Teams' },
  { href: '/results', label: 'Results' },
  { href: '/standings', label: 'Standings' },
  { href: '/leaderboards', label: 'Leaderboards' },
  { href: '/events', label: 'Events' },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    // Check initial scroll position
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (href: string) => pathname.startsWith(href)
  const isScorekeeperMode = pathname.startsWith('/scorekeeper')

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 pt-[env(safe-area-inset-top)]",
      isScrolled
        ? "bg-[#0F0F1A]/80 backdrop-blur-md border-white/5 shadow-lg"
        : "bg-transparent border-transparent"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-auto py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/images/main.png"
              alt="EHA Connect"
              width={300}
              height={100}
              className="w-auto h-28 object-contain"
              priority
            />
          </Link>

          {/* Desktop Nav - Hidden in Scorekeeper Mode */}
          {!isScorekeeperMode && (
            <div className="hidden md:flex items-center gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center justify-center px-6 py-2 rounded-full border text-xs font-bold uppercase tracking-widest shadow-md transition-all duration-300 ease-out',
                    isActive(link.href)
                      ? 'bg-gradient-to-br from-[#FF1F40] to-[#600010] border-eha-red text-white shadow-lg shadow-eha-red/40'
                      : 'border-white/20 text-gray-300 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0.05)_100%)] hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.2),inset_0_0_10px_rgba(255,255,255,0.1)] hover:-translate-y-0.5'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-dark-surface animate-pulse" />
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-dark-surface transition-colors"
                >
                  <Avatar
                    src={session.user.image}
                    fallback={session.user.name || session.user.email || 'U'}
                    size="sm"
                  />
                  <span className="hidden sm:block text-sm text-gray-300">
                    {session.user.name || session.user.email}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-dark-surface border border-eha-silver/20 rounded-xl shadow-xl z-20 py-2">
                      <div className="px-4 py-2 border-b border-eha-silver/20">
                        <p className="text-sm font-medium text-white truncate">
                          {session.user.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {session.user.email}
                        </p>
                      </div>

                      {session.user.role === 'PROGRAM_DIRECTOR' ? (
                        <Link
                          href="/director/dashboard"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-eha-navy/50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          Director Dashboard
                        </Link>
                      ) : session.user.role !== 'ADMIN' && session.user.role !== 'SCOREKEEPER' ? (
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-eha-navy/50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          Dashboard
                        </Link>
                      ) : null}

                      <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-eha-navy/50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>

                      {session.user.role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-eha-red hover:bg-eha-navy/50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}

                      {session.user.role === 'SCOREKEEPER' && (
                        <Link
                          href="/scorekeeper"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-eha-red hover:bg-eha-navy/50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Scorekeeper
                        </Link>
                      )}

                      <div className="border-t border-eha-silver/20 mt-2 pt-2">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false)
                            signOut()
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-eha-navy/50 transition-colors w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/role-selection">
                  <Button size="sm">Get Started</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button - Hidden in Scorekeeper Mode */}
            {!isScorekeeperMode && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-400 hover:text-white"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu - Hidden in Scorekeeper Mode */}
      {mobileMenuOpen && !isScorekeeperMode && (
        <div className="md:hidden bg-eha-navy/95 backdrop-blur-xl border-t border-eha-silver/20">
          <div className="px-4 py-4">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block mb-4">
              <Image
                src="/images/main.png"
                alt="EHA Connect"
                width={120}
                height={32}
                className="w-auto h-8"
              />
            </Link>
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-4 py-3 font-heading font-bold uppercase tracking-[0.15em] text-sm transition-colors',
                    isActive(link.href)
                      ? 'text-eha-red border-l-2 border-eha-red bg-eha-red/10'
                      : 'text-gray-300 hover:text-white hover:bg-dark-surface'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

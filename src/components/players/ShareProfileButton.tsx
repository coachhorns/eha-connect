'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, Link, Check } from 'lucide-react'
import { Button } from '@/components/ui'

interface ShareProfileButtonProps {
  playerName: string
}

export default function ShareProfileButton({ playerName }: ShareProfileButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setIsOpen(false)
      }, 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShareTwitter = () => {
    const text = `Check out ${playerName}'s player profile on EHA Connect!`
    const url = window.location.href
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(twitterUrl, '_blank', 'width=550,height=420')
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="bg-white hover:bg-white/90 text-[#0A1D37] border-0 rounded-full px-6 py-6 text-[10px] font-extrabold uppercase tracking-widest shadow-lg"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share Profile
      </Button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-xl border border-border-subtle overflow-hidden z-50 min-w-[180px]">
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#0A1D37] hover:bg-surface-glass transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Link className="w-4 h-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>
          <button
            onClick={handleShareTwitter}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#0A1D37] hover:bg-surface-glass transition-colors border-t border-border-subtle"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Share on X</span>
          </button>
        </div>
      )}
    </div>
  )
}

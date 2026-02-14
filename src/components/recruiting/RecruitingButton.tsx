'use client'

import { useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui'
import RecruitingModal from './RecruitingModal'

interface RecruitingButtonProps {
  player: {
    firstName: string
    lastName: string
    graduationYear?: number | null
    slug: string
  }
}

export default function RecruitingButton({ player }: RecruitingButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="relative bg-eha-red hover:bg-eha-red text-white border-0 rounded-full px-6 py-6 text-[10px] font-extrabold uppercase tracking-widest shadow-[0_0_40px_rgba(200,16,46,0.8)] hover:shadow-[0_0_50px_rgba(200,16,46,1)] ring-4 ring-white/30 hover:ring-white/50 transition-all duration-300 animate-pulse hover:animate-none hover:scale-105"
      >
        <GraduationCap className="w-4 h-4 mr-2" />
        College Recruiting
      </Button>

      <RecruitingModal
        players={[player]}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

'use client'

import Link from 'next/link'
import { Users, User, Building2, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui'

const roles = [
  {
    id: 'PARENT',
    title: 'Parent / Guardian',
    description: 'Manage your child\'s player profile, track their stats, and follow their basketball journey.',
    icon: Users,
    features: [
      'Create and manage player profiles',
      'View game stats and achievements',
      'Upload photos and highlights',
    ],
  },
  {
    id: 'PLAYER',
    title: 'Player',
    description: 'Build your own profile, showcase your skills, and get discovered by college coaches.',
    icon: User,
    features: [
      'Personal player profile',
      'Track your own stats',
      'Share with recruiters',
    ],
  },
  {
    id: 'PROGRAM_DIRECTOR',
    title: 'Club / Program Director',
    description: 'Manage your club\'s teams, rosters, and represent your program in EHA events.',
    icon: Building2,
    features: [
      'Create and manage your program',
      'Build team rosters',
      'Register for EHA events',
    ],
  },
]

export default function RoleSelectionPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B00] to-[#FFD700] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">EHA</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Join EHA Connect</h1>
          <p className="text-gray-400 mt-2">
            Select your account type to get started
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Link
              key={role.id}
              href={`/auth/signup?role=${role.id}`}
              className="block group"
            >
              <Card className="h-full p-6 border-2 border-transparent hover:border-eha-red/50 transition-all duration-300 group-hover:bg-[#1a3a6e]/30">
                {/* Icon */}
                <div className="w-14 h-14 bg-gradient-to-br from-[#FF1F40]/20 to-[#600010]/40 rounded-xl flex items-center justify-center mb-4 group-hover:from-[#FF1F40]/30 group-hover:to-[#600010]/50 transition-all">
                  <role.icon className="w-7 h-7 text-white" />
                </div>

                {/* Title & Description */}
                <h2 className="text-xl font-bold text-white mb-2">{role.title}</h2>
                <p className="text-gray-400 text-sm mb-4">{role.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {role.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 bg-eha-red rounded-full mt-1.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="flex items-center gap-2 text-eha-red font-medium group-hover:gap-3 transition-all">
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Sign In Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-eha-red hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

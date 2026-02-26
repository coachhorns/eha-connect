'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Users, User, Building2, ArrowRight, Check } from 'lucide-react'

const roles = [
  {
    id: 'PARENT',
    title: 'Parent / Guardian',
    description:
      "Manage your child's player profile, track their stats, and follow their basketball journey.",
    icon: Users,
    features: [
      'Create and manage player profiles',
      'View game stats and achievements',
      'Upload photos and highlights',
    ],
    color: 'from-blue-500/20 to-blue-600/10',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    id: 'PLAYER',
    title: 'Player',
    description:
      'Build your own profile, showcase your skills, and get discovered by college coaches.',
    icon: User,
    features: ['Personal player profile', 'Track your own stats', 'Share with recruiters'],
    color: 'from-[#E31837]/20 to-[#E31837]/10',
    iconBg: 'bg-[#E31837]/20',
    iconColor: 'text-[#E31837]',
  },
  {
    id: 'PROGRAM_DIRECTOR',
    title: 'Club / Program Director',
    description: "Manage your club's teams, rosters, and represent your program in EHA events.",
    icon: Building2,
    features: ['Create and manage your program', 'Build team rosters', 'Register for EHA events'],
    color: 'from-amber-500/20 to-amber-600/10',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
]

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen bg-[#0A1D37] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#E31837] blur-[180px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500 blur-[150px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-amber-500 blur-[120px] opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Image
            src="/images/main.png"
            alt="EHA Connect"
            width={380}
            height={120}
            className="w-auto h-40 mx-auto mb-3 object-contain"
            priority
          />
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-tight mb-4">
            Join EHA Connect
          </h1>
          <p className="text-gray-400 text-lg font-light max-w-xl mx-auto">
            Select your account type to get started with the official platform for Elite Hoops
            Association
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Link key={role.id} href={`/auth/signup?role=${role.id}`} className="block group">
              <div className="h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                {/* Icon */}
                <div
                  className={`w-16 h-16 ${role.iconBg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                >
                  <role.icon className={`w-8 h-8 ${role.iconColor}`} />
                </div>

                {/* Title & Description */}
                <h2 className="text-xl font-heading font-bold text-white mb-2 group-hover:text-[#E31837] transition-colors">
                  {role.title}
                </h2>
                <p className="text-gray-400 text-sm mb-5 leading-relaxed">{role.description}</p>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {role.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-gray-300">
                      <div className="w-5 h-5 bg-[#E31837]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-[#E31837]" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="flex items-center gap-2 text-[#E31837] font-semibold group-hover:gap-4 transition-all duration-300">
                  <span className="uppercase tracking-widest text-sm">Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Sign In Link */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-6 py-3">
            <p className="text-gray-400 text-sm">Already have an account?</p>
            <Link
              href="/auth/signin"
              className="text-[#E31837] hover:text-white transition-colors font-semibold text-sm flex items-center gap-2"
            >
              Sign in
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

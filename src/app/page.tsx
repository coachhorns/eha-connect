import Link from 'next/link'
import { Button, Card } from '@/components/ui'
import {
  Trophy,
  Users,
  BarChart3,
  Shield,
  Star,
  Camera,
  Share2,
  Download,
} from 'lucide-react'

const features = [
  {
    icon: BarChart3,
    title: 'Live Stats Tracking',
    description:
      'Real-time stats recorded by official EHA scorekeepers at every game. Watch your numbers grow.',
  },
  {
    icon: Trophy,
    title: 'Achievement Badges',
    description:
      'Earn recognition for MVP awards, All-Tournament selections, championships, and stat milestones.',
  },
  {
    icon: Shield,
    title: 'Verified Profiles',
    description:
      'Age and grade verification ensures fair play and builds trust with college recruiters.',
  },
  {
    icon: Camera,
    title: 'Photo & Video Gallery',
    description:
      'Upload highlights and game photos to showcase your skills to coaches and scouts.',
  },
  {
    icon: Share2,
    title: 'Shareable Profile',
    description:
      'Professional public profile URL perfect for sharing with college coaches and recruiters.',
  },
  {
    icon: Download,
    title: 'PDF Export',
    description:
      'Download your complete player profile as a professional PDF for recruiting packets.',
  },
]

const stats = [
  { value: '5,000+', label: 'Players' },
  { value: '200+', label: 'Teams' },
  { value: '50+', label: 'Events per Year' },
  { value: '100K+', label: 'Stats Recorded' },
]

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B00]/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF6B00]/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-full text-[#FF6B00] text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              Official Stats Platform for EHA Events
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Your Basketball Journey,{' '}
              <span className="text-gradient">Tracked & Showcased</span>
            </h1>

            <p className="mt-6 text-xl text-gray-400 max-w-3xl mx-auto">
              EHA Connect is the official player profile and stats tracking platform for Elite
              Hoops Association events. Build your profile, track your stats, and get exposure
              to college coaches.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/pricing">
                <Button size="lg" className="px-8">
                  Get Your Pass - $75/year
                </Button>
              </Link>
              <Link href="/players">
                <Button variant="outline" size="lg" className="px-8">
                  Browse Players
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-gradient">{stat.value}</div>
                <div className="mt-1 text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#1A1A2E]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Everything You Need to Get Noticed
            </h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
              EHA Connect gives young athletes the tools to track their development and
              showcase their talent to the next level.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} variant="hover" className="p-6">
                <div className="w-12 h-12 bg-[#FF6B00]/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#FF6B00]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">How It Works</h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
              Getting started with EHA Connect is easy. Here&apos;s how it works.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FF6B00] rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Get Your Pass</h3>
              <p className="text-gray-400">
                Subscribe to EHA Connect for $75/year and create your player profile with
                photos, bio, and contact info.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#FF6B00] rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Play in EHA Events</h3>
              <p className="text-gray-400">
                Compete in EHA tournaments and leagues. Official scorekeepers record your
                stats in real-time.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#FF6B00] rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Get Discovered</h3>
              <p className="text-gray-400">
                Share your profile with college coaches. Your stats, achievements, and
                highlights all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#FF6B00]/20 to-[#FFD700]/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of athletes tracking their basketball careers with EHA Connect.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="px-10">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Live Stats Preview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Real-Time Stats at Every Game
              </h2>
              <p className="text-gray-400 mb-6">
                Our official scorekeepers use tablet-optimized software to record every
                point, rebound, assist, steal, and block as it happens. Parents and fans
                can follow along live from their phones.
              </p>
              <ul className="space-y-4">
                {[
                  'Live box scores updated in real-time',
                  'Automatic player profile stat updates',
                  'Season and career stat tracking',
                  'Event leaderboards and awards',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300">
                    <div className="w-5 h-5 bg-[#FF6B00]/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-[#FF6B00] rounded-full" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mock Box Score */}
            <Card className="overflow-hidden">
              <div className="p-4 bg-[#252540] border-b border-[#252540]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">EHA Spring Showcase - Court 3</span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    LIVE
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-2">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="font-semibold text-white">Team Blue</p>
                    <p className="text-3xl font-bold text-white mt-1">54</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">3rd Quarter</p>
                    <p className="text-2xl font-mono text-white">4:32</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-2">
                      <Users className="w-6 h-6 text-red-400" />
                    </div>
                    <p className="font-semibold text-white">Team Red</p>
                    <p className="text-3xl font-bold text-white mt-1">48</p>
                  </div>
                </div>

                {/* Top Performers */}
                <div className="border-t border-[#252540] pt-4">
                  <p className="text-sm text-gray-400 mb-3">Top Performers</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white">J. Smith (#23)</span>
                      <span className="text-[#FF6B00]">18 PTS, 5 REB, 3 AST</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white">M. Johnson (#11)</span>
                      <span className="text-[#FF6B00]">14 PTS, 8 REB, 2 BLK</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

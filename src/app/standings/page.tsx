'use client'

import { useState, useEffect } from 'react'
import {
  Trophy,
  Calendar,
  ChevronDown,
  ArrowRight,
  Radio,
  Shield,
  TrendingUp,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui'

// Mock Data
const atlanticEliteTeams = [
  { pos: 1, abbr: 'BE', name: 'Brooklyn Elite', wins: 12, losses: 2, pct: '.857', streak: 'W6', streakType: 'W', lastTen: '9-1' },
  { pos: 2, abbr: 'NJS', name: 'NJ Scholars', wins: 11, losses: 3, pct: '.786', streak: 'W2', streakType: 'W', lastTen: '7-3' },
  { pos: 3, abbr: 'DCG', name: 'DC Grads', wins: 9, losses: 5, pct: '.643', streak: 'L1', streakType: 'L', lastTen: '6-4' },
  { pos: 4, abbr: 'PHX', name: 'Philly Xpress', wins: 8, losses: 6, pct: '.571', streak: 'L2', streakType: 'L', lastTen: '4-6' }
]

const coastalPremierTeams = [
  { pos: 1, abbr: 'MIA', name: 'Miami Tropics', wins: 14, losses: 0, pct: '1.000', streak: 'W14', streakType: 'W', lastTen: '10-0' },
  { pos: 2, abbr: 'ORL', name: 'Orlando Magic AAU', wins: 10, losses: 4, pct: '.714', streak: 'W1', streakType: 'W', lastTen: '8-2' }
]

const matchups = [
  {
    date: 'Saturday • Oct 12 • 4:30 PM',
    team1Abbr: 'BE',
    team1Name: 'Brooklyn Elite',
    team1Record: '12-2',
    team1Color: '#0A1D37',
    team2Abbr: 'NJS',
    team2Name: 'NJ Scholars',
    team2Record: '11-3',
    team2Color: '#E31837',
    buttonText: 'Watch Preview'
  },
  {
    date: 'Saturday • Oct 12 • 6:00 PM',
    team1Abbr: 'DCG',
    team1Name: 'DC Grads',
    team1Record: '9-5',
    team1Color: '#cbd5e1', // Using gray/silver
    team2Abbr: 'PHX',
    team2Name: 'Philly Xpress',
    team2Record: '8-6',
    team2Color: '#cbd5e1',
    buttonText: 'Watch Live'
  }
]

export default function StandingsPage() {
  const [division, setDivision] = useState('All Divisions')
  const [teams, setTeams] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStandings = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/standings?division=${division}`)
        const data = await res.json()
        if (data.teams) {
          setTeams(data.teams)
        } else {
          setTeams([])
        }
      } catch (error) {
        console.error('Error fetching standings:', error)
        setTeams([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchStandings()
  }, [division])

  return (
    <div className="min-h-screen bg-page-bg text-text-primary font-sans selection:bg-eha-red selection:text-white">
      {/* Header / Hero */}
      <header className="pt-32 pb-12 bg-page-bg-alt border-b border-border-subtle relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 relative z-10">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-eha-red/10 border border-eha-red/20 rounded-full">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-eha-red">Season 2026</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-heading font-bold tracking-tighter text-text-primary">League Standings</h1>
            </div>

            <div className="flex gap-4">
              <div className="relative">
                <select
                  className="appearance-none bg-page-bg-alt border border-border-default pl-4 pr-10 py-3 text-[11px] font-extrabold uppercase tracking-widest rounded-sm focus:outline-none focus:border-eha-red text-text-primary min-w-[180px]"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                >
                  <option value="All Divisions">All Divisions</option>
                  <option value="EPL">EPL</option>
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          </div>

        </div>
      </header>

      <main className="py-12">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">

          {/* Highlights Grid - Placeholder or use real data if available */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* We can hide these or make them dynamic later. For now, static placeholders as example/empty state */}
            {/* If we strictly want NO empty/fake data, conditionally render these only if we have highlights. 
                 Since user asked for "records yet because we don't have any games", maybe hide highlights or show a "Season Starts Soon" card.
             */}
            <div className="p-6 border border-border-default rounded-sm flex items-center justify-between bg-eha-red/10 border-eha-red/20 shadow-lg relative overflow-hidden md:col-span-3">
              <div className="absolute top-0 right-0 p-16 bg-eha-red/20 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
              <div className="flex flex-col relative z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-widest mb-1 text-eha-red">
                  Season 2026
                </span>
                <span className="text-text-primary font-bold text-sm">Official Season begins soon on EHA Connect</span>
              </div>
              <Activity className="w-6 h-6 text-eha-red animate-pulse relative z-10" />
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">

            {/* Standings Tables */}
            <div className="lg:col-span-2 space-y-12">
              {isLoading ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 border-4 border-eha-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-text-muted">Loading standings...</p>
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-20 border border-border-default rounded-sm bg-page-bg-alt">
                  <Trophy className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-bold text-text-primary mb-2">No Teams Found</h3>
                  <p className="text-text-muted">No teams found for the selected filters.</p>
                </div>
              ) : division === 'All Divisions' ? (
                <>
                  <StandingsTable
                    division="EPL"
                    teams={teams.filter(t => t.division === 'EPL')}
                  />
                  <div className="h-px bg-surface-glass my-12" />
                  <StandingsTable
                    division="Gold"
                    teams={teams.filter(t => t.division === 'Gold')}
                  />
                  <div className="h-px bg-surface-glass my-12" />
                  <StandingsTable
                    division="Silver"
                    teams={teams.filter(t => t.division === 'Silver')}
                  />
                </>
              ) : (
                <StandingsTable
                  division={division}
                  teams={teams}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-12">

              {/* Matchups - Hide if no games */}
              {/* <div>
                <div className="flex justify-between items-baseline mb-6">
                  <h3 className="text-xl font-heading font-bold text-white">
                    Featured Matchups
                  </h3>
                  <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-eha-red hover:text-white transition-colors">
                    Full Schedule
                  </a>
                </div>

                <div className="space-y-4">
                  {matchups.map((matchup, index) => (
                    <MatchupCard key={index} matchup={matchup} />
                  ))}
                </div>
              </div> */}

              {/* Conference Leaders Widget - Placeholder */}
              <div className="bg-page-bg-alt border border-border-default p-8 rounded-sm shadow-xl">
                <h4 className="text-xs font-extrabold uppercase mb-6 text-eha-red tracking-[0.2em]">
                  League Leaders
                </h4>
                <div className="space-y-6">
                  <p className="text-sm text-text-muted italic">Stats will appear here once the season begins.</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

// Sub-components

const StandingsTable = ({ division, teams }: { division: string, teams: any[] }) => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-6 w-1 bg-eha-red"></div>
        <h2 className="text-2xl font-heading font-bold text-text-primary">
          Division: {division}
        </h2>
      </div>

      <div className="bg-page-bg-alt border border-border-default overflow-hidden rounded-sm shadow-xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-raised border-b border-border-subtle">
              <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-text-muted">Pos</th>
              <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-text-muted">Team Name</th>
              <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-text-muted text-center">W</th>
              <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-text-muted text-center">L</th>
              <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-text-muted text-center">PCT</th>
              <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-text-muted text-center">Strk</th>
              <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-text-muted">L10</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {teams.map((team, index) => (
              <tr key={index} className="transition-colors group hover:bg-surface-glass">
                <td className="px-6 py-5 font-bold text-text-primary">{team.pos}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-surface-overlay rounded-full flex items-center justify-center text-[10px] font-black text-text-primary">
                      {team.abbr}
                    </div>
                    <span className="font-bold text-text-primary group-hover:text-eha-red transition-colors">
                      {team.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center font-bold text-text-primary">{team.wins}</td>
                <td className="px-6 py-5 text-center font-bold text-text-primary">{team.losses}</td>
                <td className="px-6 py-5 text-center text-text-muted font-medium">{team.pct}</td>
                <td
                  className="px-6 py-5 text-center font-bold"
                  style={{ color: team.streakType === 'W' ? '#4ade80' : '#E31837' }}
                >
                  {team.streak}
                </td>
                <td className="px-6 py-5 text-xs font-bold text-text-muted">{team.lastTen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const MatchupCard = ({ matchup }: { matchup: any }) => {
  return (
    <div className="bg-page-bg-alt border border-border-default p-5 rounded-sm hover:border-eha-red/50 transition-colors shadow-lg group">
      <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
        <Calendar className="w-3 h-3 text-eha-red" />
        {matchup.date}
      </div>

      {/* Team 1 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 text-white text-[8px] flex items-center justify-center rounded-sm font-bold shadow-sm"
            style={{ backgroundColor: matchup.team1Color }}
          >
            {matchup.team1Abbr}
          </div>
          <span className="text-sm font-bold text-text-primary">{matchup.team1Name}</span>
        </div>
        <span className="text-[10px] font-bold text-text-muted uppercase">{matchup.team1Record}</span>
      </div>

      {/* Team 2 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 text-white text-[8px] flex items-center justify-center rounded-sm font-bold shadow-sm"
            style={{ backgroundColor: matchup.team2Color }}
          >
            {matchup.team2Abbr}
          </div>
          <span className="text-sm font-bold text-text-primary">{matchup.team2Name}</span>
        </div>
        <span className="text-[10px] font-bold text-text-muted uppercase">{matchup.team2Record}</span>
      </div>

      <div className="mt-4 pt-4 border-t border-border-subtle">
        <button className="w-full py-2 bg-surface-glass text-[10px] font-extrabold text-text-primary uppercase tracking-widest rounded-sm hover:bg-eha-red hover:text-white transition-all">
          {matchup.buttonText}
        </button>
      </div>
    </div>
  )
}

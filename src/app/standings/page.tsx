'use client'

import { useState, useEffect } from 'react'
import {
  Trophy,
  ChevronDown,
  Activity
} from 'lucide-react'

export default function StandingsPage() {
  const [division, setDivision] = useState('All Divisions')
  const [teams, setTeams] = useState<any[]>([])
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStandings = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/standings?division=${division}`)
        const data = await res.json()
        if (data.teams) {
          setTeams(data.teams)
          // Extract unique divisions from the data (only on "All Divisions" fetch)
          if (division === 'All Divisions') {
            const uniqueDivisions = [...new Set(data.teams.map((t: any) => t.division).filter(Boolean))] as string[]
            // Sort by the canonical order from constants, with any unknown divisions at the end
            const { divisions: divisionOrder } = require('@/lib/constants')
            uniqueDivisions.sort((a: string, b: string) => {
              const idxA = divisionOrder.indexOf(a)
              const idxB = divisionOrder.indexOf(b)
              if (idxA === -1 && idxB === -1) return a.localeCompare(b)
              if (idxA === -1) return 1
              if (idxB === -1) return -1
              return idxA - idxB
            })
            setAvailableDivisions(uniqueDivisions)
          }
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
      <header className="pt-32 pb-12 border-b border-border-subtle relative overflow-hidden">
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
                  {availableDivisions.map((div) => (
                    <option key={div} value={div}>{div}</option>
                  ))}
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
                  {availableDivisions.map((div, i) => {
                    const divTeams = teams.filter(t => t.division === div)
                    if (divTeams.length === 0) return null
                    return (
                      <div key={div}>
                        {i > 0 && <div className="h-px bg-surface-glass my-12" />}
                        <StandingsTable
                          division={div}
                          teams={divTeams}
                        />
                      </div>
                    )
                  })}
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


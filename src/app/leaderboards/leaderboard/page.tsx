'use client'

import { useState } from 'react'
import {
    Trophy,
    User,
    Download,
    Filter,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Activity,
    Target
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'

const players = [
    { rank: 1, initials: 'DR', name: 'David Reed', class: 'Class of 2025', team: 'Metro Elite Academy', position: 'SG', gamesPlayed: 12, ppg: 31.2, rpg: 6.4, apg: 4.1, per: 34.2 },
    { rank: 2, initials: 'JC', name: 'Jalen Collins', class: 'Class of 2026', team: 'Westside Warriors', position: 'PG', gamesPlayed: 14, ppg: 29.4, rpg: 3.2, apg: 9.2, per: 31.8 },
    { rank: 3, initials: 'MT', name: 'Marcus Thompson', class: 'Class of 2026', team: 'North Shore Heat', position: 'PG', gamesPlayed: 11, ppg: 28.4, rpg: 6.5, apg: 8.2, per: 32.4 },
    { rank: 4, initials: 'TY', name: 'Trevor Young', class: 'Class of 2025', team: 'Capital City United', position: 'PF', gamesPlayed: 13, ppg: 26.1, rpg: 11.4, apg: 2.5, per: 30.1 },
    { rank: 5, initials: 'SM', name: 'Sam Miller', class: 'Class of 2027', team: 'Elite Prospects', position: 'SF', gamesPlayed: 15, ppg: 25.8, rpg: 8.1, apg: 3.4, per: 28.9 }
]

// Components adapted from snippet
const FilterSelect = ({ label, options, value, onChange }: { label: string, options: string[], value: string, onChange: (e: any) => void }) => (
    <div className="flex flex-col gap-2">
        <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{label}</label>
        <select
            className="bg-[#0a1628] border border-white/10 text-white text-sm font-bold px-4 py-2 rounded-sm focus:outline-none focus:border-eha-red"
            value={value}
            onChange={onChange}
        >
            {options.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
)

const PositionFilter = ({ activePosition, onPositionChange }: { activePosition: string, onPositionChange: (pos: string) => void }) => {
    const positions = ['All', 'PG', 'SG', 'SF', 'PF', 'C']

    return (
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Position</label>
            <div className="flex gap-1">
                {positions.map(pos => (
                    <button
                        key={pos}
                        onClick={() => onPositionChange(pos)}
                        className={`px-4 py-2 border text-[10px] font-bold uppercase rounded-sm transition-colors ${activePosition === pos
                                ? 'bg-eha-red text-white border-eha-red'
                                : 'bg-[#0a1628] text-gray-400 border-white/10 hover:border-white/30 hover:text-white'
                            }`}
                    >
                        {pos}
                    </button>
                ))}
            </div>
        </div>
    )
}

const LeaderCard = ({ title, playerName, teamName, stat, statLabel, isPrimary, icon: Icon }: any) => (
    <div className={`p-8 rounded-sm relative overflow-hidden subtle-shadow group ${isPrimary ? 'bg-gradient-to-br from-[#153361] to-[#0A1D37] border border-white/10' : 'bg-[#0a1628] border border-white/5'
        }`}>
        <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 group-hover:scale-110 transition-transform duration-500">
            <Trophy className="w-32 h-32 text-gray-400" />
        </div>
        <span className="text-[10px] font-extrabold text-eha-red uppercase tracking-[0.3em] mb-4 block">{title}</span>
        <div className="flex items-center gap-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${isPrimary ? 'bg-white/5 border-eha-red' : 'bg-white/5 border-white/10'
                }`}>
                {Icon ? <Icon className={`w-8 h-8 ${isPrimary ? 'text-white' : 'text-gray-400'}`} /> : <User className={`w-8 h-8 ${isPrimary ? 'text-white' : 'text-gray-400'}`} />}
            </div>
            <div className="z-10">
                <h3 className="text-2xl font-bold font-heading text-white leading-none mb-1">{playerName}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{teamName}</p>
            </div>
        </div>
        <div className="mt-8 flex items-baseline gap-2 z-10 relative">
            <span className="text-5xl font-extrabold tracking-tighter text-white font-heading">{stat}</span>
            <span className="text-sm font-bold text-gray-400 uppercase">{statLabel}</span>
        </div>
    </div>
)

const LeaderboardRow = ({ rank, player, onClick }: any) => (
    <tr
        className="border-b border-white/5 transition-colors cursor-pointer hover:bg-white/5 group"
        onClick={onClick}
    >
        <td className="px-8 py-6 font-black text-white text-lg font-heading">{rank}</td>
        <td className="px-8 py-6">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#153361] rounded-full flex items-center justify-center font-bold text-xs text-white border border-white/10 group-hover:border-eha-red/50 transition-colors">
                    {player.initials}
                </div>
                <div>
                    <div className="font-bold text-white font-heading">{player.name}</div>
                    <div className="text-[10px] font-bold text-eha-red uppercase tracking-widest">{player.class}</div>
                </div>
            </div>
        </td>
        <td className="px-8 py-6 text-sm font-semibold text-gray-400">{player.team}</td>
        <td className="px-8 py-6 text-sm font-bold text-white text-center font-heading">{player.position}</td>
        <td className="px-8 py-6 text-sm font-semibold text-gray-400 text-center">{player.gamesPlayed}</td>
        <td className="px-8 py-6 font-bold text-white text-right bg-white/5">{player.ppg}</td>
        <td className="px-8 py-6 text-sm font-semibold text-gray-400 text-right">{player.rpg}</td>
        <td className="px-8 py-6 text-sm font-semibold text-gray-400 text-right">{player.apg}</td>
        <td className="px-8 py-6 text-sm font-bold text-green-400 text-right font-stats">{player.per}</td>
    </tr>
)

export default function LeaderboardsPage() {
    const [division, setDivision] = useState('All Divisions')
    const [category, setCategory] = useState('Points Per Game')
    const [region, setRegion] = useState('National')
    const [activePosition, setActivePosition] = useState('All')
    const [currentPage, setCurrentPage] = useState(1)

    return (
        <div className="min-h-screen bg-[#0A1D37]">
            {/* Header / Hero */}
            <header className="pt-32 pb-12 bg-[#0a1628] border-b border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-eha-red/10 border border-eha-red/20 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-eha-red animate-pulse"></span>
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-eha-red">Live Updates: 2024 Circuit</span>
                            </div>
                            <h1 className="text-5xl lg:text-6xl text-white font-heading font-bold tracking-tighter">Leaderboards</h1>
                            <p className="text-gray-400 max-w-xl font-light">Filter through the top performers across the association. Data verified by independent on-site statisticians.</p>
                        </div>
                        <div className="flex gap-3">
                            <button className="flex items-center gap-2 px-5 py-3 bg-[#0a1628] border border-white/10 rounded-sm font-bold text-xs uppercase tracking-widest text-white hover:bg-[#153361] transition-colors">
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                            <button className="flex items-center gap-2 px-5 py-3 bg-eha-navy text-white border border-white/10 rounded-sm font-bold text-xs uppercase tracking-widest hover:bg-eha-red hover:border-eha-red transition-all shadow-lg">
                                <Filter className="w-4 h-4" /> Advanced Filter
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Sticky Filters */}
            <section className="py-10 bg-[#0A1D37] sticky top-20 z-40 border-b border-white/5 backdrop-blur-md bg-opacity-90 shadow-xl">
                <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
                    <div className="flex flex-wrap items-center gap-8">
                        <FilterSelect
                            label="Division"
                            options={['All Divisions', '17U Varsity', '16U Junior Varsity', '15U Freshman']}
                            value={division}
                            onChange={(e) => setDivision(e.target.value)}
                        />
                        <FilterSelect
                            label="Category"
                            options={['Points Per Game', 'Assists Per Game', 'Rebounds Per Game', 'Player Efficiency (PER)', '3PT Percentage']}
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        />
                        <FilterSelect
                            label="Region"
                            options={['National', 'Northeast', 'Southeast', 'Midwest', 'West Coast']}
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                        />
                        <PositionFilter
                            activePosition={activePosition}
                            onPositionChange={setActivePosition}
                        />
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <main className="py-20">
                <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">

                    {/* Top Leaders Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                        <LeaderCard
                            title="Top Scorer"
                            playerName="David Reed"
                            teamName="Metro Elite Academy"
                            stat="31.2"
                            statLabel="PPG"
                            isPrimary={true}
                            icon={Target}
                        />
                        <LeaderCard
                            title="Assists Leader"
                            playerName="Mike Chen"
                            teamName="Bayshore Prep"
                            stat="10.5"
                            statLabel="APG"
                            isPrimary={false}
                            icon={Activity}
                        />
                        <LeaderCard
                            title="Rim Protector"
                            playerName="K. Walker"
                            teamName="Heights Prep"
                            stat="4.2"
                            statLabel="BPG"
                            isPrimary={false}
                            icon={TrendingUp}
                        />
                    </div>

                    {/* Leaderboard Table */}
                    <div className="bg-[#0a1628] border border-white/10 rounded-sm overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#153361] border-b border-white/5">
                                        <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Rank</th>
                                        <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Player</th>
                                        <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Team</th>
                                        <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-center">Pos</th>
                                        <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-center">GP</th>
                                        <th className="px-8 py-5 text-[10px] font-extrabold text-white uppercase tracking-widest text-right bg-white/5">PPG</th>
                                        <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-right">RPG</th>
                                        <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-right">APG</th>
                                        <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-right">PER</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players.map((player) => (
                                        <LeaderboardRow
                                            key={player.rank}
                                            rank={player.rank}
                                            player={player}
                                            onClick={() => console.log(`Clicked on ${player.name}`)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-8 py-6 bg-[#0a1628] border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Showing 1-25 of 1,240 Players</span>
                            <div className="flex gap-2">
                                <button
                                    className="w-10 h-10 flex items-center justify-center border border-white/10 bg-[#0a1628] text-white rounded-sm hover:border-eha-red transition-colors"
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {[1, 2, 3].map(page => (
                                    <button
                                        key={page}
                                        className={`w-10 h-10 flex items-center justify-center border rounded-sm text-xs font-bold transition-colors ${currentPage === page
                                                ? 'border-eha-red bg-eha-red text-white'
                                                : 'border-white/10 bg-[#0a1628] text-white hover:border-eha-red'
                                            }`}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <div className="w-10 h-10 flex items-center justify-center text-gray-500">...</div>
                                <button
                                    className="w-10 h-10 flex items-center justify-center border border-white/10 bg-[#0a1628] text-white rounded-sm hover:border-eha-red transition-colors"
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

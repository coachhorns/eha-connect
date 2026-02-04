'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, MapPin, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'

interface Venue {
    id: string
    name: string
    city: string | null
    state: string | null
    _count: {
        courts: number
    }
}

export default function VenuesPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [venues, setVenues] = useState<Venue[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        } else if (session?.user.role !== 'ADMIN') {
            router.push('/')
        }
    }, [status, session, router])

    useEffect(() => {
        const fetchVenues = async () => {
            try {
                setIsLoading(true)
                const params = new URLSearchParams()
                if (searchTerm) params.append('search', searchTerm)

                const res = await fetch(`/api/admin/venues?${params.toString()}`)
                if (res.ok) {
                    const data = await res.json()
                    setVenues(data.venues)
                }
            } catch (error) {
                console.error('Error fetching venues:', error)
            } finally {
                setIsLoading(false)
            }
        }

        if (session?.user.role === 'ADMIN') {
            const timeoutId = setTimeout(() => {
                fetchVenues()
            }, 300)
            return () => clearTimeout(timeoutId)
        }
    }, [session, searchTerm])

    if (status === 'loading') {
        return <div className="p-8 text-center text-gray-400">Loading...</div>
    }

    return (
        <div className="min-h-screen">
            <header className="pt-32 lg:pt-36 relative overflow-hidden bg-gradient-to-br from-[#0A1D37] to-[#152e50] border-b border-white/5">
                <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10 lg:py-14 relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                        <div>
                            <span className="inline-block px-3 py-1 bg-eha-red text-white text-[10px] font-extrabold tracking-widest uppercase rounded-sm shadow-lg shadow-eha-red/20 mb-4">Admin Panel</span>
                            <h1 className="font-heading font-bold text-4xl lg:text-5xl text-white uppercase tracking-tighter">Venues</h1>
                            <p className="mt-3 text-white/60 font-bold text-sm uppercase tracking-widest">Manage tournament locations and courts</p>
                        </div>
                        <Link href="/admin/venues/new">
                            <Button className="flex items-center gap-2"><Plus className="w-4 h-4" />Add Venue</Button>
                        </Link>
                    </div>
                </div>
            </header>
            <main className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-10">

            {/* Search */}
            <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search venues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-sm px-4 py-3 pl-11 text-sm focus:outline-none focus:border-eha-red focus:ring-2 focus:ring-eha-red/20 transition-all"
                />
            </div>

            {/* Venues Grid */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-400">Loading venues...</p>
                </div>
            ) : venues.length === 0 ? (
                <div className="text-center py-12 bg-[#152e50]/30 rounded-sm border border-dashed border-white/10">
                    <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-300">No venues found</h3>
                    <p className="text-gray-500 mt-1">Get started by adding your first venue.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {venues.map((venue) => (
                        <div key={venue.id} className="bg-[#152e50]/30 border border-white/5 rounded-sm group hover:border-eha-red/50 hover:-translate-y-0.5 transition-all">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-eha-red/10 flex items-center justify-center text-eha-red">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link href={`/admin/venues/${venue.id}/edit`}>
                                            <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </Link>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1 truncate">{venue.name}</h3>
                                <p className="text-sm text-gray-400 mb-4">
                                    {[venue.city, venue.state].filter(Boolean).join(', ') || 'Location not set'}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                    <span className="text-sm text-gray-400">
                                        {venue._count.courts} {venue._count.courts === 1 ? 'Court' : 'Courts'}
                                    </span>
                                    <Link
                                        href={`/admin/venues/${venue.id}/edit`}
                                        className="text-sm text-eha-red hover:underline font-medium"
                                    >
                                        Manage
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            </main>
        </div>
    )
}

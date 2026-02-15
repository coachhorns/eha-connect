'use client'

import { useState, useEffect } from 'react'
import { GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui'

interface Attendee {
  school: string
  division: string
  firstName: string
  lastName: string
}

interface CollegesAttendingProps {
  eventId: string
}

export default function CollegesAttending({ eventId }: CollegesAttendingProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAttendees = async () => {
      try {
        const res = await fetch(`/api/recruiting-packet/attendees?eventId=${eventId}`)
        if (res.ok) {
          const data = await res.json()
          setAttendees(data.attendees || [])
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false)
      }
    }
    fetchAttendees()
  }, [eventId])

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
              Colleges Attending
            </h3>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  // Group by school (deduplicate)
  const uniqueSchools = Array.from(
    new Map(attendees.map((a) => [a.school, a])).values()
  )

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
              Colleges Attending
            </h3>
          </div>
          {uniqueSchools.length > 0 && (
            <Badge variant="gold" size="sm">{uniqueSchools.length}</Badge>
          )}
        </div>
      </div>
      <div className="px-5 py-3">
        {uniqueSchools.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No colleges registered yet</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {uniqueSchools.map((attendee, i) => (
              <li key={i} className="py-2.5 flex items-center justify-between">
                <span className="text-sm text-white font-medium">{attendee.school}</span>
                <Badge variant="default" size="sm">{attendee.division}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  Users,
  GitBranch,
  LayoutGrid,
  GripVertical,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, Button, Badge, Select, Input } from '@/components/ui'

interface Event {
  id: string
  name: string
}

interface Team {
  id: string
  name: string
  ageGroup: string | null
  division: string | null
  program?: { id: string; name: string } | null
  seed: number | null
}

type WizardStep = 'event' | 'type' | 'teams' | 'configure' | 'generate'
type BracketType = 'POOL' | 'BRACKET'

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'event', label: 'Select Event' },
  { key: 'type', label: 'Select Type' },
  { key: 'teams', label: 'Select Teams' },
  { key: 'configure', label: 'Configure' },
  { key: 'generate', label: 'Generate' },
]

// Sortable Team Item for seeding
function SortableTeamItem({ team, index }: { team: Team; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-dark-surface border border-eha-silver/20 rounded-lg ${
        isDragging ? 'opacity-50 ring-2 ring-eha-red' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-gray-500" />
      </div>
      <div className="w-8 h-8 bg-eha-red/20 rounded-full flex items-center justify-center">
        <span className="text-sm font-bold text-eha-red">{index + 1}</span>
      </div>
      <div className="flex-1">
        <p className="font-medium text-white">{team.name}</p>
        {team.program?.name && (
          <p className="text-xs text-gray-500">{team.program?.name}</p>
        )}
      </div>
      {(team.ageGroup || team.division) && (
        <div className="flex gap-1">
          {team.ageGroup && <Badge size="sm">{team.ageGroup}</Badge>}
          {team.division && <Badge size="sm">{team.division}</Badge>}
        </div>
      )}
    </div>
  )
}

export default function NewBracketWizardPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('event')
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())

  // Selection state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [bracketType, setBracketType] = useState<BracketType | null>(null)
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([])
  const [bracketName, setBracketName] = useState('')
  const [poolCode, setPoolCode] = useState('')
  const [orderedTeams, setOrderedTeams] = useState<Team[]>([])

  // Data state
  const [events, setEvents] = useState<Event[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/brackets/new')
    } else if (authStatus === 'authenticated' && session?.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [authStatus, session, router])

  // Fetch events on mount
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/admin/events')
        const data = await res.json()
        setEvents(data.events || [])
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Failed to load events')
      } finally {
        setIsLoadingEvents(false)
      }
    }

    if (authStatus === 'authenticated') {
      fetchEvents()
    }
  }, [authStatus])

  // Fetch teams when event is selected
  const fetchTeams = useCallback(async (eventId: string) => {
    setIsLoadingTeams(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/teams`)
      const data = await res.json()
      setTeams(data.teams || [])
    } catch (err) {
      console.error('Error fetching teams:', err)
      setError('Failed to load teams')
    } finally {
      setIsLoadingTeams(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      fetchTeams(selectedEvent.id)
    }
  }, [selectedEvent, fetchTeams])

  // Update ordered teams when selected teams change
  useEffect(() => {
    setOrderedTeams(selectedTeams)
  }, [selectedTeams])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setOrderedTeams((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const toggleTeamSelection = (team: Team) => {
    setSelectedTeams((prev) => {
      const isSelected = prev.some((t) => t.id === team.id)
      if (isSelected) {
        return prev.filter((t) => t.id !== team.id)
      } else {
        return [...prev, team]
      }
    })
  }

  const selectAllTeams = () => {
    setSelectedTeams(teams)
  }

  const clearSelection = () => {
    setSelectedTeams([])
  }

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'event':
        return !!selectedEvent
      case 'type':
        return !!bracketType
      case 'teams':
        return selectedTeams.length >= 2
      case 'configure':
        return bracketName.trim().length > 0
      default:
        return false
    }
  }

  const goToNextStep = () => {
    const currentIndex = STEPS.findIndex((s) => s.key === currentStep)
    if (currentIndex < STEPS.length - 1) {
      setCompletedSteps((prev) => new Set(prev).add(currentStep))
      setCurrentStep(STEPS[currentIndex + 1].key)
    }
  }

  const goToPreviousStep = () => {
    const currentIndex = STEPS.findIndex((s) => s.key === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].key)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError('')

    try {
      const res = await fetch('/api/admin/brackets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent!.id,
          type: bracketType,
          name: bracketName,
          teams: orderedTeams.map((t) => t.id),
          settings: {
            poolCode: poolCode || undefined,
            seeds: bracketType === 'BRACKET' ? orderedTeams.map((t) => t.id) : undefined,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate bracket')
      }

      // Success! Redirect to brackets page
      router.push('/admin/brackets')
    } catch (err: any) {
      setError(err.message)
      setIsGenerating(false)
    }
  }

  if (authStatus === 'loading' || isLoadingEvents) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/brackets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Bracket / Pool</h1>
          <p className="text-sm text-gray-500">
            Generate tournament matchups automatically
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = step.key === currentStep
            const isCompleted = completedSteps.has(step.key)
            const isPast = STEPS.findIndex((s) => s.key === currentStep) > index

            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive
                        ? 'bg-eha-red text-white'
                        : isCompleted || isPast
                        ? 'bg-green-600 text-white'
                        : 'bg-dark-surface text-gray-500 border border-eha-silver/20'
                    }`}
                  >
                    {isCompleted || isPast ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-2 ${
                      isPast ? 'bg-green-600' : 'bg-eha-silver/20'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            &times;
          </button>
        </div>
      )}

      {/* Step Content */}
      <Card className="p-6">
        {/* Step 1: Select Event */}
        {currentStep === 'event' && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-eha-red" />
              Select Event
            </h2>
            <p className="text-gray-400 mb-6">
              Choose the tournament or event for this bracket.
            </p>

            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No active events found</p>
                  <Link href="/admin/events/new">
                    <Button variant="outline" className="mt-4">
                      Create Event
                    </Button>
                  </Link>
                </div>
              ) : (
                events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      selectedEvent?.id === event.id
                        ? 'border-eha-red bg-eha-red/10'
                        : 'border-eha-silver/20 bg-dark-surface hover:border-eha-silver/40'
                    }`}
                  >
                    <p className="font-medium text-white">{event.name}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Type */}
        {currentStep === 'type' && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-eha-red" />
              Select Type
            </h2>
            <p className="text-gray-400 mb-6">
              Choose how teams will compete against each other.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => setBracketType('POOL')}
                className={`p-6 rounded-lg border text-left transition-all ${
                  bracketType === 'POOL'
                    ? 'border-eha-red bg-eha-red/10'
                    : 'border-eha-silver/20 bg-dark-surface hover:border-eha-silver/40'
                }`}
              >
                <LayoutGrid className="w-10 h-10 text-blue-400 mb-3" />
                <h3 className="font-semibold text-white mb-1">Round Robin Pool</h3>
                <p className="text-sm text-gray-400">
                  Every team plays every other team once. Great for group stages.
                </p>
              </button>

              <button
                onClick={() => setBracketType('BRACKET')}
                className={`p-6 rounded-lg border text-left transition-all ${
                  bracketType === 'BRACKET'
                    ? 'border-eha-red bg-eha-red/10'
                    : 'border-eha-silver/20 bg-dark-surface hover:border-eha-silver/40'
                }`}
              >
                <GitBranch className="w-10 h-10 text-green-400 mb-3" />
                <h3 className="font-semibold text-white mb-1">
                  Single Elimination Bracket
                </h3>
                <p className="text-sm text-gray-400">
                  Win or go home. Classic tournament bracket format.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Teams */}
        {currentStep === 'teams' && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-eha-red" />
              Select Teams
            </h2>
            <p className="text-gray-400 mb-4">
              Choose which teams will participate in this{' '}
              {bracketType === 'POOL' ? 'pool' : 'bracket'}.
            </p>

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">
                {selectedTeams.length} of {teams.length} teams selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllTeams}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>

            {isLoadingTeams ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No teams registered for this event</p>
                <Link href="/admin/teams">
                  <Button variant="outline" className="mt-4">
                    Manage Teams
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {teams.map((team) => {
                  const isSelected = selectedTeams.some((t) => t.id === team.id)
                  return (
                    <button
                      key={team.id}
                      onClick={() => toggleTeamSelection(team)}
                      className={`w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-eha-red bg-eha-red/10'
                          : 'border-eha-silver/20 bg-dark-surface hover:border-eha-silver/40'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-eha-red border-eha-red'
                            : 'border-gray-500'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{team.name}</p>
                        {team.program?.name && (
                          <p className="text-xs text-gray-500">
                            {team.program?.name}
                          </p>
                        )}
                      </div>
                      {(team.ageGroup || team.division) && (
                        <div className="flex gap-1">
                          {team.ageGroup && (
                            <Badge size="sm">{team.ageGroup}</Badge>
                          )}
                          {team.division && (
                            <Badge size="sm">{team.division}</Badge>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Configure */}
        {currentStep === 'configure' && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Configure {bracketType === 'POOL' ? 'Pool' : 'Bracket'}
            </h2>

            <div className="space-y-6">
              <Input
                label={bracketType === 'POOL' ? 'Pool Name' : 'Bracket Name'}
                placeholder={
                  bracketType === 'POOL'
                    ? 'e.g., 17U Gold Pool A'
                    : 'e.g., 17U Gold Championship'
                }
                value={bracketName}
                onChange={(e) => setBracketName(e.target.value)}
              />

              {bracketType === 'POOL' && (
                <Input
                  label="Pool Code (optional)"
                  placeholder="e.g., A, B, C"
                  value={poolCode}
                  onChange={(e) => setPoolCode(e.target.value.toUpperCase())}
                  helperText="Used to identify games in this pool"
                />
              )}

              {bracketType === 'BRACKET' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Seed Order (drag to reorder)
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                    #1 seed will play #{orderedTeams.length} seed, #2 plays #
                    {orderedTeams.length - 1}, etc.
                  </p>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={orderedTeams.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {orderedTeams.map((team, index) => (
                          <SortableTeamItem
                            key={team.id}
                            team={team}
                            index={index}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {bracketType === 'POOL' && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-300">
                    <strong>Round Robin:</strong> With {selectedTeams.length}{' '}
                    teams, this will generate{' '}
                    <strong>
                      {(selectedTeams.length * (selectedTeams.length - 1)) / 2}
                    </strong>{' '}
                    games. Each team plays {selectedTeams.length - 1} games.
                  </p>
                </div>
              )}

              {bracketType === 'BRACKET' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-300">
                    <strong>Single Elimination:</strong> With{' '}
                    {selectedTeams.length} teams, this will generate{' '}
                    <strong>{selectedTeams.length - 1}</strong> games total (
                    {Math.ceil(Math.log2(selectedTeams.length))} rounds).
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Generate */}
        {currentStep === 'generate' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-eha-red/20 rounded-full flex items-center justify-center mx-auto mb-6">
              {bracketType === 'POOL' ? (
                <LayoutGrid className="w-10 h-10 text-eha-red" />
              ) : (
                <GitBranch className="w-10 h-10 text-eha-red" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Ready to Generate</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Click the button below to create all matchups. Games will appear in
              the Scheduling Grid.
            </p>

            <div className="bg-dark-surface rounded-lg p-6 max-w-md mx-auto mb-6 text-left">
              <h3 className="font-medium text-white mb-3">Summary</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Event</dt>
                  <dd className="text-white">{selectedEvent?.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Type</dt>
                  <dd className="text-white">
                    {bracketType === 'POOL' ? 'Round Robin Pool' : 'Single Elimination'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name</dt>
                  <dd className="text-white">{bracketName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Teams</dt>
                  <dd className="text-white">{selectedTeams.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Games to Create</dt>
                  <dd className="text-white font-semibold">
                    {bracketType === 'POOL'
                      ? (selectedTeams.length * (selectedTeams.length - 1)) / 2
                      : selectedTeams.length - 1}
                  </dd>
                </div>
              </dl>
            </div>

            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-8"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Matchups
                  <Check className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      {currentStep !== 'generate' && (
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStep === 'event'}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button onClick={goToNextStep} disabled={!canProceed()}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {currentStep === 'generate' && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={goToPreviousStep}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Configure
          </Button>
        </div>
      )}
    </div>
  )
}

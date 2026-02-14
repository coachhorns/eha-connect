'use client'

import { useState } from 'react'
import { UserPlus, Mail, Send, Loader2, CheckCircle, Copy } from 'lucide-react'
import { Modal, Button, Input, Select } from '@/components/ui'

interface Player {
  id: string
  firstName: string
  lastName: string
  slug: string
  guardianRole: 'PRIMARY' | 'SECONDARY' | 'SELF'
}

interface InviteCoParentModalProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
  onInviteSent?: () => void
}

export default function InviteCoParentModal({
  isOpen,
  onClose,
  players,
  onInviteSent,
}: InviteCoParentModalProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{
    message: string
    inviteUrl?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Only show players where user is PRIMARY guardian
  const eligiblePlayers = players.filter((p) => p.guardianRole === 'PRIMARY')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPlayerId) {
      setError('Please select a player')
      return
    }

    if (!email.trim()) {
      setError('Please enter an email address')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/guardians/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          email: email.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess({
          message: data.message,
          inviteUrl: data.invite?.inviteUrl,
        })
        onInviteSent?.()
      } else {
        setError(data.error || 'Failed to send invite')
      }
    } catch (err) {
      setError('Failed to send invite')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyLink = async () => {
    if (success?.inviteUrl) {
      await navigator.clipboard.writeText(success.inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setSelectedPlayerId('')
    setEmail('')
    setError('')
    setSuccess(null)
    setCopied(false)
    onClose()
  }

  const playerOptions = eligiblePlayers.map((p) => ({
    value: p.id,
    label: `${p.firstName} ${p.lastName}`,
  }))

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite Co-Parent">
      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-eha-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-eha-red" />
            </div>
            <p className="text-text-muted text-sm">
              Invite another parent or guardian to access your child's profile
            </p>
          </div>

          {eligiblePlayers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-text-muted">
                You need to be a primary guardian to send invites.
              </p>
            </div>
          ) : (
            <>
              <Select
                label="Select Player"
                options={[
                  { value: '', label: 'Choose a player...' },
                  ...playerOptions,
                ]}
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
              />

              <div>
                <Input
                  label="Co-Parent Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter their email address"
                  icon={<Mail className="w-4 h-4" />}
                />
                <p className="mt-1 text-xs text-text-muted">
                  They will receive an email with a link to accept the invitation
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-surface-raised">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedPlayerId || !email.trim()}
                  isLoading={isSubmitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>
            </>
          )}
        </form>
      ) : (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">Invite Sent!</h3>
          <p className="text-text-muted text-sm mb-6">{success.message}</p>

          {success.inviteUrl && (
            <div className="bg-surface-raised/30 rounded-lg p-4 mb-6">
              <p className="text-xs text-text-muted mb-2">
                Or share this link directly:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-black/20 p-2 rounded text-text-secondary truncate">
                  {success.inviteUrl}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <Button onClick={handleClose}>Done</Button>
        </div>
      )}
    </Modal>
  )
}

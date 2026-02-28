'use client'

import { useState } from 'react'
import { Send, Mail, MapPin, CheckCircle } from 'lucide-react'
import { Button, Select } from '@/components/ui'

const subjectOptions = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'billing', label: 'Billing & Subscriptions' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'recruiting', label: 'Recruiting Questions' },
  { value: 'events', label: 'Event Information' },
  { value: 'privacy', label: 'Privacy / Data Request' },
]

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (honeypot) return

    if (!name.trim() || !email.trim() || !subject || !message.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    if (message.trim().length < 10) {
      setError('Please provide a more detailed message (at least 10 characters).')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, _hp: honeypot }),
      })

      const data = await res.json()

      if (res.ok) {
        setIsSuccess(true)
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setName('')
    setEmail('')
    setSubject('')
    setMessage('')
    setError('')
    setIsSuccess(false)
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E31837] blur-[150px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500 blur-[120px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 pt-32 pb-16">
        {/* Header */}
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-text-primary mb-2 tracking-tight">
          Contact Us
        </h1>
        <p className="font-sans text-text-muted mb-12 text-lg">
          Have a question or need help? We&apos;d love to hear from you.
        </p>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-input-bg border border-border-subtle rounded-xl p-6">
              <h2 className="font-heading text-lg font-semibold text-text-primary mb-6">
                Get in Touch
              </h2>

              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#E31837] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-0.5">Email</p>
                    <a
                      href="mailto:support@ehacircuit.com"
                      className="text-sm text-text-muted hover:text-text-primary transition-colors"
                    >
                      support@ehacircuit.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#E31837] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-0.5">Location</p>
                    <p className="text-sm text-text-muted">Tustin, California</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border-subtle">
                <p className="text-sm font-medium text-text-secondary mb-3">Follow Us</p>
                <div className="flex items-center gap-4">
                  <a
                    href="https://twitter.com/ehacircuit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Twitter"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href="https://instagram.com/ehacircuit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Instagram"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border-subtle">
                <p className="text-xs text-text-muted leading-relaxed">
                  We typically respond within 24-48 hours. For privacy or data requests,
                  please select &quot;Privacy / Data Request&quot; as the subject.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-input-bg border border-border-subtle rounded-xl p-6 sm:p-8">
              {isSuccess ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="font-heading text-2xl font-bold text-text-primary mb-2">
                    Message Sent!
                  </h2>
                  <p className="text-text-muted mb-8">
                    Thank you for reaching out. We&apos;ll get back to you as soon as possible.
                  </p>
                  <Button variant="outline" onClick={handleReset}>
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="font-heading text-lg font-semibold text-text-primary mb-2">
                    Send Us a Message
                  </h2>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      {error}
                    </div>
                  )}

                  {/* Honeypot — hidden from humans */}
                  <div aria-hidden="true" className="absolute opacity-0 h-0 w-0 overflow-hidden">
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Smith"
                        required
                        className="w-full px-4 py-2.5 bg-page-bg-alt border border-input-border rounded-lg text-text-primary placeholder-text-muted text-sm transition-all duration-200 focus:outline-none focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full px-4 py-2.5 bg-page-bg-alt border border-input-border rounded-lg text-text-primary placeholder-text-muted text-sm transition-all duration-200 focus:outline-none focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/20"
                      />
                    </div>
                  </div>

                  <Select
                    label="Subject"
                    options={subjectOptions}
                    placeholder="Select a topic..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="bg-page-bg-alt"
                  />

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="How can we help you?"
                      required
                      rows={5}
                      className="w-full px-4 py-2.5 bg-page-bg-alt border border-input-border rounded-lg text-text-primary placeholder-text-muted text-sm transition-all duration-200 focus:outline-none focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/20 resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full py-3 font-bold uppercase tracking-widest"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

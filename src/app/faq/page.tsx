'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
  id: string
  question: string
  answer: string
}

interface FAQCategory {
  title: string
  items: FAQItem[]
}

const faqData: FAQCategory[] = [
  {
    title: 'Getting Started',
    items: [
      {
        id: 'what-is-eha',
        question: 'What is EHA Connect?',
        answer:
          'EHA Connect is the official player profile, stats tracking, and college recruiting platform for Elite Hoops Association events. It provides athletes with a verified digital profile, live game statistics, leaderboard rankings, and direct access to over 10,000 college coaches across all divisions.',
      },
      {
        id: 'create-account',
        question: 'How do I create an account?',
        answer:
          'Visit ehaconnect.com and click "Sign Up." You can register with your email address or sign in with Google. Parents and guardians create accounts on behalf of their children. After signing up, you can add your player\'s profile from the dashboard.',
      },
      {
        id: 'add-player',
        question: 'How do I add a player to my account?',
        answer:
          'Once signed in, go to your Dashboard and click "Add Player." Fill in your child\'s basic information including name, graduation year, position, and school. Their profile will be created immediately. You can add photos, a bio, and additional details at any time from the player edit page.',
      },
    ],
  },
  {
    title: 'Player Profiles & Stats',
    items: [
      {
        id: 'stats-tracking',
        question: 'How are stats tracked during events?',
        answer:
          'Official EHA scorekeepers are stationed at every court during events. They record points, rebounds, assists, steals, blocks, and shooting stats in real-time using our scoring system. Your stats automatically appear on your profile and the leaderboards.',
      },
      {
        id: 'multiple-teams',
        question: 'What if my child plays for multiple teams?',
        answer:
          'The Connect Pass follows the player, not the team. All stats from every EHA event are tracked on one profile regardless of which team they play for.',
      },
      {
        id: 'stat-error',
        question: 'What if there is an error in my player\'s stats?',
        answer:
          'If you notice a stat discrepancy, please contact us through our Contact page or email support@ehacircuit.com with the game details including the event name, date, teams, and the specific stat in question. Our team will review the game log and make corrections if needed.',
      },
      {
        id: 'profile-visibility',
        question: 'Who can see my player\'s profile?',
        answer:
          'Basic profile information such as name, position, graduation year, school, and team is visible on the public player directory. Detailed statistics and game logs require either a Connect Pass subscription, being a guardian on the player\'s account, or being a program director with the player on their roster.',
      },
    ],
  },
  {
    title: 'College Recruiting',
    items: [
      {
        id: 'recruiting-tool',
        question: 'How does the college recruiting tool work?',
        answer:
          'Your Connect Pass gives you access to a database of 10,000+ college coaches across NCAA Division I, II, III, NAIA, and JUCO programs. You can search by school, state, or conference and email coaches directly from the platform with your profile link included. When a coach replies, the response goes straight to the email on your player profile.',
      },
      {
        id: 'recruiting-tips',
        question: 'Do you have any tips for recruiting emails?',
        answer:
          'Keep your email brief and professional. Include your graduation year, position, height, GPA, and a link to your EHA Connect profile. Personalize each email by mentioning the specific school and program. Coaches receive many emails, so be concise, highlight what makes you stand out, and always follow up within a few weeks if you do not hear back.',
      },
    ],
  },
  {
    title: 'Subscriptions & Billing',
    items: [
      {
        id: 'whats-included',
        question: "What's included with the Connect Pass?",
        answer:
          'You get a full player profile with photos and bio, live stats tracked by official scorekeepers at every EHA event, leaderboard rankings, a shareable profile URL for recruiting, and direct email access to over 10,000 college coaches across all divisions.',
      },
      {
        id: 'family-discounts',
        question: 'Do you offer family discounts?',
        answer:
          'Yes! If you have multiple children playing in EHA events, additional players on your account are discounted. Contact us for details on family pricing.',
      },
      {
        id: 'cancel-anytime',
        question: 'Can I cancel anytime?',
        answer:
          'Absolutely. You can cancel your subscription from your account dashboard at any time. Your access continues through the end of your current billing period.',
      },
      {
        id: 'refund-policy',
        question: 'What is your refund policy?',
        answer:
          'All subscription fees are final and non-refundable. When you cancel, your access continues through the end of your current billing period but no partial refunds are issued. For full details, please review our Terms of Service.',
      },
    ],
  },
  {
    title: 'Events',
    items: [
      {
        id: 'team-registration',
        question: 'How do I register my team for an event?',
        answer:
          'Program directors can register their teams through the Director Portal. Log in, navigate to an event, and follow the registration workflow. If you are a parent looking to register an individual player, please contact your program director or reach out to us for guidance.',
      },
      {
        id: 'schedules-results',
        question: 'Where can I find game schedules and results?',
        answer:
          'Visit the Events page to see upcoming events. Once an event is underway, schedules, scores, standings, and brackets are all available on the event detail page. You can also check the Results and Standings pages from the main navigation.',
      },
    ],
  },
  {
    title: 'Account & Privacy',
    items: [
      {
        id: 'data-deletion',
        question: "How do I request deletion of my child's data?",
        answer:
          'Parents or guardians may request data deletion at any time by emailing support@ehacircuit.com or using our Contact page. Select "Privacy / Data Request" as the subject. Deletion requests are processed within 30 days. For complete details, see our Privacy Policy.',
      },
      {
        id: 'mobile-app',
        question: 'Is there a mobile app?',
        answer:
          'Yes! EHA Connect is available as a mobile app for both iOS and Android. You can access your player dashboard, view stats, check event schedules, and send recruiting emails all from your phone. Download it from the App Store or Google Play.',
      },
      {
        id: 'reset-password',
        question: 'How do I reset my password?',
        answer:
          'On the sign-in page, click "Forgot Password" and enter the email address associated with your account. You will receive an email with a link to reset your password. The link expires after 1 hour. If you signed up with Google, you will need to reset your password through Google\'s account settings instead.',
      },
    ],
  },
]

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E31837] blur-[150px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500 blur-[120px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 pt-32 pb-16">
        {/* Header */}
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-text-primary mb-2 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="font-sans text-text-muted mb-12 text-lg">
          Find answers to common questions about EHA Connect.
        </p>

        {/* FAQ Categories */}
        <div className="space-y-10">
          {faqData.map((category) => (
            <div key={category.title}>
              <h2 className="font-heading text-lg font-semibold text-text-primary mb-4 tracking-tight">
                {category.title}
              </h2>

              <div className="space-y-3">
                {category.items.map((item) => {
                  const isOpen = openItems.has(item.id)
                  return (
                    <div
                      key={item.id}
                      className="bg-input-bg border border-border-subtle rounded-xl overflow-hidden transition-colors hover:border-border-default"
                    >
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full flex items-center justify-between p-5 sm:p-6 text-left cursor-pointer"
                      >
                        <h3 className="font-heading font-semibold text-text-primary pr-4 text-sm sm:text-base">
                          {item.question}
                        </h3>
                        <ChevronDown
                          className={`w-5 h-5 text-text-muted flex-shrink-0 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-1">
                          <p className="text-text-muted text-sm leading-relaxed font-sans">
                            {item.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-input-bg border border-border-subtle rounded-xl p-8 sm:p-10">
          <h2 className="font-heading text-xl font-bold text-text-primary mb-3">
            Still Have Questions?
          </h2>
          <p className="text-text-muted mb-6 text-sm">
            Can&apos;t find what you&apos;re looking for? Our team is here to help.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#E31837] to-[#a01128] hover:from-[#ff1f3d] hover:to-[#c01530] text-white font-bold uppercase tracking-widest text-sm rounded-lg transition-all duration-300 shadow-lg shadow-[#E31837]/25 hover:shadow-xl hover:shadow-[#E31837]/40 hover:-translate-y-0.5"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}

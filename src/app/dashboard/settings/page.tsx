'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { User, Mail, Shield, Settings as SettingsIcon } from 'lucide-react'
import { Card, Button, Avatar, Badge } from '@/components/ui'

export default function SettingsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin?callbackUrl=/dashboard/settings')
        }
    }, [status, router])

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!session) {
        return null
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Account Settings</h1>
                <p className="mt-2 text-gray-400">Manage your profile and account preferences</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <Card className="md:col-span-2 p-6 space-y-6">
                    <div className="flex items-center gap-6 pb-6 border-b border-white/10">
                        <Avatar
                            src={session.user.image}
                            fallback={session.user.name?.[0] || 'U'}
                            size="lg"
                            className="w-24 h-24 text-3xl"
                        />
                        <div>
                            <h2 className="text-xl font-bold text-white">{session.user.name}</h2>
                            <p className="text-gray-400">{session.user.email}</p>
                            <div className="mt-2">
                                <Badge variant={session.user.role === 'ADMIN' ? 'default' : 'default'}>
                                    {session.user.role}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Personal Information</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Full Name
                                </label>
                                <div className="p-3 rounded-lg bg-dark-surface border border-white/10 text-white">
                                    {session.user.name}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email Address
                                </label>
                                <div className="p-3 rounded-lg bg-dark-surface border border-white/10 text-white">
                                    {session.user.email}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Account Role
                                </label>
                                <div className="p-3 rounded-lg bg-dark-surface border border-white/10 text-white">
                                    {session.user.role}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Quick Actions */}
                <div className="space-y-6">
                    {session.user.role === 'ADMIN' && (
                        <Card className="p-6 border-eha-red/30">
                            <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-4">Admin Area</h3>
                            <p className="text-sm text-gray-400 mb-4">
                                Access system-wide settings, payments, and configurations.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full border-eha-red text-eha-red hover:bg-eha-red hover:text-white"
                                onClick={() => router.push('/admin/settings/payments')}
                            >
                                <SettingsIcon className="w-4 h-4 mr-2" />
                                System Settings
                            </Button>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}

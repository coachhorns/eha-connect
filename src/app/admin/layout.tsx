'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        // Wait for session to load
        if (status === 'loading') return

        // Redirect if unauthenticated
        if (status === 'unauthenticated') {
            router.push('/auth/signin?callbackUrl=/admin')
        }
        // Redirect if not admin
        else if (session?.user.role !== 'ADMIN') {
            router.push('/')
        }
    }, [status, session, router])

    // Show loading spinner while checking auth
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
            </div>
        )
    }

    // Prevent rendering if not authorized (will redirect via effect)
    if (status === 'unauthenticated' || session?.user.role !== 'ADMIN') {
        return null
    }

    return <>{children}</>
}

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Login from '../components/Login'
import Dashboard from '../components/Dashboard'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated' && session) {
      if (session.user.role === 'zone_manager' && session.user.assignedZone) {
        // Redirect zone manager to their assigned zone page
        router.push(`/zones/${session.user.assignedZone}`)
      }
      // CEO and users stay on dashboard or main UI page
    }
  }, [status, session, router])

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return <Login />
  }

  // For CEO and user roles, render the dashboard main UI
  return <Dashboard />
}

"use client"

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

export default function DirectorInjectsAliasPage() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const t = localStorage.getItem('token')
    if (!t) {
      router.replace('/login')
      return
    }
    const u = getStoredUser()
    if (u && !isRoleAllowedForPath(u.role, pathname)) {
      router.replace(getDefaultRouteForRole(u.role))
      return
    }
    router.replace('/injects')
  }, [router, pathname])

  return (
    <main style={{ padding: 16 }}>
      <div style={{ opacity: 0.8 }}>Redirecting...</div>
    </main>
  )
}

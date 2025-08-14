'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const login = (email: string, password: string) => signIn('credentials', { email, password })
  const logout = () => signOut()

  const requireAuth = (callback?: () => void) => {
    useEffect(() => {
      if (status === 'loading') return
      
      if (!session) {
        router.push('/auth/signin')
        return
      }
      
      if (callback) callback()
    }, [session, status, router, callback])
  }

  return {
    user: session?.user,
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    login,
    logout,
    requireAuth,
  }
}

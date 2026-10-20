import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, clearTokens, get, getAccessToken, post, put, setTokens } from './api'
import { AuthContext } from './authContext'
import type { AuthContextValue } from './authContext'
import type { AuthResponse, User } from './types'

/** The props the provider takes. */
interface AuthProviderProps {
  children: ReactNode
}

/**
 * The provider that holds the signed-in user.
 *
 * The tokens live in local storage and the user lives in the context, so a
 * page refresh does not sign the candidate out and does not need a round
 * trip before the interface is usable.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const current = await get<User>('/api/v1/auth/me')
      setUser(current)
    } catch (error) {
      // A token that the server will not accept is not worth keeping.
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearTokens()
      }
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const applyAuth = useCallback(
    (response: AuthResponse) => {
      setTokens(response.accessToken, response.refreshToken)
      setUser(response.user)
      setIsLoading(false)
      // The old cached data belongs to whoever was signed in before.
      queryClient.clear()
    },
    [queryClient],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await post<AuthResponse>('/api/v1/auth/login', { email, password })
      applyAuth(response)
    },
    [applyAuth],
  )

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const response = await post<AuthResponse>('/api/v1/auth/register', {
        email,
        password,
        displayName,
      })
      applyAuth(response)
    },
    [applyAuth],
  )

  const signOut = useCallback(async () => {
    try {
      await post('/api/v1/auth/logout')
    } catch {
      // A failed logout still means the local session is over.
    }
    clearTokens()
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  const updateProfile = useCallback(async (patch: Partial<User>) => {
    const updated = await put<User>('/api/v1/auth/me', patch)
    setUser(updated)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      isAdmin: user?.role === 'ADMIN',
      signIn,
      signUp,
      signOut,
      refreshUser,
      updateProfile,
    }),
    [user, isLoading, signIn, signUp, signOut, refreshUser, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

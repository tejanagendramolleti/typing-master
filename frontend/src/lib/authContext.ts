import { createContext } from 'react'
import type { User } from './types'

/**
 * The signed-in user.
 *
 * The context holds the user, the tokens live in local storage, and the
 * context asks the server who the token belongs to on start-up. The server
 * is the only authority on whether a token is still valid.
 */
export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string, displayName: string): Promise<void>
  signOut(): Promise<void>
  refreshUser(): Promise<void>
  updateProfile(patch: Partial<User>): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

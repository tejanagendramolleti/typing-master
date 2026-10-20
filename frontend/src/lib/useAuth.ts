import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './authContext'

/**
 * The signed-in user and the actions that change it.
 *
 * @throws when used outside the provider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}

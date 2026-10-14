import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { auth } from '@/lib/firebase/config'
import { subscribeUser } from '@/services/users.service'
import type { AppUser } from '@/types'

interface AuthContextValue {
  firebaseUser: User | null
  profile: AppUser | null
  loading: boolean
  profileError: string | null
  authError: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    let profileUnsub: (() => void) | undefined
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      profileUnsub?.()
      setFirebaseUser(user)
      if (!user) {
        setProfile(null)
        setProfileError(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setProfileError(null)
      profileUnsub = subscribeUser(
        user.uid,
        (data) => {
          setProfile(data)
          setProfileError(data ? null : 'No user profile in Firestore for this account.')
          setLoading(false)
        },
        (err) => {
          setProfile(null)
          setProfileError(err.message || 'Could not load your profile from Firestore.')
          setLoading(false)
        },
      )
    })
    return () => {
      unsubAuth()
      profileUnsub?.()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setAuthError(message)
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
    setProfile(null)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }, [])

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      profileError,
      authError,
      login,
      logout,
      resetPassword,
    }),
    [firebaseUser, profile, loading, profileError, authError, login, logout, resetPassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

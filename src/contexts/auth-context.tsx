"use client"

import * as React from "react"
import { API_BASE_URL } from "@/lib/api-config"
import { setAccessToken as setApiClientToken } from "@/lib/api-client"
import { toast } from "sonner"
import {
  getTokenExpirationTime,
  getTokenTimeUntilExpiration,
  getTokenLifetime,
  isTokenExpired,
  formatTimeUntilExpiration,
} from "@/lib/jwt-utils"

export interface User {
  id: number
  email: string
  role: "ADMIN" | "CSR"
  is_active: boolean
  permissions: PermissionMap | null
  created_at: string
  updated_at: string
}

export interface PermissionMap {
  "orders.read"?: boolean
  "orders.update_status"?: boolean
  "orders.set_paid"?: boolean
  "invoices.send_final"?: boolean
  "employees.manage"?: boolean
  "invites.create"?: boolean
  [key: string]: boolean | undefined
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
  hasPermission: (permission: string) => boolean
  refreshToken: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

const ACCESS_TOKEN_KEY = "kabin247_access_token"
const USER_KEY = "kabin247_user"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [accessToken, setAccessToken] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  // Listen for refresh failures from API client
  React.useEffect(() => {
    const handleRefreshFailed = () => {
      // Show user-friendly error message
      toast.error("Session Expired", {
        description: "Your session has expired. Please log in again to continue.",
        duration: 5000,
      })
      
      // Clear auth state when refresh fails
      setAccessToken(null)
      setUser(null)
      setApiClientToken(null)
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("auth:refresh-failed", handleRefreshFailed)
      return () => {
        window.removeEventListener("auth:refresh-failed", handleRefreshFailed)
      }
    }
  }, [])

  const refreshAccessToken = React.useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth-context.tsx:75',message:'Token refresh attempt started',data:{hasCurrentToken:!!accessToken,currentTokenLength:accessToken?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    try {
      // Log cookie availability for debugging before attempting refresh
      if (typeof window !== "undefined") {
        const availableCookies: Record<string, string> = {}
        document.cookie.split(";").forEach((cookie) => {
          const [name, value] = cookie.trim().split("=")
          if (name && value) {
            availableCookies[name] = value
          }
        })
        console.log("[Auth Context] Attempting token refresh...", {
          visibleCookies: Object.keys(availableCookies).length,
          cookieNames: Object.keys(availableCookies),
          note: "HttpOnly refresh token cookie may not be visible in document.cookie",
        })
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth-context.tsx:90',message:'Cookie status before refresh',data:{visibleCookies:Object.keys(availableCookies).length,cookieNames:Object.keys(availableCookies)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      })
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth-context.tsx:100',message:'Token refresh response received',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (response.ok) {
        const data = await response.json()
        const newToken = data.accessToken
        const oldToken = accessToken
        
        // Log old token info if available
        if (oldToken) {
          const oldExpTime = getTokenExpirationTime(oldToken)
          const oldTimeUntilExp = getTokenTimeUntilExpiration(oldToken)
          const oldLifetime = getTokenLifetime(oldToken)
          if (oldExpTime && oldTimeUntilExp !== null && oldLifetime !== null) {
            console.log("[Auth Context] Old token info:", {
              expirationTime: new Date(oldExpTime).toISOString(),
              timeUntilExpiration: formatTimeUntilExpiration(oldTimeUntilExp),
              lifetime: `${Math.round(oldLifetime / 60)}m ${oldLifetime % 60}s`,
            })
          }
        }
        
        setAccessToken(newToken)
        setApiClientToken(newToken)
        localStorage.setItem(ACCESS_TOKEN_KEY, newToken)
        
        // Log new token info
        const newExpTime = getTokenExpirationTime(newToken)
        const newTimeUntilExp = getTokenTimeUntilExpiration(newToken)
        const newLifetime = getTokenLifetime(newToken)
        if (newExpTime && newTimeUntilExp !== null && newLifetime !== null) {
          console.log("[Auth Context] Token refresh successful - New token info:", {
            expirationTime: new Date(newExpTime).toISOString(),
            timeUntilExpiration: formatTimeUntilExpiration(newTimeUntilExp),
            lifetime: `${Math.round(newLifetime / 60)}m ${newLifetime % 60}s`,
            refreshReason: "proactive (before expiration)",
          })
        } else {
          console.log("[Auth Context] Token refresh successful (could not decode new token expiration)")
        }
        
        return newToken
      } else {
        // Try to get error details
        let errorMessage = "Token refresh failed"
        let errorDetails: any = null

        try {
          errorDetails = await response.json()
          errorMessage = errorDetails.error || errorMessage
        } catch {
          errorMessage = `Token refresh failed with status: ${response.status}`
        }

        // Check if error is due to missing refresh token cookie
        const isMissingCookieError =
          errorMessage.toLowerCase().includes("refresh token") ||
          errorMessage.toLowerCase().includes("cookie") ||
          response.status === 401

        if (isMissingCookieError) {
          console.warn("[Auth Context] Token refresh failed - refresh token cookie missing or invalid", {
            status: response.status,
            error: errorMessage,
            details: errorDetails,
            troubleshooting: [
              "Refresh token cookie was not sent or is invalid",
              "This usually indicates a CORS or cookie configuration issue",
              "User will need to re-login to get a new refresh token",
            ],
          })
        } else {
          console.warn("[Auth Context] Token refresh failed", {
            status: response.status,
            error: errorMessage,
            details: errorDetails,
          })
        }

        // Refresh failed, clear auth state
        // This will trigger the admin layout to redirect to login
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth-context.tsx:143',message:'Token refresh failed - clearing auth state',data:{status:response.status,errorMessage,isMissingCookieError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        setAccessToken(null)
        setUser(null)
        setApiClientToken(null)
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        throw new Error(errorMessage || "Token refresh failed")
      }
    } catch (error) {
      console.error("[Auth Context] Token refresh error (network or other)", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      setAccessToken(null)
      setUser(null)
      setApiClientToken(null)
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      throw error
    }
  }, [])

  // Initialize auth state from localStorage on mount
  React.useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY)
        const storedUser = localStorage.getItem(USER_KEY)

        if (storedToken && storedUser) {
          // Validate token expiration on initialization
          const expired = isTokenExpired(storedToken)
          const expTime = getTokenExpirationTime(storedToken)
          const timeUntilExp = getTokenTimeUntilExpiration(storedToken)
          const lifetime = getTokenLifetime(storedToken)
          const now = Date.now()
          
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth-context.tsx:228',message:'Initializing auth with stored token',data:{expTime,now,timeUntilExp,lifetime,lifetimeSeconds:lifetime,lifetimeMinutes:lifetime?Math.round(lifetime/60):null,expired,expTimeISO:expTime?new Date(expTime).toISOString():null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          if (expTime && timeUntilExp !== null && lifetime !== null) {
            console.log("[Auth Context] Initializing auth with stored token:", {
              expirationTime: new Date(expTime).toISOString(),
              timeUntilExpiration: formatTimeUntilExpiration(timeUntilExp),
              tokenLifetime: `${Math.round(lifetime / 60)}m ${lifetime % 60}s`,
              isExpired: expired,
            })
          }
          
          if (expired) {
            console.warn("[Auth Context] Stored token is expired, clearing auth state")
            
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth-context.tsx:242',message:'Clearing expired token on init',data:{expTime,now,timeUntilExp},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            localStorage.removeItem(ACCESS_TOKEN_KEY)
            localStorage.removeItem(USER_KEY)
            setAccessToken(null)
            setUser(null)
            setApiClientToken(null)
          } else {
            // Token is valid, use it
            const userData = JSON.parse(storedUser)
            setAccessToken(storedToken)
            setUser(userData)
            setApiClientToken(storedToken)
            
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth-context.tsx:252',message:'Using valid stored token',data:{tokenLength:storedToken?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [refreshAccessToken])

  const login = React.useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Login failed" }))
      throw new Error(errorData.error || "Invalid email or password")
    }

    const data = await response.json()
    console.log("[Auth Context] Login successful, storing token and user data")
    
    // Log token expiration information
    const expTime = getTokenExpirationTime(data.accessToken)
    const timeUntilExp = getTokenTimeUntilExpiration(data.accessToken)
    const lifetime = getTokenLifetime(data.accessToken)
    const now = Date.now()
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth-context.tsx:216',message:'Token received on login',data:{expTime,now,timeUntilExp,lifetime,lifetimeSeconds:lifetime,lifetimeMinutes:lifetime?Math.round(lifetime/60):null,expTimeISO:expTime?new Date(expTime).toISOString():null,userId:data.user?.id,userEmail:data.user?.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (expTime && timeUntilExp !== null && lifetime !== null) {
      console.log("[Auth Context] Token received on login:", {
        expirationTime: new Date(expTime).toISOString(),
        timeUntilExpiration: formatTimeUntilExpiration(timeUntilExp),
        tokenLifetime: `${Math.round(lifetime / 60)}m ${lifetime % 60}s`,
        lifetimeInSeconds: lifetime,
        userId: data.user?.id,
        userEmail: data.user?.email,
      })
    } else {
      console.log("[Auth Context] Token stored (could not decode expiration):", {
        tokenLength: data.accessToken?.length,
        userId: data.user?.id,
        userEmail: data.user?.email,
      })
    }
    
    setAccessToken(data.accessToken)
    setUser(data.user)
    setApiClientToken(data.accessToken)
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth-context.tsx:240',message:'Storing token to localStorage',data:{tokenLength:data.accessToken?.length,hasToken:!!data.accessToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  }, [])

  const logout = React.useCallback(async () => {
    try {
      if (accessToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        })
      }
    } catch (error) {
      console.error("Error during logout:", error)
    } finally {
      setAccessToken(null)
      setUser(null)
      setApiClientToken(null)
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  }, [accessToken])

  const isAuthenticated = !!user && !!accessToken
  const isAdmin = user?.role === "ADMIN"

  const hasPermission = React.useCallback(
    (permission: string): boolean => {
      if (isAdmin) return true // Admin has all permissions
      if (!user?.permissions) return false
      return user.permissions[permission] === true
    },
    [isAdmin, user]
  )

  const value = React.useMemo(
    () => ({
      user,
      accessToken,
      isLoading,
      login,
      logout,
      isAuthenticated,
      isAdmin,
      hasPermission,
      refreshToken: refreshAccessToken,
    }),
    [user, accessToken, isLoading, login, logout, isAuthenticated, isAdmin, hasPermission, refreshAccessToken]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}


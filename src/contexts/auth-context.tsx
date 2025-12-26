"use client"

import * as React from "react"
import { API_BASE_URL } from "@/lib/api-config"
import { setAccessToken as setApiClientToken } from "@/lib/api-client"
import { toast } from "sonner"

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
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        const newToken = data.accessToken
        setAccessToken(newToken)
        setApiClientToken(newToken)
        localStorage.setItem(ACCESS_TOKEN_KEY, newToken)
        console.log("[Auth Context] Token refresh successful")
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
          // Use stored token without validation
          // Token validation will happen naturally when API calls are made
          // If token is invalid, the API client will handle refresh
          const userData = JSON.parse(storedUser)
          setAccessToken(storedToken)
          setUser(userData)
          setApiClientToken(storedToken)
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
    setAccessToken(data.accessToken)
    setUser(data.user)
    setApiClientToken(data.accessToken)
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    console.log("[Auth Context] Token stored:", {
      tokenLength: data.accessToken?.length,
      userId: data.user?.id,
      userEmail: data.user?.email,
    })
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


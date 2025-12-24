/**
 * API Client with automatic token refresh
 * Wraps fetch to automatically handle authentication and token refresh
 */

import { API_BASE_URL } from "./api-config"

let accessToken: string | null = null
let refreshTokenPromise: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

async function refreshToken(): Promise<string | null> {
  // If a refresh is already in progress, wait for it
  if (refreshTokenPromise) {
    return refreshTokenPromise
  }

  refreshTokenPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        const newToken = data.accessToken
        accessToken = newToken
        // Update localStorage if available
        if (typeof window !== "undefined") {
          localStorage.setItem("kabin247_access_token", newToken)
        }
        return newToken
      } else {
        // Refresh failed, clear token
        // Don't clear localStorage here - let the auth context handle it
        // This prevents clearing auth state when refresh fails due to network issues
        accessToken = null
        console.warn("[API Client] Token refresh failed with status:", response.status)
        return null
      }
    } catch (error) {
      console.error("[API Client] Token refresh error:", error)
      accessToken = null
      return null
    } finally {
      refreshTokenPromise = null
    }
  })()

  return refreshTokenPromise
}

export interface ApiCallOptions extends RequestInit {
  skipAuth?: boolean
  skipRefresh?: boolean
}

export async function apiCall(
  url: string,
  options: ApiCallOptions = {}
): Promise<Response> {
  const { skipAuth = false, skipRefresh = false, ...fetchOptions } = options

  // Always get the latest token from localStorage to ensure we have the current token
  // This handles cases where the token might have been updated in another tab or context
  let currentToken = accessToken
  if (typeof window !== "undefined" && !skipAuth) {
    const storedToken = localStorage.getItem("kabin247_access_token")
    if (storedToken) {
      currentToken = storedToken
      // Update in-memory token to keep it in sync
      if (accessToken !== storedToken) {
        accessToken = storedToken
      }
    }
  }

  // Build headers as a Record to allow property assignment
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers && typeof fetchOptions.headers === "object" && !Array.isArray(fetchOptions.headers)
      ? (fetchOptions.headers as Record<string, string>)
      : {}),
  }

  // Add authorization header if not skipping auth
  if (!skipAuth && currentToken) {
    headers.Authorization = `Bearer ${currentToken}`
  } else if (!skipAuth && !currentToken) {
    // Debug: log when token is missing
    console.warn("[API Client] No access token available for request:", url)
  }

  // Make the request
  let response = await fetch(`${API_BASE_URL}${url}`, {
    ...fetchOptions,
    headers,
    credentials: "include", // Always include credentials for refresh token cookie
  })

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && !skipAuth && !skipRefresh) {
    const newToken = await refreshToken()

      if (newToken) {
        // Retry original request with new token - rebuild headers
        const retryHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...(fetchOptions.headers && typeof fetchOptions.headers === "object" && !Array.isArray(fetchOptions.headers)
            ? (fetchOptions.headers as Record<string, string>)
            : {}),
          Authorization: `Bearer ${newToken}`,
        }
      response = await fetch(`${API_BASE_URL}${url}`, {
        ...fetchOptions,
        headers: retryHeaders,
        credentials: "include",
      })
    } else {
      // Refresh failed - notify auth context to clear state
      // Don't redirect here to prevent loops - let React components handle it
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:refresh-failed"))
      }
    }
  }

  return response
}

// Helper function to parse JSON response
export async function apiCallJson<T = any>(
  url: string,
  options: ApiCallOptions = {}
): Promise<T> {
  const response = await apiCall(url, options)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: `HTTP error! status: ${response.status}`,
    }))
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}


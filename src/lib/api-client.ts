/**
 * API Client with automatic token refresh
 * Wraps fetch to automatically handle authentication and token refresh
 */

import { API_BASE_URL } from "./api-config"
import {
  getTokenExpirationTime,
  getTokenTimeUntilExpiration,
  getTokenLifetime,
  isTokenExpired,
  formatTimeUntilExpiration,
} from "./jwt-utils"

let accessToken: string | null = null
let refreshTokenPromise: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

/**
 * Check if refresh token cookie exists in browser
 * Note: HttpOnly cookies cannot be read via JavaScript, so we check by attempting
 * to see if cookies are available. This is a best-effort check.
 */
function hasRefreshTokenCookie(): boolean {
  if (typeof document === "undefined") {
    return false
  }

  // HttpOnly cookies cannot be read via document.cookie
  // We can only verify that cookies are being sent by checking if credentials are available
  // This is a limitation - we'll rely on the backend response to confirm cookie presence
  return true // Assume cookie might exist if we're in browser context
}

/**
 * Get all available cookies (for debugging - HttpOnly cookies won't be visible)
 */
function getAvailableCookies(): Record<string, string> {
  if (typeof document === "undefined") {
    return {}
  }

  const cookies: Record<string, string> = {}
  document.cookie.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=")
    if (name && value) {
      cookies[name] = value
    }
  })
  return cookies
}

async function refreshToken(): Promise<string | null> {
  // If a refresh is already in progress, wait for it
  if (refreshTokenPromise) {
    console.log("[API Client] Refresh already in progress, waiting...")
    return refreshTokenPromise
  }

  refreshTokenPromise = (async () => {
    try {
      // Log cookie availability for debugging (HttpOnly cookies won't be visible)
      if (typeof window !== "undefined") {
        const availableCookies = getAvailableCookies()
        const cookieKeys = Object.keys(availableCookies)
        console.log("[API Client] Attempting token refresh...", {
          hasBrowserContext: true,
          visibleCookies: cookieKeys.length,
          cookieNames: cookieKeys,
          note: "HttpOnly refresh token cookie may not be visible in document.cookie",
        })
      } else {
        console.log("[API Client] Attempting token refresh (server-side, cookies handled by fetch)")
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        const newToken = data.accessToken
        const oldToken = accessToken
        
        // Log old token expiration info
        if (oldToken) {
          const oldExpTime = getTokenExpirationTime(oldToken)
          const oldTimeUntilExp = getTokenTimeUntilExpiration(oldToken)
          const oldLifetime = getTokenLifetime(oldToken)
          if (oldExpTime && oldTimeUntilExp !== null && oldLifetime !== null) {
            console.log("[API Client] Old token info:", {
              expirationTime: new Date(oldExpTime).toISOString(),
              timeUntilExpiration: formatTimeUntilExpiration(oldTimeUntilExp),
              lifetime: `${Math.round(oldLifetime / 60)}m ${oldLifetime % 60}s`,
            })
          }
        }
        
        accessToken = newToken
        // Update localStorage if available
        if (typeof window !== "undefined") {
          localStorage.setItem("kabin247_access_token", newToken)
        }
        
        // Log new token expiration info
        const newExpTime = getTokenExpirationTime(newToken)
        const newTimeUntilExp = getTokenTimeUntilExpiration(newToken)
        const newLifetime = getTokenLifetime(newToken)
        if (newExpTime && newTimeUntilExp !== null && newLifetime !== null) {
          console.log("[API Client] Token refresh successful - New token info:", {
            expirationTime: new Date(newExpTime).toISOString(),
            timeUntilExpiration: formatTimeUntilExpiration(newTimeUntilExp),
            lifetime: `${Math.round(newLifetime / 60)}m ${newLifetime % 60}s`,
            refreshReason: "reactive (401 error)",
          })
        } else {
          console.log("[API Client] Token refresh successful (could not decode new token expiration)")
        }
        
        return newToken
      } else {
        // Try to get error details from response
        let errorMessage = "Token refresh failed"
        let errorDetails: any = null

        try {
          errorDetails = await response.json()
          errorMessage = errorDetails.error || errorMessage
        } catch {
          // Response might not be JSON
          errorMessage = `Token refresh failed with status: ${response.status}`
        }

        // Check if the error is due to missing refresh token cookie
        const isMissingCookieError =
          errorMessage.toLowerCase().includes("refresh token") ||
          errorMessage.toLowerCase().includes("cookie") ||
          response.status === 401

        if (isMissingCookieError) {
          console.warn("[API Client] Token refresh failed - refresh token cookie missing or invalid", {
            status: response.status,
            error: errorMessage,
            details: errorDetails,
            troubleshooting: [
              "Check if cookies are being set during login",
              "Verify CORS configuration allows credentials",
              "Check cookie SameSite and Secure attributes",
              "Verify cookie domain/path matches frontend origin",
            ],
          })
        } else {
          console.warn("[API Client] Token refresh failed", {
            status: response.status,
            error: errorMessage,
            details: errorDetails,
          })
        }

        // Refresh failed, clear token
        // Don't clear localStorage here - let the auth context handle it
        // This prevents clearing auth state when refresh fails due to network issues
        accessToken = null
        return null
      }
    } catch (error) {
      console.error("[API Client] Token refresh error (network or other)", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
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

/**
 * Check if token should be refreshed proactively (expires in less than 2 minutes)
 */
export function shouldRefreshToken(token: string | null): boolean {
  if (!token) {
    return false
  }
  
  const timeUntilExp = getTokenTimeUntilExpiration(token)
  if (timeUntilExp === null) {
    return false // Can't determine, don't refresh proactively
  }
  
  // Refresh if token expires in less than 2 minutes (120 seconds)
  return timeUntilExp < 120000
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
  
  // Proactive token refresh: check if token should be refreshed before making request
  if (!skipAuth && !skipRefresh && currentToken && shouldRefreshToken(currentToken)) {
    const timeUntilExp = getTokenTimeUntilExpiration(currentToken)
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:231',message:'Proactive refresh before API request',data:{url,timeUntilExp,timeUntilExpSeconds:timeUntilExp?Math.floor(timeUntilExp/1000):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    console.log("[API Client] Token expires soon, refreshing proactively before request...")
    try {
      const newToken = await refreshToken()
      if (newToken) {
        currentToken = newToken
        // Update in-memory token and localStorage
        accessToken = newToken
        if (typeof window !== "undefined") {
          localStorage.setItem("kabin247_access_token", newToken)
        }
        console.log("[API Client] Proactive token refresh successful, proceeding with request")
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:245',message:'Proactive refresh successful',data:{url,newTokenLength:newToken?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
      } else {
        console.warn("[API Client] Proactive token refresh failed, proceeding with existing token")
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:250',message:'Proactive refresh failed',data:{url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
    } catch (error) {
      console.warn("[API Client] Proactive token refresh error, proceeding with existing token:", error)
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:255',message:'Proactive refresh error',data:{url,error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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
    
    // Log token expiration information
    const expTime = getTokenExpirationTime(currentToken)
    const timeUntilExp = getTokenTimeUntilExpiration(currentToken)
    const lifetime = getTokenLifetime(currentToken)
    const expired = isTokenExpired(currentToken)
    
    if (expTime && timeUntilExp !== null && lifetime !== null) {
      const expDate = new Date(expTime)
      const timeUntilExpFormatted = formatTimeUntilExpiration(timeUntilExp)
      const lifetimeFormatted = `${Math.round(lifetime / 60)}m ${lifetime % 60}s`
      
      console.log(`[API Client] Making request to ${url}`, {
        tokenPrefix: `${currentToken.substring(0, 20)}...`,
        expirationTime: expDate.toISOString(),
        timeUntilExpiration: timeUntilExpFormatted,
        tokenLifetime: lifetimeFormatted,
        isExpired: expired,
        expiresInSeconds: Math.round(timeUntilExp / 1000),
      })
      
      if (expired) {
        console.warn(`[API Client] Token is expired! Expired ${Math.abs(Math.round(timeUntilExp / 1000))} seconds ago`)
      } else if (timeUntilExp < 120000) {
        // Less than 2 minutes remaining
        console.warn(`[API Client] Token expires soon: ${timeUntilExpFormatted}`)
      }
    } else {
      console.log(`[API Client] Making request to ${url} with token: ${currentToken.substring(0, 20)}... (could not decode expiration)`)
    }
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
    // Only try to refresh if we had a token to begin with
    // If we never had a token, this is a genuine auth error
    const hadToken = !!currentToken
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:290',message:'401 Unauthorized received',data:{url,hadToken,currentTokenLength:currentToken?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (hadToken) {
      const tokenExpTime = currentToken ? getTokenExpirationTime(currentToken) : null
      const tokenTimeUntilExp = currentToken ? getTokenTimeUntilExpiration(currentToken) : null
      const tokenLifetime = currentToken ? getTokenLifetime(currentToken) : null
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:295',message:'Token info on 401 error',data:{url,tokenExpTime,tokenTimeUntilExp,tokenLifetime,tokenLifetimeSeconds:tokenLifetime,tokenLifetimeMinutes:tokenLifetime?Math.round(tokenLifetime/60):null,now:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      console.log("[API Client] Got 401 Unauthorized, attempting token refresh...", {
        url,
        hadToken: true,
        tokenPrefix: currentToken ? `${currentToken.substring(0, 20)}...` : "none",
      })
      
      // Log cookie availability before refresh attempt
      if (typeof window !== "undefined") {
        const availableCookies = getAvailableCookies()
        console.log("[API Client] Cookie status before refresh:", {
          visibleCookies: Object.keys(availableCookies).length,
          cookieNames: Object.keys(availableCookies),
          note: "HttpOnly refresh token cookie may not be visible",
        })
      }
      
      const newToken = await refreshToken()

      if (newToken) {
        console.log("[API Client] Token refreshed successfully, retrying original request", {
          url,
          newTokenPrefix: `${newToken.substring(0, 20)}...`,
        })
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
        
        if (response.ok) {
          console.log("[API Client] Retry request successful after token refresh")
        } else {
          console.warn("[API Client] Retry request failed after token refresh", {
            status: response.status,
            url,
          })
        }
      } else {
        // Refresh failed - notify auth context to clear state
        // Don't redirect here to prevent loops - let React components handle it
        console.warn("[API Client] Token refresh failed, clearing auth state and notifying auth context", {
          url,
          reason: "Refresh token cookie likely missing or invalid",
          action: "User will need to re-login",
        })
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:refresh-failed"))
        }
      }
    } else {
      console.warn("[API Client] Got 401 but no token was available to refresh", {
        url,
        reason: "No access token in memory or localStorage",
      })
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
    
    // Provide more user-friendly error messages for common auth errors
    let errorMessage = errorData.error || `HTTP error! status: ${response.status}`
    
    if (response.status === 401) {
      // If we get 401 and refresh already failed, provide clearer message
      if (errorData.error?.toLowerCase().includes("refresh token") || 
          errorData.error?.toLowerCase().includes("invalid or expired token")) {
        errorMessage = "Your session has expired. Please log in again."
      }
    }
    
    throw new Error(errorMessage)
  }

  return response.json()
}


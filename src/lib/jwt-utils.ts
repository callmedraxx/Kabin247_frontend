/**
 * JWT Token Utilities
 * Decode JWT tokens without verification (client-side only)
 * This is safe because we're only reading the payload, not verifying the signature
 */

export interface JWTPayload {
  exp?: number  // Expiration timestamp (Unix epoch in seconds)
  iat?: number  // Issued at timestamp
  [key: string]: any
}

/**
 * Decode JWT token without verification
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jwt-utils.ts:19',message:'JWT decode failed - invalid format',data:{partsLength:parts.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return null
    }
    
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const parsed = JSON.parse(decoded)
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jwt-utils.ts:28',message:'JWT decoded successfully',data:{exp:parsed.exp,iat:parsed.iat,expUnix:parsed.exp,iatUnix:parsed.iat,currentTimeUnix:Math.floor(Date.now()/1000),lifetimeSeconds:parsed.exp&&parsed.iat?parsed.exp-parsed.iat:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    return parsed
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jwt-utils.ts:32',message:'JWT decode error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('[JWT Utils] Failed to decode token:', error)
    return null
  }
}

/**
 * Get token expiration time in milliseconds (Unix timestamp)
 */
export function getTokenExpirationTime(token: string): number | null {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) {
    return null
  }
  
  // exp is in seconds, convert to milliseconds
  return payload.exp * 1000
}

/**
 * Check if token is expired (with 5 second buffer for clock skew)
 */
export function isTokenExpired(token: string): boolean {
  const expTime = getTokenExpirationTime(token)
  const now = Date.now()
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jwt-utils.ts:48',message:'Checking token expiration',data:{expTime,now,timeUntilExp:expTime?expTime-now:null,timeUntilExpSeconds:expTime?Math.floor((expTime-now)/1000):null,bufferMs:5000,isExpired:expTime?now>=(expTime-5000):true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  if (!expTime) {
    return true // If we can't read expiration, assume expired
  }
  
  // Add 5 second buffer to account for clock skew
  const expired = Date.now() >= (expTime - 5000)
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/3e871f39-4ed4-465f-8745-06da452ba93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jwt-utils.ts:58',message:'Token expiration check result',data:{expired,timeUntilExpMs:expTime-now,timeUntilExpSeconds:Math.floor((expTime-now)/1000)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  return expired
}

/**
 * Get time until token expiration in milliseconds
 */
export function getTokenTimeUntilExpiration(token: string): number | null {
  const expTime = getTokenExpirationTime(token)
  if (!expTime) {
    return null
  }
  
  return Math.max(0, expTime - Date.now())
}

/**
 * Get token lifetime in seconds (exp - iat)
 */
export function getTokenLifetime(token: string): number | null {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp || !payload.iat) {
    return null
  }
  
  // Return lifetime in seconds
  return payload.exp - payload.iat
}

/**
 * Format time until expiration as human-readable string
 */
export function formatTimeUntilExpiration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`
  }
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

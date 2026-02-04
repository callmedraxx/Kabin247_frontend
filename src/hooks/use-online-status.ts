"use client"

import { useState, useEffect, useCallback } from "react"

export interface OnlineStatus {
  isOnline: boolean
  wasOffline: boolean // True if user was recently offline (for showing sync notifications)
  lastOnlineAt: Date | null
  lastOfflineAt: Date | null
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return navigator.onLine
    }
    return true
  })
  const [wasOffline, setWasOffline] = useState(false)
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null)
  const [lastOfflineAt, setLastOfflineAt] = useState<Date | null>(null)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
    setLastOnlineAt(new Date())
    // If we were offline, set wasOffline flag for UI notifications
    setWasOffline(true)
    // Clear wasOffline after a delay to allow sync notifications to show
    setTimeout(() => setWasOffline(false), 10000)
  }, [])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
    setLastOfflineAt(new Date())
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    // Set initial state
    setIsOnline(navigator.onLine)
    if (navigator.onLine) {
      setLastOnlineAt(new Date())
    }

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [handleOnline, handleOffline])

  return {
    isOnline,
    wasOffline,
    lastOnlineAt,
    lastOfflineAt,
  }
}

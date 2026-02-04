"use client"

import * as React from "react"
import { useOnlineStatus } from "@/hooks/use-online-status"
import {
  processQueue,
  hasPendingSync,
  getPendingSyncCount,
  resolveConflict,
} from "@/lib/pwa/sync-queue"
import {
  initDB,
  isIndexedDBAvailable,
  getAllSyncQueueItems,
  getPendingOrders,
} from "@/lib/pwa/db"
import type {
  SyncQueueItem,
  CachedOrder,
  ConflictDetails,
  ConflictResolution,
} from "@/lib/pwa/types"
import type { SyncEventDetail } from "@/lib/pwa/sync-queue"

interface SyncProgress {
  total: number
  processed: number
  failed: number
}

interface OfflineContextType {
  isOnline: boolean
  isOfflineCapable: boolean
  isSyncing: boolean
  pendingSyncCount: number
  syncProgress: SyncProgress | null
  conflicts: ConflictDetails[]
  lastSyncAt: Date | null
  syncError: string | null
  triggerSync: () => Promise<void>
  resolveConflict: (
    localId: string,
    resolution: ConflictResolution
  ) => Promise<boolean>
  dismissConflict: (localId: string) => void
  getPendingOrders: () => Promise<CachedOrder[]>
}

const OfflineContext = React.createContext<OfflineContextType | undefined>(
  undefined
)

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { isOnline, wasOffline } = useOnlineStatus()
  const [isOfflineCapable, setIsOfflineCapable] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [pendingSyncCount, setPendingSyncCount] = React.useState(0)
  const [syncProgress, setSyncProgress] = React.useState<SyncProgress | null>(null)
  const [conflicts, setConflicts] = React.useState<ConflictDetails[]>([])
  const [lastSyncAt, setLastSyncAt] = React.useState<Date | null>(null)
  const [syncError, setSyncError] = React.useState<string | null>(null)

  // Initialize IndexedDB
  React.useEffect(() => {
    async function init() {
      if (!isIndexedDBAvailable()) {
        console.warn("IndexedDB is not available. Offline features disabled.")
        return
      }

      try {
        await initDB()
        setIsOfflineCapable(true)
        // Update pending sync count
        const count = await getPendingSyncCount()
        setPendingSyncCount(count)
      } catch (error) {
        console.error("Failed to initialize IndexedDB:", error)
      }
    }

    init()
  }, [])

  // Listen for sync events
  React.useEffect(() => {
    function handleSyncEvent(event: CustomEvent<SyncEventDetail>) {
      const { type, data } = event.detail

      switch (type) {
        case "sync:started":
          setIsSyncing(true)
          setSyncProgress({
            total: data?.total || 0,
            processed: 0,
            failed: 0,
          })
          setSyncError(null)
          break

        case "sync:progress":
          setSyncProgress({
            total: data?.total || 0,
            processed: data?.processed || 0,
            failed: data?.failed || 0,
          })
          break

        case "sync:completed":
          setIsSyncing(false)
          setSyncProgress(null)
          setLastSyncAt(new Date())
          updatePendingCount()
          break

        case "sync:failed":
          setIsSyncing(false)
          setSyncProgress(null)
          setSyncError(data?.error || "Sync failed")
          updatePendingCount()
          break

        case "sync:conflict":
          if (data?.conflict) {
            setConflicts((prev) => {
              // Avoid duplicates
              const exists = prev.some(
                (c) => c.localOrder._localId === data.conflict!.localOrder._localId
              )
              if (exists) return prev
              return [...prev, data.conflict!]
            })
          }
          break
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener(
        "pwa:sync",
        handleSyncEvent as EventListener
      )
      return () => {
        window.removeEventListener(
          "pwa:sync",
          handleSyncEvent as EventListener
        )
      }
    }
  }, [])

  // Auto-sync when coming back online
  React.useEffect(() => {
    async function autoSync() {
      if (isOnline && wasOffline && isOfflineCapable && !isSyncing) {
        const hasPending = await hasPendingSync()
        if (hasPending) {
          console.log("Coming back online - auto-syncing pending changes...")
          await triggerSync()
        }
      }
    }

    autoSync()
  }, [isOnline, wasOffline, isOfflineCapable, isSyncing])

  // Update pending count periodically
  async function updatePendingCount() {
    if (isOfflineCapable) {
      const count = await getPendingSyncCount()
      setPendingSyncCount(count)
    }
  }

  // Trigger manual sync
  const triggerSync = React.useCallback(async () => {
    if (!isOnline || isSyncing || !isOfflineCapable) {
      return
    }

    setIsSyncing(true)
    setSyncError(null)

    try {
      const result = await processQueue()
      setLastSyncAt(new Date())

      if (result.failed > 0) {
        setSyncError(`${result.failed} item(s) failed to sync`)
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed")
    } finally {
      setIsSyncing(false)
      setSyncProgress(null)
      await updatePendingCount()
    }
  }, [isOnline, isSyncing, isOfflineCapable])

  // Resolve a conflict
  const handleResolveConflict = React.useCallback(
    async (localId: string, resolution: ConflictResolution) => {
      try {
        const resolved = await resolveConflict(localId, resolution)
        if (resolved) {
          setConflicts((prev) =>
            prev.filter((c) => c.localOrder._localId !== localId)
          )
          await updatePendingCount()
          return true
        }
        return false
      } catch (error) {
        console.error("Failed to resolve conflict:", error)
        return false
      }
    },
    []
  )

  // Dismiss a conflict without resolving
  const dismissConflict = React.useCallback((localId: string) => {
    setConflicts((prev) =>
      prev.filter((c) => c.localOrder._localId !== localId)
    )
  }, [])

  // Get all pending orders
  const handleGetPendingOrders = React.useCallback(async () => {
    if (!isOfflineCapable) {
      return []
    }
    return getPendingOrders()
  }, [isOfflineCapable])

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isOfflineCapable,
        isSyncing,
        pendingSyncCount,
        syncProgress,
        conflicts,
        lastSyncAt,
        syncError,
        triggerSync,
        resolveConflict: handleResolveConflict,
        dismissConflict,
        getPendingOrders: handleGetPendingOrders,
      }}
    >
      {children}
    </OfflineContext.Provider>
  )
}

export function useOffline() {
  const context = React.useContext(OfflineContext)
  if (!context) {
    throw new Error("useOffline must be used within OfflineProvider")
  }
  return context
}

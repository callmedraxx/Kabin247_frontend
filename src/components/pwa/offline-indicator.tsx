"use client"

import * as React from "react"
import { useOffline } from "@/contexts/offline-context"
import { cn } from "@/lib/utils"
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

interface OfflineIndicatorProps {
  className?: string
  showDetails?: boolean
}

export function OfflineIndicator({
  className,
  showDetails = true,
}: OfflineIndicatorProps) {
  const {
    isOnline,
    isOfflineCapable,
    isSyncing,
    pendingSyncCount,
    syncProgress,
    syncError,
    lastSyncAt,
    triggerSync,
  } = useOffline()

  // Don't render if offline mode isn't available
  if (!isOfflineCapable) {
    return null
  }

  // Determine the display state
  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        label: "Offline",
        description: "Changes will sync when back online",
      }
    }

    if (isSyncing) {
      return {
        icon: Loader2,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        label: "Syncing",
        description: syncProgress
          ? `${syncProgress.processed}/${syncProgress.total} items`
          : "Syncing changes...",
        animate: true,
      }
    }

    if (syncError) {
      return {
        icon: AlertCircle,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        label: "Sync Error",
        description: syncError,
      }
    }

    if (pendingSyncCount > 0) {
      return {
        icon: Cloud,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        label: `${pendingSyncCount} pending`,
        description: "Tap to sync now",
        clickable: true,
      }
    }

    // All synced
    return {
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
      label: "Synced",
      description: lastSyncAt
        ? `Last sync: ${formatRelativeTime(lastSyncAt)}`
        : "All changes synced",
    }
  }

  const status = getStatusConfig()
  const Icon = status.icon

  const handleClick = () => {
    if (status.clickable && isOnline && !isSyncing) {
      triggerSync()
    }
  }

  // Minimal indicator (just icon)
  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              disabled={!status.clickable || isSyncing}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                status.bgColor,
                status.clickable && "cursor-pointer hover:opacity-80",
                className
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  status.color,
                  status.animate && "animate-spin"
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">{status.label}</p>
            <p className="text-xs text-muted-foreground">{status.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Full indicator with details
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm",
        status.bgColor,
        status.borderColor,
        status.clickable && "cursor-pointer hover:opacity-80",
        className
      )}
      onClick={handleClick}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          status.color,
          status.animate && "animate-spin"
        )}
      />
      <span className={cn("font-medium", status.color)}>{status.label}</span>
      {status.clickable && isOnline && !isSyncing && (
        <RefreshCw className={cn("h-3 w-3 ml-1", status.color)} />
      )}
    </div>
  )
}

// Floating indicator for bottom-right corner
export function FloatingOfflineIndicator() {
  const { isOnline, pendingSyncCount, isSyncing, syncError, isOfflineCapable } =
    useOffline()

  // Only show when there's something important to indicate
  const shouldShow =
    isOfflineCapable &&
    (!isOnline || pendingSyncCount > 0 || isSyncing || syncError)

  if (!shouldShow) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <OfflineIndicator showDetails />
    </div>
  )
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 60) {
    return "just now"
  } else if (diffMin < 60) {
    return `${diffMin}m ago`
  } else if (diffHour < 24) {
    return `${diffHour}h ago`
  } else {
    return date.toLocaleDateString()
  }
}

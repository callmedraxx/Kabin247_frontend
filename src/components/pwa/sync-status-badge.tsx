"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { SyncStatus } from "@/lib/pwa/types"
import {
  Cloud,
  CloudOff,
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Upload,
  RefreshCw,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

interface SyncStatusBadgeProps {
  status: SyncStatus
  orderNumber?: string
  className?: string
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

const statusConfig: Record<
  SyncStatus,
  {
    icon: React.ElementType
    label: string
    description: string
    color: string
    bgColor: string
    borderColor: string
  }
> = {
  synced: {
    icon: CheckCircle2,
    label: "Synced",
    description: "This order is synced with the server",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  pending_create: {
    icon: Upload,
    label: "Pending Upload",
    description: "This order will be uploaded when online",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  pending_update: {
    icon: RefreshCw,
    label: "Pending Sync",
    description: "Changes will sync when online",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  pending_delete: {
    icon: Trash2,
    label: "Pending Delete",
    description: "This order will be deleted when online",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  conflict: {
    icon: AlertCircle,
    label: "Conflict",
    description: "This order has conflicting changes that need resolution",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
}

const sizeConfig = {
  sm: {
    iconSize: "h-3 w-3",
    fontSize: "text-xs",
    padding: "px-1.5 py-0.5",
  },
  md: {
    iconSize: "h-4 w-4",
    fontSize: "text-sm",
    padding: "px-2 py-1",
  },
  lg: {
    iconSize: "h-5 w-5",
    fontSize: "text-base",
    padding: "px-2.5 py-1.5",
  },
}

export function SyncStatusBadge({
  status,
  orderNumber,
  className,
  showLabel = true,
  size = "sm",
}: SyncStatusBadgeProps) {
  const config = statusConfig[status]
  const sizeStyles = sizeConfig[size]
  const Icon = config.icon

  // Don't show badge for synced orders (no need to indicate normal state)
  if (status === "synced") {
    return null
  }

  const badge = (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border",
        config.bgColor,
        config.borderColor,
        sizeStyles.padding,
        className
      )}
    >
      <Icon className={cn(sizeStyles.iconSize, config.color)} />
      {showLabel && (
        <span className={cn(sizeStyles.fontSize, config.color, "font-medium")}>
          {config.label}
        </span>
      )}
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top">
          <div className="max-w-xs">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {orderNumber && status === "pending_create" && (
              <p className="text-xs text-muted-foreground mt-1">
                Temporary ID: {orderNumber}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Inline version for table cells
export function SyncStatusIcon({
  status,
  className,
  size = "sm",
}: Omit<SyncStatusBadgeProps, "showLabel">) {
  const config = statusConfig[status]
  const sizeStyles = sizeConfig[size]
  const Icon = config.icon

  // Don't show anything for synced orders
  if (status === "synced") {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex", className)}>
            <Icon className={cn(sizeStyles.iconSize, config.color)} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Order number display with pending indicator
export function OrderNumberWithSync({
  orderNumber,
  syncStatus,
  className,
}: {
  orderNumber: string
  syncStatus?: SyncStatus
  className?: string
}) {
  const isPending = orderNumber.startsWith("PENDING-")

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "font-mono",
          isPending && "text-orange-500 italic"
        )}
      >
        {orderNumber}
      </span>
      {syncStatus && <SyncStatusIcon status={syncStatus} size="sm" />}
    </div>
  )
}

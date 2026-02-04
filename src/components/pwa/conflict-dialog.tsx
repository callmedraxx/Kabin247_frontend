"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ConflictDetails, ConflictResolution } from "@/lib/pwa/types"
import {
  AlertTriangle,
  ArrowRight,
  Monitor,
  Smartphone,
  GitMerge,
  CheckCircle2,
} from "lucide-react"

interface ConflictDialogProps {
  conflict: ConflictDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onResolve: (resolution: ConflictResolution) => void
  isResolving?: boolean
}

export function ConflictDialog({
  conflict,
  open,
  onOpenChange,
  onResolve,
  isResolving = false,
}: ConflictDialogProps) {
  if (!conflict) {
    return null
  }

  const { localOrder, serverOrder, conflictingFields } = conflict

  // Format value for display
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return "—"
    }
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return `${value.length} items`
      }
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  // Get human-readable field name
  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      status: "Status",
      items: "Order Items",
      total: "Total Amount",
      subtotal: "Subtotal",
      client_id: "Client",
      caterer_id: "Caterer",
      airport_id: "Airport",
      delivery_date: "Delivery Date",
      delivery_time: "Delivery Time",
      service_charge: "Service Charge",
      delivery_fee: "Delivery Fee",
      notes: "Notes",
      description: "Description",
    }
    return labels[field] || field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Sync Conflict Detected
          </DialogTitle>
          <DialogDescription>
            Order{" "}
            <span className="font-mono font-medium">{localOrder.order_number}</span>{" "}
            has been modified both locally and on the server. Choose how to resolve
            this conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conflicting fields comparison */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-border/50 text-sm font-medium">
              <div className="bg-muted/50 px-3 py-2">Field</div>
              <div className="bg-muted/50 px-3 py-2 flex items-center gap-1">
                <Smartphone className="h-4 w-4" />
                Local
              </div>
              <div className="bg-muted/50 px-3 py-2 flex items-center gap-1">
                <Monitor className="h-4 w-4" />
                Server
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {conflictingFields.map((field) => (
                <div
                  key={field}
                  className="grid grid-cols-3 gap-px bg-border/50 text-sm"
                >
                  <div className="bg-background px-3 py-2 font-medium">
                    {getFieldLabel(field)}
                  </div>
                  <div className="bg-background px-3 py-2 text-orange-500">
                    {formatValue((localOrder as unknown as Record<string, unknown>)[field])}
                  </div>
                  <div className="bg-background px-3 py-2 text-blue-500">
                    {formatValue((serverOrder as unknown as Record<string, unknown>)[field])}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution options */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Choose a resolution:</p>

            <div className="grid gap-3">
              {/* Keep Local */}
              <button
                onClick={() => onResolve("local")}
                disabled={isResolving}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border border-border/50",
                  "hover:bg-muted/50 hover:border-orange-500/50 transition-colors",
                  "text-left disabled:opacity-50"
                )}
              >
                <div className="flex-shrink-0 p-2 rounded-full bg-orange-500/10">
                  <Smartphone className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h4 className="font-medium">Keep Local Changes</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Override the server with your local changes. Other users&apos;
                    changes will be lost.
                  </p>
                </div>
              </button>

              {/* Accept Server */}
              <button
                onClick={() => onResolve("server")}
                disabled={isResolving}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border border-border/50",
                  "hover:bg-muted/50 hover:border-blue-500/50 transition-colors",
                  "text-left disabled:opacity-50"
                )}
              >
                <div className="flex-shrink-0 p-2 rounded-full bg-blue-500/10">
                  <Monitor className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-medium">Accept Server Version</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Discard your local changes and use the server version. Your
                    changes will be lost.
                  </p>
                </div>
              </button>

              {/* Merge */}
              <button
                onClick={() => onResolve("merge")}
                disabled={isResolving}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border border-border/50",
                  "hover:bg-muted/50 hover:border-green-500/50 transition-colors",
                  "text-left disabled:opacity-50"
                )}
              >
                <div className="flex-shrink-0 p-2 rounded-full bg-green-500/10">
                  <GitMerge className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    Smart Merge
                    <Badge variant="secondary" className="text-xs">
                      Recommended
                    </Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Keep server values for critical fields (status, totals) and
                    your local changes for notes and descriptions.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResolving}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook to manage conflict dialog state
export function useConflictDialog() {
  const [selectedConflict, setSelectedConflict] =
    React.useState<ConflictDetails | null>(null)
  const [isOpen, setIsOpen] = React.useState(false)

  const showConflict = React.useCallback((conflict: ConflictDetails) => {
    setSelectedConflict(conflict)
    setIsOpen(true)
  }, [])

  const closeDialog = React.useCallback(() => {
    setIsOpen(false)
    setTimeout(() => setSelectedConflict(null), 200) // Wait for animation
  }, [])

  return {
    selectedConflict,
    isOpen,
    setIsOpen,
    showConflict,
    closeDialog,
  }
}

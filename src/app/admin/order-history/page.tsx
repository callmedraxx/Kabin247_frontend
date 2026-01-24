"use client"

import * as React from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { SidebarCategoryProvider } from "@/contexts/sidebar-context"
import { HeaderNav } from "@/components/dashboard/header-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Download,
  MoreHorizontal,
  Search,
  X,
  Eye,
  FileText,
  Mail,
  Send,
  Calendar,
  Clock,
  Plane,
  User,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Building2,
  UtensilsCrossed,
  AlertCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"
import { apiCall, apiCallJson } from "@/lib/api-client"

// Order status types (only historical statuses)
import type { OrderStatus } from "@/lib/order-status-config"
import { getStatusOptions, getOrderStatusConfig, getStatusTooltipContent } from "@/lib/order-status-config"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

// Order data structure matching API response
interface OrderClient {
  id: number
  full_name: string
  email: string
  contact_number: string
  full_address: string
  additional_emails?: string[]
}

interface OrderCaterer {
  id: number
  caterer_name: string
  caterer_number: string
  caterer_email: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
  additional_emails?: string[]
}

interface OrderAirport {
  id: number
  airport_name: string
  fbo_name: string
  fbo_email?: string
  fbo_phone?: string
  airport_code_iata: string | null
  airport_code_icao: string | null
}

interface OrderItem {
  id: number
  order_id: number
  item_name: string
  item_description: string
  portion_size: string
  price: string | number
  sort_order: number
  menu_item_id: number
}

interface Order {
  id: number
  order_number: string
  aircraft_tail_number: string | null
  delivery_date: string
  delivery_time: string
  order_priority: string
  payment_method: string
  status: OrderStatus
  description: string | null
  notes: string | null
  reheating_instructions: string | null
  packaging_instructions: string | null
  dietary_restrictions: string | null
  service_charge: string | number
  coordination_fee: string | number | null
  airport_fee: string | number | null
  fbo_fee: string | number | null
  shopping_fee: string | number | null
  restaurant_pickup_fee: string | number | null
  airport_pickup_fee: string | number | null
  subtotal: string | number
  total: string | number
  created_at: string
  updated_at: string
  completed_at: string | null
  client_id: number
  caterer_id: number
  airport_id: number
  order_type: string | null
  delivery_fee: string | number | null
  is_paid?: boolean
  client?: OrderClient
  caterer_details?: OrderCaterer
  airport_details?: OrderAirport
  items?: OrderItem[]
}

interface OrdersResponse {
  orders: Order[]
  total: number
  page: number
  limit: number
}

// Status options with labels and colors
// Get status options from centralized config (all statuses possible for paid orders)
const statusOptions = getStatusOptions()

function OrderHistoryContent() {
  const [orders, setOrders] = React.useState<Order[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [selectedOrders, setSelectedOrders] = React.useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "all">("all")
  const [dateRange, setDateRange] = React.useState<{ start: string; end: string }>({
    start: "",
    end: "",
  })
  const [viewDrawerOpen, setViewDrawerOpen] = React.useState(false)
  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null)
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false)
  const [orderForEmail, setOrderForEmail] = React.useState<Order | null>(null)
  const [emailRecipient, setEmailRecipient] = React.useState<"client" | "caterer" | "both">("client")
  const [customClientMessage, setCustomClientMessage] = React.useState("")
  const [customCatererMessage, setCustomCatererMessage] = React.useState("")
  const [isSendingEmail, setIsSendingEmail] = React.useState(false)
  const [selectedFriendEmails, setSelectedFriendEmails] = React.useState<Set<string>>(new Set())
  const [manualCcEmails, setManualCcEmails] = React.useState("")
  const [pdfPreviewOpen, setPdfPreviewOpen] = React.useState(false)
  const [orderForPdf, setOrderForPdf] = React.useState<Order | null>(null)
  const [pdfHtml, setPdfHtml] = React.useState<string>("")
  const [costs, setCosts] = React.useState<Record<string, number>>({})
  const [costDialogOpen, setCostDialogOpen] = React.useState(false)
  const [orderForCost, setOrderForCost] = React.useState<Order | null>(null)
  const [costInput, setCostInput] = React.useState("")
  const [isSavingCost, setIsSavingCost] = React.useState(false)

  // Helper to get cost for an order with case-insensitive and trim-safe lookup
  const getOrderCostValue = React.useCallback((orderNumber: string | null | undefined): number => {
    if (!orderNumber) return 0;
    const num = orderNumber.trim();
    // Try exact match, then lowercase, then uppercase
    const cost = costs[num] ?? costs[num.toLowerCase()] ?? costs[num.toUpperCase()];
    return cost ?? 0;
  }, [costs]);

  // Fetch orders from API
  const fetchOrders = React.useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const data: OrdersResponse = await apiCallJson<OrdersResponse>(`/orders?limit=1000`)
      
      // Filter for only paid orders (Order History now shows paid orders)
      const historicalOrders = (data.orders || []).filter(
        (order) => order.is_paid === true
      )
      
      setOrders(historicalOrders)

      // Fetch order costs for all paid orders
      const orderNumbers = historicalOrders.map((o) => o.order_number).filter(Boolean)
      if (orderNumbers.length > 0) {
        try {
          // Add cache-busting parameter to ensure fresh data
          const costData = await apiCallJson<{ costs: Record<string, number> }>(
            `/order-costs?order_numbers=${encodeURIComponent(orderNumbers.join(","))}&_t=${Date.now()}`
          )
          setCosts(costData.costs || {})
        } catch (e) {
          setCosts({})
        }
      } else {
        setCosts({})
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load orders"
      
      // Check if it's a permission error
      if (errorMessage.toLowerCase().includes("permission") || 
          errorMessage.toLowerCase().includes("insufficient") ||
          errorMessage.toLowerCase().includes("forbidden") ||
          errorMessage.toLowerCase().includes("403")) {
        console.error("[Order History] Permission error when fetching orders:", {
          error: errorMessage,
          note: "This may indicate that the employee's permissions were not properly set when they accepted the invitation. Please verify permissions in the Employees page.",
        })
        toast.error("Permission Denied", {
          description: "You don't have permission to view order history. Please contact an administrator to verify your 'Read Orders' permission is enabled.",
          duration: 8000,
        })
      } else {
        toast.error("Error loading order history", { description: errorMessage })
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Calculate statistics (revenue = sum of order totals - sum of costs for paid orders)
  const stats = React.useMemo(() => {
    const totalOrders = orders.length
    const deliveredOrders = orders.filter((o) => o.status === "delivered").length
    const cancelledOrders = orders.filter((o) => o.status === "cancelled").length
    
    // Sum totals for all paid orders
    const sumTotals = orders.reduce((sum, o) => {
      const total = typeof o.total === "number" ? o.total : parseFloat(String(o.total) || "0")
      return sum + (isNaN(total) ? 0 : total)
    }, 0)
    
    // Sum costs for all paid orders
    const totalCost = orders.reduce((sum, o) => sum + getOrderCostValue(o.order_number), 0)
    
    // Revenue = Sum of paid order totals - Sum of paid order costs
    const totalRevenue = sumTotals - totalCost
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    return {
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      totalCost,
      averageOrderValue,
    }
  }, [orders, getOrderCostValue])

  // Filter orders based on search query, status, and date range
  const filteredOrders = React.useMemo(() => {
    let filtered = orders

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Filter by date range - parse dates directly to avoid timezone issues
    if (dateRange.start) {
      // Parse start date string (YYYY-MM-DD format)
      const startMatch = dateRange.start.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (startMatch) {
        const [, startYear, startMonth, startDay] = startMatch
        filtered = filtered.filter((order) => {
          // Parse order delivery date string (YYYY-MM-DD format)
          const orderMatch = order.delivery_date?.match(/^(\d{4})-(\d{2})-(\d{2})/)
          if (!orderMatch) return false
          const [, orderYear, orderMonth, orderDay] = orderMatch
          
          // Compare as strings (YYYY-MM-DD format is naturally sortable)
          const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`
          const startDateStr = `${startYear}-${startMonth}-${startDay}`
          return orderDateStr >= startDateStr
        })
      }
    }
    if (dateRange.end) {
      // Parse end date string (YYYY-MM-DD format)
      const endMatch = dateRange.end.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (endMatch) {
        const [, endYear, endMonth, endDay] = endMatch
        filtered = filtered.filter((order) => {
          // Parse order delivery date string (YYYY-MM-DD format)
          const orderMatch = order.delivery_date?.match(/^(\d{4})-(\d{2})-(\d{2})/)
          if (!orderMatch) return false
          const [, orderYear, orderMonth, orderDay] = orderMatch
          
          // Compare as strings (YYYY-MM-DD format is naturally sortable)
          const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`
          const endDateStr = `${endYear}-${endMonth}-${endDay}`
          return orderDateStr <= endDateStr
        })
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.order_number.toLowerCase().includes(query) ||
          (order.client?.full_name && order.client.full_name.toLowerCase().includes(query)) ||
          (order.caterer_details?.caterer_name && order.caterer_details.caterer_name.toLowerCase().includes(query)) ||
          (order.airport_details?.airport_name && order.airport_details.airport_name.toLowerCase().includes(query)) ||
          (order.aircraft_tail_number && order.aircraft_tail_number.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [orders, searchQuery, statusFilter, dateRange])

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)))
    } else {
      setSelectedOrders(new Set())
    }
  }

  // Handle individual selection
  const handleSelect = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedOrders)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedOrders(newSelected)
  }

  // Handle view details
  const handleView = (order: Order) => {
    setViewingOrder(order)
    setViewDrawerOpen(true)
  }

  // Handle save cost
  const handleSaveCost = async () => {
    if (!orderForCost) return
    const num = parseFloat(costInput.trim())
    if (isNaN(num) || num < 0) {
      toast.error("Invalid cost", { description: "Enter a non-negative number." })
      return
    }
    setIsSavingCost(true)
    try {
      await apiCallJson(`/order-costs/${encodeURIComponent(orderForCost.order_number)}`, {
        method: "PUT",
        body: JSON.stringify({ cost: num }),
      })
      
      // Store the order number and cost we just saved to preserve it during refetch
      const savedOrderNumber = orderForCost.order_number
      const savedCost = num
      
      // Update local state immediately - this ensures stats update right away
      setCosts((prev) => ({ ...prev, [savedOrderNumber]: savedCost }))
      
      // Refetch costs from API after a short delay to ensure database commit
      const orderNumbers = orders.map((o) => o.order_number).filter(Boolean)
      if (orderNumbers.length > 0) {
        setTimeout(async () => {
          try {
            const costData = await apiCallJson<{ costs: Record<string, number> }>(
              `/order-costs?order_numbers=${encodeURIComponent(orderNumbers.join(","))}&_t=${Date.now()}`
            )
            // Merge refetched costs with current state
            setCosts((prev) => {
              const merged = { ...(costData.costs || {}), ...prev }
              merged[savedOrderNumber] = savedCost
              return merged
            })
          } catch (e) {
            console.warn("Failed to refetch costs after save:", e)
          }
        }, 100)
      }
      
      toast.success("Cost saved", { description: `Order ${orderForCost.order_number}` })
      setCostDialogOpen(false)
      setOrderForCost(null)
      setCostInput("")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save cost"
      toast.error("Error saving cost", { description: msg })
    } finally {
      setIsSavingCost(false)
    }
  }

  // Handle export
  const handleExport = () => {
    const dataToExport = filteredOrders.map((order) => ({
      "Order Number": order.order_number,
      "Client": order.client?.full_name || "—",
      "Caterer": order.caterer_details?.caterer_name || "—",
      "Airport": order.airport_details?.airport_name || "—",
      "Aircraft Tail Number": order.aircraft_tail_number || "",
      "Delivery Date": formatDateForDisplay(order.delivery_date),
      "Delivery Time": order.delivery_time,
      "Status": statusOptions.find((s) => s.value === order.status)?.label || order.status,
      "Payment Status": "Paid",
      "Order Type": order.order_type || "—",
      "Total": typeof order.total === "number" ? order.total : parseFloat(String(order.total) || "0"),
      "Cost": getOrderCostValue(order.order_number) || "",
      "Payment Method": order.payment_method,
      "Created At": new Date(order.created_at).toLocaleString(),
      "Completed At": order.completed_at ? new Date(order.completed_at).toLocaleString() : "",
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Order History")
    XLSX.writeFile(wb, `order-history-${new Date().toISOString().split("T")[0]}.xlsx`)
    toast.success("Export successful", { description: `Exported ${dataToExport.length} orders` })
  }

  // Handle send email
  const handleSendEmail = (order: Order) => {
    setOrderForEmail(order)
    setCustomClientMessage("")
    setCustomCatererMessage("")
    setEmailRecipient("client")
    setSelectedFriendEmails(new Set())
    setManualCcEmails("")
    setEmailDialogOpen(true)
  }

  // Handle email send confirmation
  const confirmEmailSend = async () => {
    if (!orderForEmail) return

    setIsSendingEmail(true)
    try {
      let endpoint = ""
      let payload: Record<string, any> = {}

      // Collect all CC emails (selected friends + manual input)
      const ccEmails: string[] = []
      selectedFriendEmails.forEach(email => ccEmails.push(email))
      
      // Parse manual CC emails (comma-separated)
      if (manualCcEmails.trim()) {
        const manualEmails = manualCcEmails.split(",").map(e => e.trim()).filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
        manualEmails.forEach(email => {
          if (!ccEmails.includes(email)) {
            ccEmails.push(email)
          }
        })
      }

      if (emailRecipient === "client") {
        endpoint = `/orders/${orderForEmail.id}/send-to-client`
        if (customClientMessage.trim()) {
          payload.custom_message = customClientMessage.trim()
        }
      } else if (emailRecipient === "caterer") {
        endpoint = `/orders/${orderForEmail.id}/send-to-caterer`
        if (customCatererMessage.trim()) {
          payload.custom_message = customCatererMessage.trim()
        }
      } else {
        endpoint = `/orders/${orderForEmail.id}/send-to-both`
        if (customClientMessage.trim()) {
          payload.custom_client_message = customClientMessage.trim()
        }
        if (customCatererMessage.trim()) {
          payload.custom_caterer_message = customCatererMessage.trim()
        }
      }

      // Add CC emails if any
      if (ccEmails.length > 0) {
        payload.cc_emails = ccEmails
      }

      await apiCallJson(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      toast.success("Email sent successfully", {
        description: `Order ${orderForEmail.order_number} sent to ${emailRecipient === "both" ? "client and caterer" : emailRecipient}`,
      })
      setEmailDialogOpen(false)
      setOrderForEmail(null)
      setSelectedFriendEmails(new Set())
      setManualCcEmails("")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send email"
      toast.error("Error sending email", { description: errorMessage })
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Handle PDF preview
  const handlePdfPreview = async (order: Order) => {
    setOrderForPdf(order)
    setPdfPreviewOpen(true)
    setPdfHtml("")

    try {
      const data = await apiCallJson<{ html: string }>(`/orders/${order.id}/preview`)
      setPdfHtml(data.html || "")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load preview"
      setPdfPreviewOpen(false)
      setOrderForPdf(null)
      toast.error("Error loading preview", { description: errorMessage })
    }
  }

  // Handle PDF download
  const handlePdfDownload = async (order: Order) => {
    toast.loading("Generating PDF...", { id: `pdf-${order.id}` })

    try {
      const response = await apiCall(`/orders/${order.id}/pdf?regenerate=true`)
      
      if (!response.ok) {
        throw new Error("Failed to download PDF")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `order_${order.order_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success("PDF downloaded", {
        id: `pdf-${order.id}`,
        description: `Order ${order.order_number} PDF has been downloaded.`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to download PDF"
      toast.error("Error downloading PDF", {
        id: `pdf-${order.id}`,
        description: errorMessage,
      })
    }
  }

  // Format date without timezone conversion issues
  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    
    // If it's in YYYY-MM-DD format, parse directly to avoid timezone issues
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, year, month, day] = match
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`
    }
    
    // Fallback: use UTC timezone to avoid conversion issues
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    })
  }
  
  // Format date for display (MM/DD/YYYY) without timezone issues
  const formatDateForDisplay = (dateString: string | null | undefined): string => {
    if (!dateString) return ""
    
    // If it's in YYYY-MM-DD format, parse directly
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, year, month, day] = match
      return `${month}/${day}/${year}`
    }
    
    // Fallback: use UTC methods
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ""
      const m = String(date.getUTCMonth() + 1).padStart(2, "0")
      const d = String(date.getUTCDate()).padStart(2, "0")
      const y = date.getUTCFullYear()
      return `${m}/${d}/${y}`
    } catch {
      return ""
    }
  }

  // Get status badge
  const getStatusBadge = (status: OrderStatus) => {
    const statusOption = statusOptions.find((s) => s.value === status)
    const statusConfig = getOrderStatusConfig(status)
    const tooltipContent = getStatusTooltipContent(status)
    
    const badge = (
      <Badge className={statusOption?.color || ""} variant="outline">
        {statusOption?.label || status}
      </Badge>
    )
    
    if (statusConfig && tooltipContent) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {badge}
            </TooltipTrigger>
            <TooltipContent className="max-w-xs whitespace-pre-line text-left">
              <div className="font-semibold mb-1">{statusConfig.label}</div>
              <div className="text-xs">{tooltipContent}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    
    return badge
  }

  // Clear date filters
  const clearDateFilters = () => {
    setDateRange({ start: "", end: "" })
  }

  // Format price
  const formatPrice = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return "0.00"
    const num = typeof value === "number" ? value : parseFloat(String(value) || "0")
    return num.toFixed(2)
  }

  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <HeaderNav title="Order History" />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-6 md:p-6 lg:p-8">
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">Paid orders</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{stats.deliveredOrders}</div>
                  <p className="text-xs text-muted-foreground">Paid & Delivered</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                  <X className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.cancelledOrders}</div>
                  <p className="text-xs text-muted-foreground">Paid & Cancelled</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    ${stats.totalCost.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Costs of paid orders</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${stats.totalRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total paid minus costs</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ${stats.averageOrderValue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Average per paid order</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Actions */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Filter orders by status, date range, or search query</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchOrders(true)}
                    disabled={isRefreshing}
                    className="gap-2"
                  >
                    {isRefreshing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                  <div className="flex-1">
                    <Label htmlFor="search">Search</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search by order number, client, caterer, airport..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-[180px]">
                    <Label htmlFor="status">Status</Label>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | "all")}>
                      <SelectTrigger id="status" className="mt-1">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full md:w-[180px]">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div className="w-full md:w-[180px]">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    {(dateRange.start || dateRange.end) && (
                      <Button variant="outline" size="sm" onClick={clearDateFilters}>
                        <X className="h-4 w-4 mr-2" />
                        Clear Dates
                      </Button>
                    )}
                    <Button onClick={handleExport} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>
                      {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} found
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </TableHead>
                        <TableHead className="font-semibold">Order #</TableHead>
                        <TableHead className="font-semibold">Client</TableHead>
                        <TableHead className="font-semibold">Caterer</TableHead>
                        <TableHead className="font-semibold">Airport</TableHead>
                        <TableHead className="font-semibold">Delivery</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Payment</TableHead>
                        <TableHead className="text-right font-semibold">Total</TableHead>
                        <TableHead className="text-right font-semibold">Cost</TableHead>
                        <TableHead className="w-12 text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                          </TableRow>
                        ))
                      ) : filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <ShoppingCart className="h-8 w-8 opacity-50" />
                              <p className="text-sm font-medium">No paid orders found</p>
                              <p className="text-xs">
                                {searchQuery || statusFilter !== "all" || dateRange.start || dateRange.end
                                  ? "Try adjusting your filters"
                                  : "Orders marked as paid will appear here"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((order) => (
                          <TableRow key={order.id} className="group hover:bg-muted/30 transition-colors border-b border-border/30">
                            <TableCell>
                              <Checkbox
                                checked={selectedOrders.has(order.id)}
                                onCheckedChange={(checked) => handleSelect(order.id, checked as boolean)}
                                aria-label={`Select ${order.order_number}`}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <span className="font-mono text-sm">{order.order_number}</span>
                            </TableCell>
                            <TableCell className="max-w-[150px]">
                              <div className="truncate" title={order.client?.full_name || "—"}>
                                {order.client?.full_name || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[150px]">
                              <div className="truncate" title={order.caterer_details?.caterer_name || "—"}>
                                {order.caterer_details?.caterer_name || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[180px]">
                              <div className="truncate" title={order.airport_details?.airport_name || "—"}>
                                <span>{order.airport_details?.airport_name || "—"}</span>
                                {order.airport_details?.airport_code_icao && (
                                  <span className="ml-1.5 text-xs font-mono text-muted-foreground">
                                    ({order.airport_details.airport_code_icao})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm">{formatDate(order.delivery_date)}</span>
                                <span className="text-xs text-muted-foreground">{order.delivery_time}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" variant="outline">
                                Paid
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${formatPrice(order.total)}
                            </TableCell>
                            <TableCell className="text-right">
                              {(() => {
                                const cost = getOrderCostValue(order.order_number);
                                return cost > 0 ? `$${formatPrice(cost)}` : "—";
                              })()}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted transition-colors">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleView(order)} className="cursor-pointer">
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePdfPreview(order)} className="cursor-pointer">
                                    <FileText className="mr-2 h-4 w-4" />
                                    Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePdfDownload(order)} className="cursor-pointer">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setOrderForCost(order)
                                      const cost = getOrderCostValue(order.order_number);
                                      setCostInput(cost > 0 ? String(cost) : "")
                                      setCostDialogOpen(true)
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Edit Cost
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSendEmail(order)} className="cursor-pointer">
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send Email
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* View Details Drawer */}
            <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen} direction="right">
              <DrawerContent side="right" resizable>
                <div className="flex flex-col h-full">
                  <DrawerHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25">
                          <ShoppingCart className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <DrawerTitle className="text-2xl font-bold">
                          {viewingOrder?.order_number}
                        </DrawerTitle>
                        <DrawerDescription>
                          Complete order information and details
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  {viewingOrder && (
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                      <div className="space-y-4">
                        {/* Order Information Card */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              Order Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Order Number</Label>
                                <p className="text-sm font-medium font-mono">{viewingOrder.order_number}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
                                {getStatusBadge(viewingOrder.status)}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Delivery Date</Label>
                                <p className="text-sm font-medium">{formatDate(viewingOrder.delivery_date)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Delivery Time</Label>
                                <p className="text-sm font-medium">{viewingOrder.delivery_time}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Order Priority</Label>
                                <Badge variant="outline" className="capitalize">{viewingOrder.order_priority}</Badge>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Payment Method</Label>
                                <Badge variant="outline" className="uppercase">{viewingOrder.payment_method}</Badge>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Order Type</Label>
                                {viewingOrder.order_type ? (
                                  <Badge variant="outline" className="font-mono">{viewingOrder.order_type}</Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Delivery Fee</Label>
                                <p className="text-sm font-medium">${formatPrice(viewingOrder.delivery_fee)}</p>
                              </div>
                            </div>
                            {viewingOrder.aircraft_tail_number && (
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Aircraft Tail Number</Label>
                                <p className="text-sm font-mono font-medium">{viewingOrder.aircraft_tail_number}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Client Information */}
                        {viewingOrder.client && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-500" />
                                Client Information
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Full Name</Label>
                                  <p className="text-sm font-medium">{viewingOrder.client.full_name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
                                  <p className="text-sm font-medium">{viewingOrder.client.email}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Contact Number</Label>
                                  <p className="text-sm font-medium">{viewingOrder.client.contact_number || "—"}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Address</Label>
                                  <p className="text-sm font-medium">{viewingOrder.client.full_address}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Caterer Information */}
                        {viewingOrder.caterer_details && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-violet-500" />
                                Caterer Information
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Caterer Name</Label>
                                  <p className="text-sm font-medium">{viewingOrder.caterer_details.caterer_name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Phone Number</Label>
                                  <p className="text-sm font-medium">{viewingOrder.caterer_details.caterer_number || "—"}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
                                  <p className="text-sm font-medium">{viewingOrder.caterer_details.caterer_email || "—"}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Airport Codes</Label>
                                  <p className="text-sm font-mono font-medium">
                                    {viewingOrder.caterer_details.airport_code_iata} / {viewingOrder.caterer_details.airport_code_icao}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Airport Information */}
                        {viewingOrder.airport_details && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Plane className="h-5 w-5 text-cyan-500" />
                                Airport Information
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Airport Name</Label>
                                  <p className="text-sm font-medium">{viewingOrder.airport_details.airport_name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">FBO</Label>
                                  <p className="text-sm font-medium">{viewingOrder.airport_details.fbo_name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Airport Codes</Label>
                                  <p className="text-sm font-mono font-medium">
                                    {viewingOrder.airport_details.airport_code_iata} / {viewingOrder.airport_details.airport_code_icao}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Order Items */}
                        {viewingOrder.items && viewingOrder.items.length > 0 && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <UtensilsCrossed className="h-5 w-5 text-emerald-500" />
                                Order Items
                                <Badge variant="secondary" className="ml-2">{viewingOrder.items.length} items</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {viewingOrder.items.map((item) => (
                                  <div key={item.id} className="flex justify-between items-center p-3 border border-border/30 rounded-lg bg-background/50">
                                    <div>
                                      <p className="text-sm font-medium">{item.item_name}</p>
                                      {item.item_description && (
                                        <p className="text-xs text-muted-foreground">{item.item_description}</p>
                                      )}
                                      <p className="text-xs text-muted-foreground">Qty: {item.portion_size}</p>
                                    </div>
                                    <p className="text-sm font-medium">${formatPrice(item.price)}</p>
                                  </div>
                                ))}
                                <div className="border-t border-border/50 pt-3 mt-3 space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>${formatPrice(viewingOrder.subtotal)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Service Charge</span>
                                    <span>${formatPrice(viewingOrder.service_charge)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Delivery Fee</span>
                                    <span>${formatPrice(viewingOrder.delivery_fee)}</span>
                                  </div>
                                  {parseFloat(String(viewingOrder.coordination_fee || 0)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Coordination Fee</span>
                                      <span>${formatPrice(viewingOrder.coordination_fee)}</span>
                                    </div>
                                  )}
                                  {parseFloat(String(viewingOrder.airport_fee || 0)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Airport Fee</span>
                                      <span>${formatPrice(viewingOrder.airport_fee)}</span>
                                    </div>
                                  )}
                                  {parseFloat(String(viewingOrder.fbo_fee || 0)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">FBO Fee</span>
                                      <span>${formatPrice(viewingOrder.fbo_fee)}</span>
                                    </div>
                                  )}
                                  {parseFloat(String(viewingOrder.shopping_fee || 0)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Shopping Fee</span>
                                      <span>${formatPrice(viewingOrder.shopping_fee)}</span>
                                    </div>
                                  )}
                                  {parseFloat(String(viewingOrder.restaurant_pickup_fee || 0)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Restaurant Pickup Fee</span>
                                      <span>${formatPrice(viewingOrder.restaurant_pickup_fee)}</span>
                                    </div>
                                  )}
                                  {parseFloat(String(viewingOrder.airport_pickup_fee || 0)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Airport Pickup Fee</span>
                                      <span>${formatPrice(viewingOrder.airport_pickup_fee)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-semibold text-base pt-2 border-t">
                                    <span>Total</span>
                                    <span>${formatPrice(viewingOrder.total)}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Additional Instructions */}
                        {(viewingOrder.reheating_instructions || viewingOrder.packaging_instructions || viewingOrder.dietary_restrictions || viewingOrder.description) && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">Additional Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {viewingOrder.description && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Description</Label>
                                  <p className="text-sm font-medium break-words">{viewingOrder.description}</p>
                                </div>
                              )}
                              {viewingOrder.reheating_instructions && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Reheating Instructions</Label>
                                  <p className="text-sm font-medium break-words">{viewingOrder.reheating_instructions}</p>
                                </div>
                              )}
                              {viewingOrder.packaging_instructions && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Packaging Instructions</Label>
                                  <p className="text-sm font-medium break-words">{viewingOrder.packaging_instructions}</p>
                                </div>
                              )}
                              {viewingOrder.dietary_restrictions && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">Dietary Restrictions</Label>
                                  <p className="text-sm font-medium break-words">{viewingOrder.dietary_restrictions}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  )}
                  <DrawerFooter className="border-t border-border/50 pt-4 flex-shrink-0 bg-background sticky bottom-0">
                    <div className="flex flex-wrap gap-2 w-full">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (viewingOrder) handlePdfPreview(viewingOrder)
                        }}
                        className="flex-1 min-w-[100px] gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (viewingOrder) handlePdfDownload(viewingOrder)
                        }}
                        className="flex-1 min-w-[120px] gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (viewingOrder) handleSendEmail(viewingOrder)
                        }}
                        className="flex-1 min-w-[100px] gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                      <DrawerClose asChild>
                        <Button className="flex-1 min-w-[80px]">Close</Button>
                      </DrawerClose>
                    </div>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>

            {/* Email Dialog */}
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Send Order via Email
                  </DialogTitle>
                  <DialogDescription>
                    Send order {orderForEmail?.order_number} to the selected recipient(s).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Recipient</Label>
                    <Select value={emailRecipient} onValueChange={(value) => setEmailRecipient(value as "client" | "caterer" | "both")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">
                          <div className="flex flex-col">
                            <span>Client Only</span>
                            {orderForEmail?.client?.email && (
                              <span className="text-xs text-muted-foreground">{orderForEmail.client.email}</span>
                            )}
                          </div>
                        </SelectItem>
                        <SelectItem value="caterer">
                          <div className="flex flex-col">
                            <span>Caterer Only</span>
                            {orderForEmail?.caterer_details?.caterer_email && (
                              <span className="text-xs text-muted-foreground">{orderForEmail.caterer_details.caterer_email}</span>
                            )}
                          </div>
                        </SelectItem>
                        <SelectItem value="both">Both Client and Caterer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(emailRecipient === "client" || emailRecipient === "both") && (
                    <div className="space-y-2">
                      <Label htmlFor="clientMessage">
                        Custom Message for Client
                        <span className="text-xs text-muted-foreground ml-2">(optional)</span>
                      </Label>
                      <Textarea
                        id="clientMessage"
                        placeholder="Leave empty to use the default template..."
                        value={customClientMessage}
                        onChange={(e) => setCustomClientMessage(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                  )}

                  {(emailRecipient === "caterer" || emailRecipient === "both") && (
                    <div className="space-y-2">
                      <Label htmlFor="catererMessage">
                        Custom Message for Caterer
                        <span className="text-xs text-muted-foreground ml-2">(optional)</span>
                      </Label>
                      <Textarea
                        id="catererMessage"
                        placeholder="Leave empty to use the default template..."
                        value={customCatererMessage}
                        onChange={(e) => setCustomCatererMessage(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                  )}

                  {/* Friend Emails Section */}
                  {(() => {
                    const clientEmails = (emailRecipient === "client" || emailRecipient === "both") 
                      ? (orderForEmail?.client?.additional_emails || []) 
                      : []
                    const catererEmails = (emailRecipient === "caterer" || emailRecipient === "both") 
                      ? (orderForEmail?.caterer_details?.additional_emails || []) 
                      : []
                    const allFriendEmails = [...clientEmails, ...catererEmails]
                    
                    if (allFriendEmails.length > 0) {
                      return (
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Include Friend Emails (CC)
                          </Label>
                          <div className="space-y-2 rounded-lg bg-muted/30 p-3">
                            {clientEmails.length > 0 && (emailRecipient === "client" || emailRecipient === "both") && (
                              <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">Client's Friends:</span>
                                {clientEmails.map((email) => (
                                  <label key={email} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={selectedFriendEmails.has(email)}
                                      onCheckedChange={(checked) => {
                                        const newSet = new Set(selectedFriendEmails)
                                        if (checked) {
                                          newSet.add(email)
                                        } else {
                                          newSet.delete(email)
                                        }
                                        setSelectedFriendEmails(newSet)
                                      }}
                                    />
                                    <span className="text-sm">{email}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                            {catererEmails.length > 0 && (emailRecipient === "caterer" || emailRecipient === "both") && (
                              <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground">Caterer's Friends:</span>
                                {catererEmails.map((email) => (
                                  <label key={email} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={selectedFriendEmails.has(email)}
                                      onCheckedChange={(checked) => {
                                        const newSet = new Set(selectedFriendEmails)
                                        if (checked) {
                                          newSet.add(email)
                                        } else {
                                          newSet.delete(email)
                                        }
                                        setSelectedFriendEmails(newSet)
                                      }}
                                    />
                                    <span className="text-sm">{email}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Manual CC Emails */}
                  <div className="space-y-2">
                    <Label htmlFor="manualCc">
                      Additional CC Emails
                      <span className="text-xs text-muted-foreground ml-2">(comma-separated, optional)</span>
                    </Label>
                    <Input
                      id="manualCc"
                      type="text"
                      placeholder="email1@example.com, email2@example.com"
                      value={manualCcEmails}
                      onChange={(e) => setManualCcEmails(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      These emails will receive a copy of the email but won't be saved.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setEmailDialogOpen(false)
                    setSelectedFriendEmails(new Set())
                    setManualCcEmails("")
                  }} disabled={isSendingEmail}>
                    Cancel
                  </Button>
                  <Button onClick={confirmEmailSend} disabled={isSendingEmail} className="gap-2">
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Email
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Cost Dialog */}
            <Dialog open={costDialogOpen} onOpenChange={(open) => {
              if (!open) {
                setCostDialogOpen(false)
                setOrderForCost(null)
                setCostInput("")
              }
            }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Edit Order Cost
                  </DialogTitle>
                  <DialogDescription>
                    Set the cost for order {orderForCost?.order_number}. Used to compute revenue (total − cost).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="costInput">Cost</Label>
                    <Input
                      id="costInput"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={costInput}
                      onChange={(e) => setCostInput(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setCostDialogOpen(false); setOrderForCost(null); setCostInput("") }} disabled={isSavingCost}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveCost} disabled={isSavingCost} className="gap-2">
                    {isSavingCost ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* PDF Preview Drawer */}
            <Drawer 
              open={pdfPreviewOpen} 
              onOpenChange={(open) => {
                setPdfPreviewOpen(open)
                if (!open) {
                  setOrderForPdf(null)
                  setPdfHtml("")
                }
              }}
              direction="right"
            >
              <DrawerContent side="right" resizable>
                <div className="flex flex-col h-full">
                  <DrawerHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <DrawerTitle className="text-2xl font-bold flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          Order Preview
                          {orderForPdf && (
                            <Badge variant="outline" className="ml-2 font-mono text-sm">
                              {orderForPdf.order_number}
                            </Badge>
                          )}
                        </DrawerTitle>
                        <DrawerDescription className="mt-1">
                          Preview of the order document • Ready for print or download
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  
                  <div className="flex-1 overflow-hidden bg-white">
                    {pdfHtml ? (
                      <iframe
                        srcDoc={pdfHtml}
                        className="w-full h-full border-0"
                        title="Order Preview"
                        style={{ minHeight: "100%" }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-4 bg-muted/20">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <div className="text-center">
                          <p className="text-sm font-medium">Loading preview...</p>
                          <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <DrawerFooter className="border-t border-border/50 pt-4 flex-shrink-0 bg-background">
                    <div className="flex flex-wrap gap-2 w-full">
                      {orderForPdf && pdfHtml && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const printWindow = window.open("", "_blank")
                              if (printWindow) {
                                printWindow.document.write(pdfHtml)
                                printWindow.document.close()
                                printWindow.focus()
                                setTimeout(() => printWindow.print(), 250)
                              }
                            }}
                            className="flex-1 min-w-[100px] gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            Print
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const newWindow = window.open("", "_blank")
                              if (newWindow) {
                                newWindow.document.write(pdfHtml)
                                newWindow.document.close()
                              }
                            }}
                            className="flex-1 min-w-[100px] gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Open in Tab
                          </Button>
                          <Button
                            onClick={() => handlePdfDownload(orderForPdf)}
                            className="flex-1 min-w-[120px] gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download PDF
                          </Button>
                        </>
                      )}
                      <DrawerClose asChild>
                        <Button variant="ghost" className="flex-1 min-w-[80px]">
                          Close
                        </Button>
                      </DrawerClose>
                    </div>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SidebarCategoryProvider>
  )
}

export default function OrderHistoryPage() {
  return <OrderHistoryContent />
}

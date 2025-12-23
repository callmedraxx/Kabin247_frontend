"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { HeaderNav } from "@/components/dashboard/header-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ShoppingCart,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Plane,
  ArrowRight,
  User,
  Eye,
  Send,
  Package,
  TrendingUp,
  Zap,
  CalendarClock,
  ChefHat,
  RefreshCw,
  Loader2,
  AlertCircle,
  CircleDot,
  UserCheck,
  Edit,
  ThumbsUp,
} from "lucide-react"
import { SidebarCategoryProvider } from "@/contexts/sidebar-context"
import { API_BASE_URL } from "@/lib/api-config"
import { toast } from "sonner"

// Order status types - imported from centralized config
import type { OrderStatus } from "@/lib/order-status-config"

// Order data structure
interface OrderClient {
  id: number
  full_name: string
  email: string
  contact_number: string
  full_address: string
}

interface OrderCaterer {
  id: number
  caterer_name: string
  caterer_number: string
  caterer_email: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
}

interface OrderAirport {
  id: number
  airport_name: string
  fbo_name: string
  airport_code_iata: string | null
  airport_code_icao: string | null
}

interface OrderItem {
  id: number
  item_name: string
  portion_size: string
  price: string | number
}

interface Order {
  id: number
  order_number: string
  client_id: number
  caterer_id: number
  airport_id: number
  delivery_date: string
  delivery_time: string
  status: OrderStatus
  order_priority: string
  order_type: string | null
  total: string | number
  created_at: string
  updated_at: string
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

// Status configuration with icons (extending the base config)
const statusConfig: Record<OrderStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  awaiting_quote: { 
    label: "Awaiting Quote", 
    color: "text-yellow-600", 
    bgColor: "bg-yellow-500/10 border-yellow-500/20",
    icon: <Clock className="h-4 w-4" />
  },
  awaiting_client_approval: { 
    label: "Awaiting Client Approval", 
    color: "text-amber-600", 
    bgColor: "bg-amber-500/10 border-amber-500/20",
    icon: <UserCheck className="h-4 w-4" />
  },
  awaiting_caterer: { 
    label: "Awaiting Caterer", 
    color: "text-blue-600", 
    bgColor: "bg-blue-500/10 border-blue-500/20",
    icon: <ChefHat className="h-4 w-4" />
  },
  caterer_confirmed: { 
    label: "Caterer Confirmed", 
    color: "text-teal-600", 
    bgColor: "bg-teal-500/10 border-teal-500/20",
    icon: <ThumbsUp className="h-4 w-4" />
  },
  in_preparation: { 
    label: "In Preparation", 
    color: "text-orange-600", 
    bgColor: "bg-orange-500/10 border-orange-500/20",
    icon: <Package className="h-4 w-4" />
  },
  ready_for_delivery: { 
    label: "Ready for Delivery", 
    color: "text-cyan-600", 
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    icon: <Plane className="h-4 w-4" />
  },
  delivered: { 
    label: "Delivered", 
    color: "text-emerald-600", 
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  paid: { 
    label: "Paid", 
    color: "text-green-600", 
    bgColor: "bg-green-500/10 border-green-500/20",
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  cancelled: { 
    label: "Cancelled", 
    color: "text-red-600", 
    bgColor: "bg-red-500/10 border-red-500/20",
    icon: <AlertCircle className="h-4 w-4" />
  },
  order_changed: { 
    label: "Order Changed", 
    color: "text-indigo-600", 
    bgColor: "bg-indigo-500/10 border-indigo-500/20",
    icon: <Edit className="h-4 w-4" />
  },
}

function DashboardContent() {
  const router = useRouter()
  const [orders, setOrders] = React.useState<Order[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)

  // Fetch orders from API
  const fetchOrders = React.useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/orders?limit=100`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`)
      }

      const data: OrdersResponse = await response.json()
      setOrders(data.orders || [])
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load orders"
      setError(errorMessage)
      if (showRefresh) {
        toast.error("Failed to refresh", { description: errorMessage })
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    fetchOrders()
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchOrders(true), 30000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  // Calculate stats
  const stats = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const needsAction = orders.filter(o => 
      o.status === "awaiting_quote" || o.status === "awaiting_caterer"
    )
    
    const inProgress = orders.filter(o => 
      o.status === "awaiting_client_approval" || 
      o.status === "in_preparation" ||
      o.status === "ready_for_delivery"
    )

    const todaysDeliveries = orders.filter(o => {
      const deliveryDate = new Date(o.delivery_date)
      deliveryDate.setHours(0, 0, 0, 0)
      return deliveryDate.getTime() === today.getTime() && o.status !== "delivered" && o.status !== "cancelled"
    })

    const urgentOrders = orders.filter(o => 
      (o.order_priority === "urgent" || o.order_priority === "high") && 
      o.status !== "delivered" && 
      o.status !== "cancelled"
    )

    const delivered = orders.filter(o => o.status === "delivered")
    const cancelled = orders.filter(o => o.status === "cancelled")

    // Status breakdown
    const statusCounts: Record<OrderStatus, number> = {
      awaiting_quote: 0,
      awaiting_client_approval: 0,
      awaiting_caterer: 0,
      caterer_confirmed: 0,
      in_preparation: 0,
      ready_for_delivery: 0,
      delivered: 0,
      paid: 0,
      cancelled: 0,
      order_changed: 0,
    } as Record<OrderStatus, number>
    orders.forEach(o => {
      if (statusCounts[o.status] !== undefined) {
        statusCounts[o.status]++
      }
    })

    return {
      total: orders.length,
      needsAction: needsAction.length,
      needsActionOrders: needsAction.slice(0, 5),
      inProgress: inProgress.length,
      inProgressOrders: inProgress.slice(0, 5),
      todaysDeliveries: todaysDeliveries.length,
      todaysDeliveriesOrders: todaysDeliveries.slice(0, 5),
      urgent: urgentOrders.length,
      urgentOrders: urgentOrders.slice(0, 5),
      delivered: delivered.length,
      cancelled: cancelled.length,
      statusCounts,
    }
  }, [orders])

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Format delivery date
  const formatDeliveryDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    today.setHours(0, 0, 0, 0)
    tomorrow.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)

    if (date.getTime() === today.getTime()) return "Today"
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow"
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Get status badge
  const getStatusBadge = (status: OrderStatus) => {
    const config = statusConfig[status]
    return (
      <Badge variant="outline" className={`${config.bgColor} ${config.color} text-xs`}>
        {config.label}
      </Badge>
    )
  }

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-500/10 text-red-600 border-red-500/20",
      high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      normal: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      low: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    }
    return (
      <Badge variant="outline" className={`${colors[priority] || colors.normal} text-xs capitalize`}>
        {priority}
      </Badge>
    )
  }

  // Order card component
  const OrderCard = ({ order, showPriority = false }: { order: Order; showPriority?: boolean }) => (
    <div
      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/50 transition-all cursor-pointer group"
      onClick={() => router.push(`/admin/order-status/all-orders?order=${order.id}`)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono font-semibold text-sm">{order.order_number}</span>
          {getStatusBadge(order.status)}
          {showPriority && getPriorityBadge(order.order_priority)}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {order.client?.full_name || "—"}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDeliveryDate(order.delivery_date)} {order.delivery_time}
          </span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )

  if (isLoading) {
    return (
      <SidebarCategoryProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <HeaderNav title="Dashboard" />
            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="border-border/50">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {[1, 2].map((i) => (
                  <Card key={i} className="border-border/50">
                    <CardHeader>
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[1, 2, 3].map((j) => (
                        <Skeleton key={j} className="h-16 w-full" />
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </SidebarCategoryProvider>
    )
  }

  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <HeaderNav title="Dashboard" />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
            {/* Quick Actions Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Order Overview</h2>
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Updated {formatRelativeTime(lastUpdated.toISOString())}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
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
                <Button size="sm" asChild className="gap-2">
                  <Link href="/admin/pos">
                    <Plus className="h-4 w-4" />
                    New Order
                  </Link>
                </Button>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <p className="font-medium">Error loading orders</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => fetchOrders()} className="mt-3">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards - Focused on Order Management */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Needs Action - Most Important */}
              <Card className={`border-2 ${stats.needsAction > 0 ? "border-yellow-500/50 bg-yellow-500/5" : "border-border/50"}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Needs Action</CardTitle>
                  <div className={`p-2 rounded-full ${stats.needsAction > 0 ? "bg-yellow-500/20" : "bg-muted"}`}>
                    <AlertTriangle className={`h-4 w-4 ${stats.needsAction > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${stats.needsAction > 0 ? "text-yellow-600" : ""}`}>
                    {stats.needsAction}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Orders awaiting quote or caterer
                  </p>
                  {stats.needsAction > 0 && (
                    <Button variant="link" size="sm" className="p-0 h-auto mt-2 text-yellow-600" asChild>
                      <Link href="/admin/order-status/all-orders?status=awaiting_quote">
                        Process now <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* In Progress */}
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Orders being processed
                  </p>
                  <Button variant="link" size="sm" className="p-0 h-auto mt-2 text-blue-600" asChild>
                    <Link href="/admin/order-status/all-orders">
                      View all <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Today's Deliveries */}
              <Card className={`border-2 ${stats.todaysDeliveries > 0 ? "border-cyan-500/50 bg-cyan-500/5" : "border-border/50"}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today&apos;s Deliveries</CardTitle>
                  <div className={`p-2 rounded-full ${stats.todaysDeliveries > 0 ? "bg-cyan-500/20" : "bg-muted"}`}>
                    <CalendarClock className={`h-4 w-4 ${stats.todaysDeliveries > 0 ? "text-cyan-600" : "text-muted-foreground"}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${stats.todaysDeliveries > 0 ? "text-cyan-600" : ""}`}>
                    {stats.todaysDeliveries}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scheduled for today
                  </p>
                </CardContent>
              </Card>

              {/* Urgent/High Priority */}
              <Card className={`border-2 ${stats.urgent > 0 ? "border-red-500/50 bg-red-500/5" : "border-border/50"}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Urgent Orders</CardTitle>
                  <div className={`p-2 rounded-full ${stats.urgent > 0 ? "bg-red-500/20" : "bg-muted"}`}>
                    <Zap className={`h-4 w-4 ${stats.urgent > 0 ? "text-red-600" : "text-muted-foreground"}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${stats.urgent > 0 ? "text-red-600" : ""}`}>
                    {stats.urgent}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    High priority pending
                  </p>
                  {stats.urgent > 0 && (
                    <Button variant="link" size="sm" className="p-0 h-auto mt-2 text-red-600" asChild>
                      <Link href="/admin/order-status/all-orders">
                        View urgent <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Status Pipeline */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Pipeline</CardTitle>
                <CardDescription>Track orders through each stage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(statusConfig) as OrderStatus[])
                    .filter(s => s !== "cancelled")
                    .map((status, index, arr) => {
                      const config = statusConfig[status]
                      const count = stats.statusCounts[status]
                      return (
                        <React.Fragment key={status}>
                          <Link 
                            href={`/admin/order-status/all-orders?status=${status}`}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:scale-105 ${config.bgColor} ${config.color}`}
                          >
                            {config.icon}
                            <span className="text-sm font-medium">{config.label}</span>
                            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] justify-center">
                              {count}
                            </Badge>
                          </Link>
                          {index < arr.length - 1 && (
                            <div className="hidden sm:flex items-center text-muted-foreground/30">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          )}
                        </React.Fragment>
                      )
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Main Content Grid */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Orders Needing Action */}
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Needs Your Attention
                    </CardTitle>
                    <CardDescription>Orders waiting for quote or caterer assignment</CardDescription>
                  </div>
                  {stats.needsAction > 5 && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/admin/order-status/all-orders?status=awaiting_quote">
                        View All ({stats.needsAction})
                      </Link>
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {stats.needsActionOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500/50" />
                      <p className="font-medium text-green-600">All caught up!</p>
                      <p className="text-sm mt-1">No orders need immediate action</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stats.needsActionOrders.map((order) => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Today's Deliveries */}
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-cyan-600" />
                      Today&apos;s Deliveries
                    </CardTitle>
                    <CardDescription>Orders scheduled for delivery today</CardDescription>
                  </div>
                  {stats.todaysDeliveries > 5 && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/admin/order-status/all-orders">
                        View All ({stats.todaysDeliveries})
                      </Link>
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {stats.todaysDeliveriesOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No deliveries today</p>
                      <p className="text-sm mt-1">Check back later or view all orders</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stats.todaysDeliveriesOrders.map((order) => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Urgent Orders */}
              {stats.urgent > 0 && (
                <Card className="border-red-500/30 bg-red-500/5">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2 text-red-600">
                        <Zap className="h-4 w-4" />
                        Urgent & High Priority
                      </CardTitle>
                      <CardDescription>Orders that need priority handling</CardDescription>
                    </div>
                    {stats.urgent > 5 && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/order-status/all-orders">
                          View All ({stats.urgent})
                        </Link>
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.urgentOrders.map((order) => (
                        <OrderCard key={order.id} order={order} showPriority />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* In Progress Orders */}
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      In Progress
                    </CardTitle>
                    <CardDescription>Orders currently being processed</CardDescription>
                  </div>
                  {stats.inProgress > 5 && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/admin/order-status/all-orders">
                        View All ({stats.inProgress})
                      </Link>
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {stats.inProgressOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No orders in progress</p>
                      <p className="text-sm mt-1">Create a new order to get started</p>
                      <Button size="sm" className="mt-4" asChild>
                        <Link href="/admin/pos">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Order
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stats.inProgressOrders.map((order) => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats Footer */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Orders</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <ShoppingCart className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-emerald-500/5">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Delivered</p>
                      <p className="text-2xl font-bold text-emerald-600">{stats.delivered}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-emerald-500/30" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-red-500/5">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Cancelled</p>
                      <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-500/30" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SidebarCategoryProvider>
  )
}

export default function DashboardPage() {
  return <DashboardContent />
}

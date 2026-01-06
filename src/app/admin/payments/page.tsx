"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { SidebarCategoryProvider } from "@/contexts/sidebar-context"
import { HeaderNav } from "@/components/dashboard/header-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CreditCard,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
} from "lucide-react"
import { PaymentButton } from "@/components/payments/payment-button"
import { PaymentHistory } from "@/components/payments/payment-history"
import { apiCallJson, getAccessToken } from "@/lib/api-client"
import { getOrderPayments } from "@/lib/payment-api"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"

interface Order {
  id: number
  order_number: string
  client_name: string
  total: number | string
  status: string
  delivery_date: string
  client_id?: number
}

export default function PaymentsPage() {
  const { isAuthenticated, user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Fetch eligible orders (delivered, not paid)
  const fetchEligibleOrders = async () => {
    try {
      setLoading(true)
      const token = getAccessToken()
      const response = await apiCallJson<{
        orders: Order[]
        total: number
        page: number
        limit: number
      }>("/orders?status=delivered&limit=1000", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Filter out paid orders
      const eligibleOrders = response.orders.filter(
        (order) => order.status !== "paid"
      )
      setOrders(eligibleOrders)
    } catch (error: any) {
      console.error("Failed to fetch orders:", error)
      toast.error("Failed to load orders", {
        description: error.message || "Please try again later",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      fetchEligibleOrders()
    }
  }, [isAuthenticated, user])

  const loadPaymentHistory = async (orderId: number) => {
    if (selectedOrder === orderId && paymentHistory.length > 0) {
      return // Already loaded
    }

    setLoadingHistory(true)
    try {
      const response = await getOrderPayments(orderId)
      setPaymentHistory(response.transactions)
      setSelectedOrder(orderId)
    } catch (error: any) {
      console.error("Failed to load payment history:", error)
      toast.error("Failed to load payment history")
    } finally {
      setLoadingHistory(false)
    }
  }

  const filteredOrders = orders.filter((order) =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isAuthenticated || user?.role !== "ADMIN") {
    return (
      <SidebarCategoryProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <HeaderNav title="Payments" />
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You must be an administrator to access this page.
              </p>
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
          <HeaderNav title="Payments" />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Payment Processing</h1>
                <p className="text-muted-foreground mt-1">
                  Process payments for delivered orders
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Eligible Orders</CardTitle>
                <CardDescription>
                  Orders that are delivered and ready for payment processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by order number or client name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No eligible orders found</p>
                    <p className="text-sm mt-2">
                      {searchQuery
                        ? "Try adjusting your search query"
                        : "Orders must be delivered to be eligible for payment"}
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Delivery Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {order.order_number}
                            </TableCell>
                            <TableCell>{order.client_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold">
                                  ${parseFloat(order.total.toString()).toFixed(2)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {new Date(order.delivery_date).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{order.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => loadPaymentHistory(order.id)}
                                >
                                  View History
                                </Button>
                                <PaymentButton
                                  orderId={order.id}
                                  orderNumber={order.order_number}
                                  amount={parseFloat(order.total.toString())}
                                  clientId={order.client_id}
                                  onPaymentSuccess={() => {
                                    fetchEligibleOrders()
                                    if (selectedOrder === order.id) {
                                      loadPaymentHistory(order.id)
                                    }
                                  }}
                                  size="sm"
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedOrder && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>
                    Payment transactions for order {orders.find((o) => o.id === selectedOrder)?.order_number}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <PaymentHistory transactions={paymentHistory} />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SidebarCategoryProvider>
  )
}


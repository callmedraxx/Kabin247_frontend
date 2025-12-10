"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import {
  Plus,
  Edit,
  Trash2,
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
  Package,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  UtensilsCrossed,
  Copy,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"

import { API_BASE_URL } from "@/lib/api-config"

// Order status types
export type OrderStatus = 
  | "awaiting_quote"
  | "awaiting_caterer"
  | "quote_sent"
  | "quote_approved"
  | "in_preparation"
  | "ready_for_delivery"
  | "delivered"
  | "cancelled"

// Order data structure matching API response
interface OrderItem {
  id?: number
  order_id?: number
  menu_item_id?: number
  item_name: string
  item_description?: string | null
  portion_size: string
  price: string | number
  sort_order?: number
  created_at?: string
}

interface OrderClient {
  id: number
  full_name: string
  full_address: string
  email: string
  contact_number: string
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
  fbo_email: string | null
  fbo_phone: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
}

interface Order {
  id: number
  order_number: string
  client_id: number
  caterer_id: number
  airport_id: number
  aircraft_tail_number: string | null
  delivery_date: string
  delivery_time: string
  status: OrderStatus
  order_priority: string
  order_type: string | null
  payment_method: string
  description: string | null
  notes: string | null
  reheating_instructions: string | null
  packaging_instructions: string | null
  dietary_restrictions: string | null
  service_charge: string | number
  delivery_fee: string | number | null
  subtotal: string | number
  total: string | number
  items?: OrderItem[]
  client?: OrderClient
  caterer_details?: OrderCaterer
  airport_details?: OrderAirport
  created_at: string
  updated_at: string
  completed_at?: string | null
}

// API Response types
interface OrdersResponse {
  orders: Order[]
  total: number
  page?: number
  limit: number
}

// Status options with labels and colors
const statusOptions: Array<{ value: OrderStatus; label: string; color: string }> = [
  { value: "awaiting_quote", label: "Awaiting Quote", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  { value: "awaiting_caterer", label: "Awaiting Caterer", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "quote_sent", label: "Quote Sent", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { value: "quote_approved", label: "Quote Approved", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  { value: "in_preparation", label: "In Preparation", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { value: "ready_for_delivery", label: "Ready for Delivery", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  { value: "delivered", label: "Delivered", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500/10 text-red-600 border-red-500/20" },
]

// Form schema for editing orders
const orderSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  caterer: z.string().min(1, "Caterer is required"),
  airport: z.string().min(1, "Airport is required"),
  aircraftTailNumber: z.string().optional(),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  deliveryTime: z.string().min(1, "Delivery time is required"),
  status: z.enum([
    "awaiting_quote",
    "awaiting_caterer",
    "quote_sent",
    "quote_approved",
    "in_preparation",
    "ready_for_delivery",
    "delivered",
    "cancelled",
  ]),
  description: z.string().optional(),
  reheatingInstructions: z.string().optional(),
  packagingInstructions: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  serviceCharge: z.string().optional(),
  paymentMethod: z.enum(["card", "ACH"]),
})

type OrderFormValues = z.infer<typeof orderSchema>

function OrdersContent() {
  const router = useRouter()
  const [orders, setOrders] = React.useState<Order[]>([])
  const [selectedOrders, setSelectedOrders] = React.useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "all">("all")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Pagination state
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(50)
  const [total, setTotal] = React.useState(0)
  const [sortBy, setSortBy] = React.useState<string>("created_at")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")
  
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null)
  const [viewDrawerOpen, setViewDrawerOpen] = React.useState(false)
  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null)
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false)
  const [orderForStatusUpdate, setOrderForStatusUpdate] = React.useState<Order | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false)
  const [orderForEmail, setOrderForEmail] = React.useState<Order | null>(null)
  const [emailRecipient, setEmailRecipient] = React.useState<"client" | "caterer" | "both">("client")
  const [isSendingEmail, setIsSendingEmail] = React.useState(false)
  const [customClientMessage, setCustomClientMessage] = React.useState("")
  const [customCatererMessage, setCustomCatererMessage] = React.useState("")
  const [pdfPreviewOpen, setPdfPreviewOpen] = React.useState(false)
  const [orderForPdf, setOrderForPdf] = React.useState<Order | null>(null)
  const [pdfHtml, setPdfHtml] = React.useState<string>("")

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      clientName: "",
      caterer: "",
      airport: "",
      aircraftTailNumber: "",
      deliveryDate: "",
      deliveryTime: "",
      status: "awaiting_quote",
      description: "",
      reheatingInstructions: "",
      packagingInstructions: "",
      dietaryRestrictions: "",
      serviceCharge: "",
      paymentMethod: "card",
    },
  })

  // Fetch orders from API
  const fetchOrders = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim())
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      params.append("sortBy", sortBy)
      params.append("sortOrder", sortOrder)
      params.append("page", page.toString())
      params.append("limit", limit.toString())

      const response = await fetch(`${API_BASE_URL}/orders?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch orders" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: OrdersResponse = await response.json()
      setOrders(data.orders)
      setTotal(data.total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch orders"
      setError(errorMessage)
      toast.error("Error loading orders", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, statusFilter, sortBy, sortOrder, page, limit])

  // Fetch orders on mount and when dependencies change
  React.useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to first page on search
      fetchOrders()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(orders.map((o) => o.id)))
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
  const handleView = async (order: Order) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${order.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch order details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: Order = await response.json()
      setViewingOrder(data)
      setViewDrawerOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch order details"
      toast.error("Error loading order details", {
        description: errorMessage,
      })
    }
  }

  // Handle duplicate order - navigate to POS with pre-filled data
  const handleDuplicate = async (order: Order) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${order.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch order details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const fullOrder: Order = await response.json()
      
      // Store order data in sessionStorage for the POS page to pick up
      const duplicateData = {
        client_id: fullOrder.client_id,
        caterer_id: fullOrder.caterer_id,
        airport_id: fullOrder.airport_id,
        aircraft_tail_number: fullOrder.aircraft_tail_number,
        order_priority: fullOrder.order_priority,
        order_type: fullOrder.order_type,
        payment_method: fullOrder.payment_method,
        service_charge: fullOrder.service_charge,
        delivery_fee: fullOrder.delivery_fee,
        description: fullOrder.description,
        notes: fullOrder.notes,
        reheating_instructions: fullOrder.reheating_instructions,
        packaging_instructions: fullOrder.packaging_instructions,
        dietary_restrictions: fullOrder.dietary_restrictions,
        items: fullOrder.items?.map(item => ({
          itemName: item.menu_item_id?.toString() || "",
          itemDescription: item.item_description || "",
          portionSize: item.portion_size,
          price: String(item.price),
        })) || [],
      }
      
      sessionStorage.setItem("duplicateOrder", JSON.stringify(duplicateData))
      
      toast.success("Order data loaded", {
        description: "Redirecting to create a new order...",
      })
      
      router.push("/admin/pos?duplicate=true")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to duplicate order"
      toast.error("Error duplicating order", {
        description: errorMessage,
      })
    }
  }

  // Handle edit
  const handleEdit = async (order: Order) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${order.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch order details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const fullOrder: Order = await response.json()
      setEditingOrder(fullOrder)
      
      form.reset({
        clientName: fullOrder.client_id.toString(),
        caterer: fullOrder.caterer_id.toString(),
        airport: fullOrder.airport_id.toString(),
        aircraftTailNumber: fullOrder.aircraft_tail_number || "",
        deliveryDate: fullOrder.delivery_date,
        deliveryTime: fullOrder.delivery_time,
        status: fullOrder.status,
        description: fullOrder.description || "",
        reheatingInstructions: fullOrder.reheating_instructions || "",
        packagingInstructions: fullOrder.packaging_instructions || "",
        dietaryRestrictions: fullOrder.dietary_restrictions || "",
        serviceCharge: fullOrder.service_charge.toString(),
        paymentMethod: fullOrder.payment_method as "card" | "ACH",
      })
      setDialogOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch order details"
      toast.error("Error loading order", {
        description: errorMessage,
      })
    }
  }

  // Handle save (edit only, as orders are created from POS)
  const handleSave = async (values: OrderFormValues) => {
    if (!editingOrder) return

    try {
      const body: any = {
        client_id: parseInt(values.clientName),
        caterer_id: parseInt(values.caterer),
        airport_id: parseInt(values.airport),
        delivery_date: values.deliveryDate,
        delivery_time: values.deliveryTime,
        order_priority: editingOrder.order_priority,
        payment_method: values.paymentMethod,
        status: values.status,
      }

      if (values.aircraftTailNumber) {
        body.aircraft_tail_number = values.aircraftTailNumber
      }
      if (values.description) {
        body.description = values.description
      }
      if (values.reheatingInstructions) {
        body.reheating_instructions = values.reheatingInstructions
      }
      if (values.packagingInstructions) {
        body.packaging_instructions = values.packagingInstructions
      }
      if (values.dietaryRestrictions) {
        body.dietary_restrictions = values.dietaryRestrictions
      }
      if (values.serviceCharge) {
        body.service_charge = parseFloat(values.serviceCharge)
      }

      const response = await fetch(`${API_BASE_URL}/orders/${editingOrder.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update order" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast.success("Order updated", {
        description: `Order ${editingOrder.order_number} has been updated successfully.`,
      })

      setDialogOpen(false)
      setEditingOrder(null)
      form.reset()
      fetchOrders()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update order"
      toast.error("Error updating order", {
        description: errorMessage,
      })
    }
  }

  // Handle delete
  const handleDelete = (order: Order) => {
    setOrderToDelete(order)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!orderToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete order" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast.success("Order deleted", {
        description: `Order ${orderToDelete.order_number} has been deleted successfully.`,
      })

      setDeleteDialogOpen(false)
      setOrderToDelete(null)
      setSelectedOrders((prev) => {
        const newSet = new Set(prev)
        newSet.delete(orderToDelete.id)
        return newSet
      })
      fetchOrders()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete order"
      toast.error("Error deleting order", {
        description: errorMessage,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedOrders.size === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: Array.from(selectedOrders),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete orders" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      toast.success("Orders deleted", {
        description: `${data.deleted || selectedOrders.size} order(s) have been deleted successfully.`,
      })

      setSelectedOrders(new Set())
      fetchOrders()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete orders"
      toast.error("Error deleting orders", {
        description: errorMessage,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle status update
  const handleStatusUpdate = (order: Order) => {
    setOrderForStatusUpdate(order)
    setStatusDialogOpen(true)
  }

  const confirmStatusUpdate = async (newStatus: OrderStatus) => {
    if (!orderForStatusUpdate) return

    setIsUpdatingStatus(true)
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderForStatusUpdate.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update status" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast.success("Status updated", {
        description: `Order ${orderForStatusUpdate.order_number} status has been updated to ${statusOptions.find(s => s.value === newStatus)?.label}.`,
      })

      setStatusDialogOpen(false)
      setOrderForStatusUpdate(null)
      fetchOrders()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update status"
      toast.error("Error updating status", {
        description: errorMessage,
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle PDF preview
  const handlePdfPreview = async (order: Order) => {
    setOrderForPdf(order)
    setPdfPreviewOpen(true)
    setPdfHtml("") // Reset while loading
    
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${order.id}/preview`)
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = "Failed to load preview"
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      // The endpoint returns JSON with html property
      const data = await response.json()
      const html = data.html || ""
      setPdfHtml(html)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load preview"
      setPdfPreviewOpen(false)
      setOrderForPdf(null)
      toast.error("Error loading preview", {
        description: errorMessage,
      })
    }
  }

  // Handle PDF download
  const handlePdfDownload = async (order: Order) => {
    toast.loading("Generating PDF...", { id: `pdf-${order.id}` })
    
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${order.id}/pdf`)
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = "Failed to download PDF"
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
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

  // Handle email send
  const handleEmailSend = (order: Order) => {
    setOrderForEmail(order)
    setCustomClientMessage("")
    setCustomCatererMessage("")
    setEmailRecipient("client")
    setEmailDialogOpen(true)
  }

  const confirmEmailSend = async () => {
    if (!orderForEmail) return

    setIsSendingEmail(true)
    try {
      // Determine endpoint and payload based on recipient
      let endpoint = ""
      let body: Record<string, string> = {}

      if (emailRecipient === "client") {
        endpoint = `${API_BASE_URL}/orders/${orderForEmail.id}/send-to-client`
        if (customClientMessage.trim()) {
          body.custom_message = customClientMessage.trim()
        }
      } else if (emailRecipient === "caterer") {
        endpoint = `${API_BASE_URL}/orders/${orderForEmail.id}/send-to-caterer`
        if (customCatererMessage.trim()) {
          body.custom_message = customCatererMessage.trim()
        }
      } else {
        // both
        endpoint = `${API_BASE_URL}/orders/${orderForEmail.id}/send-to-both`
        if (customClientMessage.trim()) {
          body.custom_client_message = customClientMessage.trim()
        }
        if (customCatererMessage.trim()) {
          body.custom_caterer_message = customCatererMessage.trim()
        }
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to send email" }))
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      const recipientLabel = emailRecipient === "both" 
        ? "client and caterer" 
        : emailRecipient === "client" 
          ? orderForEmail.client?.email || "client"
          : orderForEmail.caterer_details?.caterer_email || "caterer"

      toast.success("Email sent successfully", {
        description: `Order ${orderForEmail.order_number} has been sent to ${recipientLabel}.`,
      })

      setEmailDialogOpen(false)
      setOrderForEmail(null)
      setCustomClientMessage("")
      setCustomCatererMessage("")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send email"
      toast.error("Error sending email", {
        description: errorMessage,
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Handle sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  // Get status badge
  const getStatusBadge = (status: OrderStatus | "completed") => {
    const normalizedStatus: OrderStatus = status === "completed" ? "delivered" : status
    const statusOption = statusOptions.find((s) => s.value === normalizedStatus)
    return (
      <Badge className={statusOption?.color || ""} variant="outline">
        {statusOption?.label || normalizedStatus}
      </Badge>
    )
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const allSelected = orders.length > 0 && selectedOrders.size === orders.length
  const someSelected = selectedOrders.size > 0 && selectedOrders.size < orders.length
  const totalPages = Math.ceil(total / limit)

  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <HeaderNav title="Orders" />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
            {/* Header Card */}
            <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Order Management
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      View and manage all orders, track status, and communicate with clients and caterers
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedOrders.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className="gap-2 shadow-md hover:shadow-lg transition-all"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete Selected ({selectedOrders.size})
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search orders by number, client, caterer, airport..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-9 h-10 bg-background/50 border-border/50 focus:bg-background transition-colors"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | "all")}>
                    <SelectTrigger className="w-full md:w-[200px] h-10">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Error State */}
            {error && !isLoading && (
              <Card className="border-destructive/50 bg-destructive/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <p className="font-medium">Error loading orders</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchOrders}
                    className="mt-4"
                  >
                    <Loader2 className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Table Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto scrollbar-hide">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </TableHead>
                        <TableHead className="font-semibold">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 -ml-3 hover:bg-transparent"
                            onClick={() => handleSort("order_number")}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              Order #
                            </div>
                            {sortBy === "order_number" && (
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 -ml-3 hover:bg-transparent"
                            onClick={() => handleSort("client_name")}
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              Client
                            </div>
                            {sortBy === "client_name" && (
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            Caterer
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Plane className="h-4 w-4 text-muted-foreground" />
                            Airport
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 -ml-3 hover:bg-transparent"
                            onClick={() => handleSort("delivery_date")}
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              Delivery
                            </div>
                            {sortBy === "delivery_date" && (
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            Status
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            Type
                          </div>
                        </TableHead>
                        <TableHead className="w-12 text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        // Skeleton loaders
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Skeleton className="h-4 w-4" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[120px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[150px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[150px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[180px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[100px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[120px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[50px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[40px]" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <ShoppingCart className="h-8 w-8 opacity-50" />
                              <p className="text-sm font-medium">No orders found</p>
                              <p className="text-xs">
                                {searchQuery || statusFilter !== "all"
                                  ? "Try adjusting your search or filter"
                                  : "Orders will appear here once created"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        orders.map((order) => (
                          <TableRow
                            key={order.id}
                            className="group hover:bg-muted/30 transition-colors border-b border-border/30"
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedOrders.has(order.id)}
                                onCheckedChange={(checked) =>
                                  handleSelect(order.id, checked as boolean)
                                }
                                aria-label={`Select ${order.order_number}`}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="truncate max-w-[120px]" title={order.order_number}>
                                <span className="font-mono text-sm">{order.order_number}</span>
                              </div>
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
                            <TableCell className="max-w-[120px]">
                              <div className="flex flex-col gap-0.5">
                                <div className="text-xs text-muted-foreground truncate">
                                  {new Date(order.delivery_date).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {order.delivery_time}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(order.status)}
                            </TableCell>
                            <TableCell>
                              {order.order_type ? (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs font-mono ${
                                    order.order_type === "QE" 
                                      ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
                                      : order.order_type === "Serv"
                                      ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  }`}
                                >
                                  {order.order_type}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-muted transition-colors"
                                  >
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleView(order)}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handlePdfPreview(order)}
                                    className="cursor-pointer"
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Preview PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handlePdfDownload(order)}
                                    className="cursor-pointer"
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEmailSend(order)}
                                    className="cursor-pointer"
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send Email
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleStatusUpdate(order)}
                                    className="cursor-pointer"
                                  >
                                    <Package className="mr-2 h-4 w-4" />
                                    Update Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(order)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDuplicate(order)}
                                    className="cursor-pointer"
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate Order
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(order)}
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
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
                
                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border/50 px-4 py-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} orders
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* View Details Drawer */}
            <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
              <DrawerContent>
                <div className="flex flex-col h-full">
                  <DrawerHeader className="flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25">
                          <ShoppingCart className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <DrawerTitle>
                          Order {viewingOrder?.order_number}
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
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Order Number
                                </Label>
                                <p className="text-sm font-mono font-medium">{viewingOrder.order_number}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Status
                                </Label>
                                {getStatusBadge(viewingOrder.status)}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Delivery Date
                                </Label>
                                <p className="text-sm font-medium">{formatDate(viewingOrder.delivery_date)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Delivery Time
                                </Label>
                                <p className="text-sm font-medium">{viewingOrder.delivery_time}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Order Priority
                                </Label>
                                <Badge variant="outline" className="capitalize">
                                  {viewingOrder.order_priority}
                                </Badge>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Payment Method
                                </Label>
                                <Badge variant="outline" className="uppercase">
                                  {viewingOrder.payment_method}
                                </Badge>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Order Type
                                </Label>
                                {viewingOrder.order_type ? (
                                  <Badge 
                                    variant="outline" 
                                    className={`font-mono ${
                                      viewingOrder.order_type === "QE" 
                                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
                                        : viewingOrder.order_type === "Serv"
                                        ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    }`}
                                  >
                                    {viewingOrder.order_type}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Delivery Fee
                                </Label>
                                <p className="text-sm font-medium">
                                  ${typeof viewingOrder.delivery_fee === "number" 
                                    ? viewingOrder.delivery_fee.toFixed(2) 
                                    : viewingOrder.delivery_fee 
                                    ? parseFloat(viewingOrder.delivery_fee).toFixed(2) 
                                    : "0.00"}
                                </p>
                              </div>
                            </div>
                            {viewingOrder.aircraft_tail_number && (
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Aircraft Tail Number
                                </Label>
                                <p className="text-sm font-mono font-medium">{viewingOrder.aircraft_tail_number}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Client Information Card */}
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
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Full Name
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.client.full_name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Email
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.client.email}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Contact Number
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.client.contact_number || "—"}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Address
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.client.full_address}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Caterer Information Card */}
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
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Caterer Name
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.caterer_details.caterer_name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Phone Number
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.caterer_details.caterer_number}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Email
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.caterer_details.caterer_email || "—"}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Airport Codes
                                  </Label>
                                  <div className="flex gap-2">
                                    {viewingOrder.caterer_details.airport_code_iata && (
                                      <Badge variant="outline">{viewingOrder.caterer_details.airport_code_iata}</Badge>
                                    )}
                                    {viewingOrder.caterer_details.airport_code_icao && (
                                      <Badge variant="secondary">{viewingOrder.caterer_details.airport_code_icao}</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Airport Information Card */}
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
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Airport Name
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.airport_details.airport_name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    FBO Name
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.airport_details.fbo_name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    FBO Email
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.airport_details.fbo_email || "—"}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    FBO Phone
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.airport_details.fbo_phone || "—"}</p>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Airport Codes
                                </Label>
                                <div className="flex gap-2">
                                  {viewingOrder.airport_details.airport_code_iata && (
                                    <Badge variant="outline">{viewingOrder.airport_details.airport_code_iata}</Badge>
                                  )}
                                  {viewingOrder.airport_details.airport_code_icao && (
                                    <Badge variant="secondary">{viewingOrder.airport_details.airport_code_icao}</Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Order Items Card */}
                        {viewingOrder.items && viewingOrder.items.length > 0 && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <UtensilsCrossed className="h-5 w-5 text-emerald-500" />
                                Order Items ({viewingOrder.items.length})
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {viewingOrder.items.map((item, index) => (
                                  <div key={item.id || index} className="flex justify-between items-center p-3 border border-border/50 rounded-lg">
                                    <div>
                                      <p className="text-sm font-medium">{item.item_name}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">Qty: {item.portion_size}</Badge>
                                        {item.item_description && (
                                          <span className="text-xs text-muted-foreground">{item.item_description}</span>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-sm font-medium">${parseFloat(String(item.price)).toFixed(2)}</p>
                                  </div>
                                ))}
                                <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal:</span>
                                    <span className="font-medium">${parseFloat(String(viewingOrder.subtotal)).toFixed(2)}</span>
                                  </div>
                                  {parseFloat(String(viewingOrder.service_charge)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Service Charge:</span>
                                      <span className="font-medium">${parseFloat(String(viewingOrder.service_charge)).toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-border/50">
                                    <span>Total:</span>
                                    <span className="text-primary">${parseFloat(String(viewingOrder.total)).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Additional Information */}
                        {(viewingOrder.description ||
                          viewingOrder.notes ||
                          viewingOrder.reheating_instructions ||
                          viewingOrder.packaging_instructions ||
                          viewingOrder.dietary_restrictions) && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Package className="h-5 w-5 text-amber-500" />
                                Additional Information
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {viewingOrder.description && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Description
                                  </Label>
                                  <p className="text-sm font-medium break-words">{viewingOrder.description}</p>
                                </div>
                              )}
                              {viewingOrder.notes && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Notes
                                  </Label>
                                  <p className="text-sm font-medium break-words">{viewingOrder.notes}</p>
                                </div>
                              )}
                              {viewingOrder.reheating_instructions && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Reheating Instructions
                                  </Label>
                                  <p className="text-sm font-medium break-words">{viewingOrder.reheating_instructions}</p>
                                </div>
                              )}
                              {viewingOrder.packaging_instructions && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Packaging Instructions
                                  </Label>
                                  <p className="text-sm font-medium break-words">{viewingOrder.packaging_instructions}</p>
                                </div>
                              )}
                              {viewingOrder.dietary_restrictions && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Dietary Restrictions
                                  </Label>
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
                          if (viewingOrder) {
                            handlePdfPreview(viewingOrder)
                          }
                        }}
                        className="flex-1 min-w-[120px] gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (viewingOrder) {
                            handlePdfDownload(viewingOrder)
                          }
                        }}
                        className="flex-1 min-w-[120px] gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (viewingOrder) {
                            handleEmailSend(viewingOrder)
                          }
                        }}
                        className="flex-1 min-w-[120px] gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (viewingOrder) {
                            handleEdit(viewingOrder)
                            setViewDrawerOpen(false)
                          }
                        }}
                        className="flex-1 min-w-[100px] gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <DrawerClose asChild>
                        <Button className="flex-1 min-w-[100px]">Close</Button>
                      </DrawerClose>
                    </div>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>

            {/* Edit Order Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-hide">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Edit Order</DialogTitle>
                  <DialogDescription>
                    Update the order information below.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="clientName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter client name..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="caterer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Caterer *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter caterer name..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="airport"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Airport *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter airport..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="aircraftTailNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Aircraft Tail Number</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., N123AB" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="deliveryDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Delivery Date *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="deliveryTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Delivery Time *</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {statusOptions.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                      {status.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Method *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select payment method..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="card">Card</SelectItem>
                                  <SelectItem value="ACH">ACH</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter description..." rows={3} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="reheatingInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reheating Instructions</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter reheating instructions..." rows={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="packagingInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Packaging Instructions</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter packaging instructions..." rows={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dietaryRestrictions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dietary Restrictions</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter dietary restrictions..." rows={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="serviceCharge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Charge</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false)
                          setEditingOrder(null)
                          form.reset()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Update Order
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Status Update Dialog */}
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Order Status</DialogTitle>
                  <DialogDescription>
                    Select a new status for order {orderForStatusUpdate?.order_number}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-4">
                  {statusOptions.map((status) => (
                    <Button
                      key={status.value}
                      variant={orderForStatusUpdate?.status === status.value ? "default" : "outline"}
                      onClick={() => confirmStatusUpdate(status.value)}
                      disabled={isUpdatingStatus || orderForStatusUpdate?.status === status.value}
                      className="justify-start"
                    >
                      {isUpdatingStatus && orderForStatusUpdate?.status === status.value ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      {status.label}
                    </Button>
                  ))}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatusDialogOpen(false)
                      setOrderForStatusUpdate(null)
                    }}
                    disabled={isUpdatingStatus}
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Email Send Dialog */}
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Send Order via Email
                  </DialogTitle>
                  <DialogDescription>
                    Send order {orderForEmail?.order_number} to the selected recipient(s). 
                    The email will include the order PDF and use a template based on the current order status ({orderForEmail?.status?.replace(/_/g, " ")}).
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

                  {/* Custom message for client */}
                  {(emailRecipient === "client" || emailRecipient === "both") && (
                    <div className="space-y-2">
                      <Label htmlFor="clientMessage">
                        Custom Message for Client
                        <span className="text-xs text-muted-foreground ml-2">(optional - overrides template body)</span>
                      </Label>
                      <Textarea
                        id="clientMessage"
                        placeholder="Leave empty to use the default template message..."
                        value={customClientMessage}
                        onChange={(e) => setCustomClientMessage(e.target.value)}
                        className="min-h-[100px] resize-none"
                      />
                      {orderForEmail?.client?.email && (
                        <p className="text-xs text-muted-foreground">
                          Will be sent to: {orderForEmail.client.email}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Custom message for caterer */}
                  {(emailRecipient === "caterer" || emailRecipient === "both") && (
                    <div className="space-y-2">
                      <Label htmlFor="catererMessage">
                        Custom Message for Caterer
                        <span className="text-xs text-muted-foreground ml-2">(optional - overrides template body)</span>
                      </Label>
                      <Textarea
                        id="catererMessage"
                        placeholder="Leave empty to use the default template message..."
                        value={customCatererMessage}
                        onChange={(e) => setCustomCatererMessage(e.target.value)}
                        className="min-h-[100px] resize-none"
                      />
                      {orderForEmail?.caterer_details?.caterer_email && (
                        <p className="text-xs text-muted-foreground">
                          Will be sent to: {orderForEmail.caterer_details.caterer_email}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Note:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>The order PDF will be automatically attached to the email</li>
                      <li>Email subject is determined by the order status template</li>
                      <li>Custom messages will override the template body only</li>
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={isSendingEmail}>
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
                  
                  {/* Preview Content */}
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

                  {/* Footer Actions */}
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
                              // Open in new tab
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
                    {orderForPdf?.client?.full_name && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Client: {orderForPdf.client.full_name}
                      </p>
                    )}
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Delete Order
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete order{" "}
                    <span className="font-semibold text-foreground">
                      {orderToDelete?.order_number}
                    </span>
                    ? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false)
                      setOrderToDelete(null)
                    }}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="gap-2"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SidebarCategoryProvider>
  )
}

export default function AllOrdersPage() {
  return <OrdersContent />
}


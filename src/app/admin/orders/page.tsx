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
import { Skeleton } from "@/components/ui/skeleton"
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
import { Combobox } from "@/components/ui/combobox"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Edit,
  Trash2,
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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  CreditCard,
  Building2,
  UtensilsCrossed,
} from "lucide-react"
import { useForm, useFieldArray } from "react-hook-form"
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
import { toast } from "sonner"

import { API_BASE_URL } from "@/lib/api-config"
import { apiCall, apiCallJson } from "@/lib/api-client"
import type { OrderStatus } from "@/lib/order-status-config"
import { getStatusOptions, getOrderStatusConfig, getStatusTooltipContent } from "@/lib/order-status-config"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useMenuItems } from "@/contexts/menu-items-context"

// Menu item interface
interface MenuItem {
  id: number
  item_name: string
  item_description: string | null
  category: string
  variants: Array<{
    id: number
    menu_item_id?: number
    portion_size: string
    price: number
    sort_order?: number
    caterer_prices?: Array<{
      caterer_id: number
      price: number
    }>
  }>
}

// Menu item form schema for creating new menu items
const menuItemFormSchema = z.object({
  item_name: z.string().min(1, "Please enter an item name"),
  item_description: z.string().optional(),
  food_type: z.enum(["veg", "non_veg"], { message: "Please select a food type" }),
  category: z.string().optional(),
  price: z.number().positive("Price must be greater than 0").optional(),
  is_active: z.boolean(),
})

type MenuItemFormValues = z.infer<typeof menuItemFormSchema>

export type { OrderStatus }

// Helper function to format date for display (MM/DD/YYYY) without timezone issues
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

interface Client {
  id: number
  full_name: string
  email: string | null
  contact_number: string | null
  full_address: string | null
  airport_code: string | null
  additional_emails?: string[]
}

interface Caterer {
  id: number
  caterer_name: string
  caterer_email: string | null
  caterer_number: string | null
  airport_code_iata?: string | null
  airport_code_icao?: string | null
  time_zone?: string | null
  additional_emails?: string[]
}

interface Airport {
  id: number
  airport_name: string
  fbo_name: string
  airport_code_iata: string | null
  airport_code_icao: string | null
}

// Get status options from centralized config
const statusOptions = getStatusOptions()

// Form schema
const orderItemSchema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  item_description: z.string().optional(),
  portion_size: z.string().min(1, "Portion size is required"),
  price: z.number().positive("Price must be greater than 0"),
})

const orderSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  caterer: z.string().min(1, "Caterer is required"),
  airport: z.string().min(1, "Airport is required"),
  aircraft_tail_number: z.string().optional(),
  delivery_date: z.string().min(1, "Delivery date is required"),
  delivery_time: z.string().min(1, "Delivery time is required"),
  order_priority: z.enum(["low", "normal", "high", "urgent"]),
  payment_method: z.enum(["card", "ACH"]),
  description: z.string().optional(),
  notes: z.string().optional(),
  reheating_instructions: z.string().optional(),
  packaging_instructions: z.string().optional(),
  dietary_restrictions: z.string().optional(),
  service_charge: z.number().min(0, "Service charge cannot be negative").optional(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
})

type OrderFormValues = z.infer<typeof orderSchema>

function OrdersContent() {
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
  
  // Dialog states
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
  const [selectedFriendEmails, setSelectedFriendEmails] = React.useState<Set<string>>(new Set())
  const [manualCcEmails, setManualCcEmails] = React.useState("")
  const [pdfPreviewOpen, setPdfPreviewOpen] = React.useState(false)
  const [orderForPdf, setOrderForPdf] = React.useState<Order | null>(null)
  const [pdfHtml, setPdfHtml] = React.useState<string>("")

  // Supporting data
  const [clients, setClients] = React.useState<Client[]>([])
  const [caterers, setCaterers] = React.useState<Caterer[]>([])
  const [airports, setAirports] = React.useState<Airport[]>([])
  const [isLoadingSupportingData, setIsLoadingSupportingData] = React.useState(false)

  // Menu items from context
  const {
    menuItems: menuItemsData,
    menuItemOptions,
    isLoading: isLoadingMenuItems,
    fetchMenuItems: fetchMenuItemsFromContext,
    getMenuItemById,
  } = useMenuItems()

  // Menu item dialog states
  const [menuItemDialogOpen, setMenuItemDialogOpen] = React.useState(false)
  const [currentItemIndex, setCurrentItemIndex] = React.useState<number | undefined>(undefined)
  const [menuItemSearch, setMenuItemSearch] = React.useState("")
  const [isSavingMenuItem, setIsSavingMenuItem] = React.useState(false)

  // Menu item form
  const menuItemForm = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      item_name: "",
      item_description: "",
      food_type: "non_veg",
      category: "",
      price: undefined,
      is_active: true,
    },
  })

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      client_name: "",
      caterer: "",
      airport: "",
      aircraft_tail_number: "",
      delivery_date: "",
      delivery_time: "",
      order_priority: "normal",
      payment_method: "card",
      description: "",
      notes: "",
      reheating_instructions: "",
      packaging_instructions: "",
      dietary_restrictions: "",
      service_charge: 0,
      items: [{ item_name: "", item_description: "", portion_size: "", price: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  // Fetch supporting data
  const fetchSupportingData = React.useCallback(async () => {
    setIsLoadingSupportingData(true)
    try {
      const [clientsRes, caterersRes, airportsRes] = await Promise.all([
        apiCall(`/clients?limit=1000`),
        apiCall(`/caterers?limit=1000`),
        apiCall(`/airports?limit=1000`),
      ])

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json()
        setClients(clientsData.clients || [])
      }

      if (caterersRes.ok) {
        const caterersData = await caterersRes.json()
        setCaterers(caterersData.caterers || [])
      }

      if (airportsRes.ok) {
        const airportsData = await airportsRes.json()
        setAirports(airportsData.airports || [])
      }
    } catch (err) {
      console.error("Error fetching supporting data:", err)
    } finally {
      setIsLoadingSupportingData(false)
    }
  }, [])

  React.useEffect(() => {
    fetchSupportingData()
  }, [fetchSupportingData])

  // Fetch menu items on mount
  React.useEffect(() => {
    fetchMenuItemsFromContext()
  }, [fetchMenuItemsFromContext])

  // Fetch menu items when search changes
  React.useEffect(() => {
    if (menuItemSearch) {
      const timer = setTimeout(() => {
        fetchMenuItemsFromContext(menuItemSearch)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [menuItemSearch, fetchMenuItemsFromContext])

  // Handler for adding new menu item
  const handleAddMenuItem = async (values: MenuItemFormValues) => {
    setIsSavingMenuItem(true)
    try {
      const newMenuItem: MenuItem = await apiCallJson<MenuItem>("/menu-items", {
        method: "POST",
        body: JSON.stringify(values),
      })

      toast.success("Menu item added", {
        description: `${newMenuItem.item_name} has been added to the system.`,
      })

      // Refresh menu items list
      await fetchMenuItemsFromContext()

      // If we have a current item index, set the new menu item as the selected item
      if (currentItemIndex !== undefined) {
        form.setValue(`items.${currentItemIndex}.item_name`, newMenuItem.item_name)
        // Set description if available
        if (newMenuItem.item_description) {
          form.setValue(`items.${currentItemIndex}.item_description`, newMenuItem.item_description)
        }
        // Set price if available
        if (values.price) {
          form.setValue(`items.${currentItemIndex}.price`, values.price)
        } else if (newMenuItem.variants && newMenuItem.variants.length > 0) {
          form.setValue(`items.${currentItemIndex}.price`, newMenuItem.variants[0].price)
        }
      }

      setMenuItemDialogOpen(false)
      menuItemForm.reset()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add menu item"
      toast.error("Error adding menu item", {
        description: errorMessage,
      })
    } finally {
      setIsSavingMenuItem(false)
    }
  }

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

      const data: OrdersResponse = await apiCallJson<OrdersResponse>(`/orders?${params.toString()}`)
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

  // Prepare options for comboboxes
  const clientOptions = React.useMemo(() => {
    return clients.map((client) => ({
      value: client.full_name,
      label: client.full_name,
    }))
  }, [clients])

  const catererOptions = React.useMemo(() => {
  return caterers.map((caterer) => {
    const airportCode = caterer.airport_code_iata || caterer.airport_code_icao
    const label = airportCode
      ? `${airportCode} - ${caterer.caterer_name}`
      : caterer.caterer_name

    return {
      value: caterer.caterer_name,
      label,
      searchText: airportCode
        ? `${caterer.caterer_name.toLowerCase()} ${airportCode.toLowerCase()}`
        : caterer.caterer_name.toLowerCase(),
    }
  })
  }, [caterers])

  const airportOptions = React.useMemo(() => {
    return airports.map((airport) => ({
      value: airport.airport_name,
      label: `${airport.airport_name}${airport.airport_code_iata ? ` (${airport.airport_code_iata})` : ""}`,
    }))
  }, [airports])

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

  // Open add dialog
  const handleAdd = () => {
    setEditingOrder(null)
    form.reset({
      client_name: "",
      caterer: "",
      airport: "",
      aircraft_tail_number: "",
      delivery_date: "",
      delivery_time: "",
      order_priority: "normal",
      payment_method: "card",
      description: "",
      notes: "",
      reheating_instructions: "",
      packaging_instructions: "",
      dietary_restrictions: "",
      service_charge: 0,
      items: [{ item_name: "", item_description: "", portion_size: "", price: 0 }],
    })
    setDialogOpen(true)
  }

  // Open edit dialog
  const handleEdit = async (order: Order) => {
    try {
      const fullOrder: Order = await apiCallJson<Order>(`/orders/${order.id}`)
      setEditingOrder(fullOrder)
      
      form.reset({
        client_name: fullOrder.client_id.toString(),
        caterer: fullOrder.caterer_id.toString(),
        airport: fullOrder.airport_id.toString(),
        aircraft_tail_number: fullOrder.aircraft_tail_number || "",
        delivery_date: fullOrder.delivery_date,
        delivery_time: fullOrder.delivery_time,
        order_priority: fullOrder.order_priority as "low" | "normal" | "high" | "urgent",
        payment_method: fullOrder.payment_method as "card" | "ACH",
        description: fullOrder.description || "",
        notes: fullOrder.notes || "",
        reheating_instructions: fullOrder.reheating_instructions || "",
        packaging_instructions: fullOrder.packaging_instructions || "",
        dietary_restrictions: fullOrder.dietary_restrictions || "",
        service_charge: typeof fullOrder.service_charge === "number" ? fullOrder.service_charge : parseFloat(String(fullOrder.service_charge)) || 0,
        items: fullOrder.items && fullOrder.items.length > 0
          ? fullOrder.items.map((item) => ({
              item_name: item.item_name,
              item_description: item.item_description || "",
              portion_size: item.portion_size,
              price: typeof item.price === "number" ? item.price : parseFloat(String(item.price)) || 0,
            }))
          : [{ item_name: "", item_description: "", portion_size: "", price: 0 }],
      })
      setDialogOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch order details"
      toast.error("Error loading order", {
        description: errorMessage,
      })
    }
  }

  // Handle save (create or update)
  const handleSave = async (values: OrderFormValues) => {
    try {
      const url = editingOrder
        ? `/orders/${editingOrder.id}`
        : `/orders`

      const method = editingOrder ? "PUT" : "POST"

      const body: any = {
        client_id: parseInt(values.client_name),
        caterer_id: parseInt(values.caterer),
        airport_id: parseInt(values.airport),
        delivery_date: values.delivery_date,
        delivery_time: values.delivery_time,
        order_priority: values.order_priority,
        payment_method: values.payment_method,
        items: values.items.map((item) => ({
          item_name: item.item_name,
          item_description: item.item_description || undefined,
          portion_size: item.portion_size,
          price: item.price,
        })),
      }

      if (values.aircraft_tail_number) {
        body.aircraft_tail_number = values.aircraft_tail_number
      }
      if (values.description) {
        body.description = values.description
      }
      if (values.notes) {
        body.notes = values.notes
      }
      if (values.reheating_instructions) {
        body.reheating_instructions = values.reheating_instructions
      }
      if (values.packaging_instructions) {
        body.packaging_instructions = values.packaging_instructions
      }
      if (values.dietary_restrictions) {
        body.dietary_restrictions = values.dietary_restrictions
      }
      if (values.service_charge !== undefined && values.service_charge > 0) {
        body.service_charge = values.service_charge
      }

      const data: Order = await apiCallJson<Order>(url, {
        method,
        body: JSON.stringify(body),
      })
      
      toast.success(editingOrder ? "Order updated" : "Order created", {
        description: `Order ${data.order_number} has been ${editingOrder ? "updated" : "created"} successfully.`,
      })

      setDialogOpen(false)
      setEditingOrder(null)
      form.reset()
      fetchOrders()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save order"
      toast.error("Error saving order", {
        description: errorMessage,
      })
      console.error("Error saving order:", err)
    }
  }

  // Handle view details
  const handleView = async (order: Order) => {
    try {
      const data: Order = await apiCallJson<Order>(`/orders/${order.id}`)
      setViewingOrder(data)
      setViewDrawerOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch order details"
      toast.error("Error loading order details", {
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
      await apiCallJson(`/orders/${orderToDelete.id}`, {
        method: "DELETE",
      })

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
      const data = await apiCallJson<{ deleted: number }>(`/orders`, {
        method: "DELETE",
        body: JSON.stringify({
          ids: Array.from(selectedOrders),
        }),
      })
      
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

  // Handle email
  const handleEmail = (order: Order) => {
    setOrderForEmail(order)
    setEmailRecipient("client")
    setCustomClientMessage("")
    setCustomCatererMessage("")
    setSelectedFriendEmails(new Set())
    setManualCcEmails("")
    setEmailDialogOpen(true)
  }

  const confirmSendEmail = async () => {
    if (!orderForEmail) return

    setIsSendingEmail(true)
    try {
      // Determine endpoint and payload based on recipient
      let endpoint = ""
      let body: Record<string, any> = {}

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
          body.custom_message = customClientMessage.trim()
        }
      } else if (emailRecipient === "caterer") {
        endpoint = `/orders/${orderForEmail.id}/send-to-caterer`
        if (customCatererMessage.trim()) {
          body.custom_message = customCatererMessage.trim()
        }
      } else {
        // both
        endpoint = `/orders/${orderForEmail.id}/send-to-both`
        if (customClientMessage.trim()) {
          body.custom_client_message = customClientMessage.trim()
        }
        if (customCatererMessage.trim()) {
          body.custom_caterer_message = customCatererMessage.trim()
        }
      }

      // Add CC emails if any
      if (ccEmails.length > 0) {
        body.cc_emails = ccEmails
      }

      await apiCallJson(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      })
      
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
      setSelectedFriendEmails(new Set())
      setManualCcEmails("")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send email"
      toast.error("Error sending email", {
        description: errorMessage,
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Handle PDF preview
  const handlePdfPreview = async (order: Order) => {
    setOrderForPdf(order)
    setPdfPreviewOpen(true)
    setPdfHtml("") // Reset while loading
    
    try {
      const data = await apiCallJson<{ html: string }>(`/orders/${order.id}/preview`)
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

  // Handle sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const allSelected = orders.length > 0 && selectedOrders.size === orders.length
  const someSelected = selectedOrders.size > 0 && selectedOrders.size < orders.length
  const totalPages = Math.ceil(total / limit)

  const getStatusBadge = (status: OrderStatus | "completed") => {
    const normalizedStatus: OrderStatus = status === "completed" ? "delivered" : status
    const statusOption = statusOptions.find((s) => s.value === normalizedStatus)
    const statusConfig = getOrderStatusConfig(normalizedStatus)
    const tooltipContent = getStatusTooltipContent(normalizedStatus)
    
    const badge = (
      <Badge variant="outline" className={statusOption?.color || ""}>
        {statusOption?.label || normalizedStatus}
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
                      Manage orders, track status, and handle deliveries
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
                    <Button
                      onClick={handleAdd}
                      className="gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Create Order
                    </Button>
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
                    <SelectTrigger className="w-full md:w-[200px] bg-background/50">
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
                              Order Number
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
                            <Building2 className="h-4 w-4 text-muted-foreground" />
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
                              Delivery Date
                            </div>
                            {sortBy === "delivery_date" && (
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            Delivery Time
                          </div>
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
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            Total
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
                              <Skeleton className="h-4 w-[80px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[120px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[50px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[80px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[40px]" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <ShoppingCart className="h-8 w-8 opacity-50" />
                              <p className="text-sm font-medium">No orders found</p>
                              <p className="text-xs">
                                {searchQuery || statusFilter !== "all"
                                  ? "Try adjusting your search or filter"
                                  : "Get started by creating your first order"}
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
                            <TableCell className="max-w-[200px]">
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
                              {formatDateForDisplay(order.delivery_date)}
                            </TableCell>
                            <TableCell>
                              {order.delivery_time}
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
                            <TableCell className="font-medium">
                              ${typeof order.total === "number" ? order.total.toFixed(2) : parseFloat(String(order.total) || "0").toFixed(2)}
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
                                    onClick={() => handleEdit(order)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Order
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusUpdate(order)}
                                    className="cursor-pointer"
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Update Status
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
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
                                    onClick={() => handleEmail(order)}
                                    className="cursor-pointer"
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send Email
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

            {/* Create/Edit Order Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">
                    {editingOrder ? "Edit Order" : "Create New Order"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingOrder
                      ? "Update the order information below."
                      : "Enter the order information to create a new order."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                    <div className="grid gap-4 py-4">
                      {/* Basic Information */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="client_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                Client Name *
                              </FormLabel>
                              <FormControl>
                                {isLoadingSupportingData ? (
                                  <Skeleton className="h-10 w-full" />
                                ) : (
                                  <Combobox
                                    options={clientOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder="Select client..."
                                    searchPlaceholder="Search clients..."
                                    emptyMessage="No clients found."
                                  />
                                )}
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
                              <FormLabel className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                Caterer *
                              </FormLabel>
                              <FormControl>
                                {isLoadingSupportingData ? (
                                  <Skeleton className="h-10 w-full" />
                                ) : (
                                  <Combobox
                                    options={catererOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder="Select caterer..."
                                    searchPlaceholder="Search caterers..."
                                    emptyMessage="No caterers found."
                                  />
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="airport"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Plane className="h-4 w-4 text-muted-foreground" />
                                Airport *
                              </FormLabel>
                              <FormControl>
                                {isLoadingSupportingData ? (
                                  <Skeleton className="h-10 w-full" />
                                ) : (
                                  <Combobox
                                    options={airportOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder="Select airport..."
                                    searchPlaceholder="Search airports..."
                                    emptyMessage="No airports found."
                                  />
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="aircraft_tail_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Plane className="h-4 w-4 text-muted-foreground" />
                                Aircraft Tail Number
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., N123AB"
                                  {...field}
                                  className="bg-background/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="delivery_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                Delivery Date *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  className="bg-background/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="delivery_time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                Delivery Time *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="time"
                                  {...field}
                                  className="bg-background/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="service_charge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                Service Charge
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                  className="bg-background/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="order_priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Order Priority *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-background/50">
                                    <SelectValue placeholder="Select priority" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="normal">Normal</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="payment_method"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Method *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-background/50">
                                    <SelectValue placeholder="Select payment method" />
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

                      {/* Optional Fields */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter order description..."
                                rows={3}
                                {...field}
                                className="bg-background/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter notes..."
                                  rows={3}
                                  {...field}
                                  className="bg-background/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="dietary_restrictions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dietary Restrictions</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter dietary restrictions..."
                                  rows={3}
                                  {...field}
                                  className="bg-background/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="reheating_instructions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reheating Instructions</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter reheating instructions..."
                                  rows={3}
                                  {...field}
                                  className="bg-background/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="packaging_instructions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Packaging Instructions</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter packaging instructions..."
                                  rows={3}
                                  {...field}
                                  className="bg-background/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Order Items */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-base font-semibold flex items-center gap-2">
                            <UtensilsCrossed className="h-5 w-5" />
                            Order Items *
                          </FormLabel>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ item_name: "", item_description: "", portion_size: "", price: 0 })}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Item
                          </Button>
                        </div>

                        {fields.map((field, index) => (
                          <Card key={field.id} className="p-4 border-border/50">
                            <div className="flex items-start justify-between mb-4">
                              <h4 className="font-medium">Item {index + 1}</h4>
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => remove(index)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.item_name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Item Name *</FormLabel>
                                    <div className="flex gap-2">
                                      <FormControl>
                                        <Combobox
                                          options={menuItemOptions}
                                          value={menuItemOptions.find(opt => opt.label === field.value)?.value || ""}
                                          onValueChange={(value) => {
                                            if (value) {
                                              const itemId = parseInt(value)
                                              const selectedItem = !isNaN(itemId) ? getMenuItemById(itemId) : undefined
                                              if (selectedItem) {
                                                field.onChange(selectedItem.item_name)
                                                // Auto-populate description if available
                                                if (selectedItem.item_description) {
                                                  form.setValue(`items.${index}.item_description`, selectedItem.item_description)
                                                }
                                                // Auto-populate price if available
                                                if (selectedItem.variants && selectedItem.variants.length > 0) {
                                                  form.setValue(`items.${index}.price`, selectedItem.variants[0].price)
                                                }
                                              }
                                            } else {
                                              field.onChange("")
                                            }
                                          }}
                                          placeholder="Select or search item..."
                                          searchPlaceholder="Search items..."
                                          emptyMessage="No items found."
                                          onAddNew={() => {
                                            setCurrentItemIndex(index)
                                            setMenuItemDialogOpen(true)
                                          }}
                                          addNewLabel="Add New Item"
                                          onSearchChange={setMenuItemSearch}
                                          isLoading={isLoadingMenuItems}
                                        />
                                      </FormControl>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-11 w-11 shrink-0"
                                        onClick={() => {
                                          setCurrentItemIndex(index)
                                          setMenuItemDialogOpen(true)
                                        }}
                                        title="Add New Item"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.portion_size`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Portion Size *</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="e.g., Large, Medium, Small"
                                        {...field}
                                        className="bg-background/50"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 mt-4">
                              <FormField
                                control={form.control}
                                name={`items.${index}.item_description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Item Description</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Enter item description..."
                                        rows={2}
                                        {...field}
                                        className="bg-background/50"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.price`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Price *</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        placeholder="0.00"
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="bg-background/50"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </Card>
                        ))}
                        {form.formState.errors.items && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.items.message}
                          </p>
                        )}
                      </div>
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
                        {editingOrder ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Update Order
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Create Order
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

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
                        {/* Order Information */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              Order Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Order Number
                                </Label>
                                <p className="text-sm font-mono font-medium">
                                  {viewingOrder.order_number}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Status
                                </Label>
                                {getStatusBadge(viewingOrder.status)}
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Delivery Date
                                </Label>
                                <p className="text-sm font-medium">
                                  {formatDateForDisplay(viewingOrder.delivery_date)}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Delivery Time
                                </Label>
                                <p className="text-sm font-medium">
                                  {viewingOrder.delivery_time}
                                </p>
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
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
                                <p className="text-sm font-mono font-medium">
                                  {viewingOrder.aircraft_tail_number}
                                </p>
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
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Full Name
                                  </Label>
                                  <p className="text-sm font-medium">
                                    {viewingOrder.client.full_name}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Email
                                  </Label>
                                  <p className="text-sm font-medium">
                                    {viewingOrder.client.email}
                                  </p>
                                </div>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Contact Number
                                  </Label>
                                  <p className="text-sm font-medium">
                                    {viewingOrder.client.contact_number || "—"}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Address
                                  </Label>
                                  <p className="text-sm font-medium">
                                    {viewingOrder.client.full_address}
                                  </p>
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
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Caterer Name
                                  </Label>
                                  <p className="text-sm font-medium">
                                    {viewingOrder.caterer_details.caterer_name}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Phone Number
                                  </Label>
                                  <p className="text-sm font-medium">
                                    {viewingOrder.caterer_details.caterer_number}
                                  </p>
                                </div>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Email
                                  </Label>
                                  <p className="text-sm font-medium">
                                    {viewingOrder.caterer_details.caterer_email || "—"}
                                  </p>
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
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Airport Name
                                  </Label>
                                  <p className="text-sm font-medium">
                                    {viewingOrder.airport_details.airport_name}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    FBO Name
                                  </Label>
                                  <p className="text-sm font-medium">
                                    {viewingOrder.airport_details.fbo_name}
                                  </p>
                                </div>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    FBO Email
                                  </Label>
                                  <p className="text-sm font-medium">
                                    {viewingOrder.airport_details.fbo_email || "—"}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    FBO Phone
                                  </Label>
                                  <p className="text-sm font-medium">
                                    {viewingOrder.airport_details.fbo_phone || "—"}
                                  </p>
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

                        {/* Order Items */}
                        {viewingOrder.items && viewingOrder.items.length > 0 && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <UtensilsCrossed className="h-5 w-5 text-emerald-500" />
                                Order Items ({viewingOrder.items.length})
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {viewingOrder.items.map((item, index) => (
                                  <div
                                    key={item.id || index}
                                    className="flex items-start justify-between p-4 border border-border/50 rounded-lg"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium">{item.item_name}</h4>
                                        <Badge variant="outline">Qty: {item.portion_size}</Badge>
                                      </div>
                                      {item.item_description && (
                                        <p className="text-sm text-muted-foreground">
                                          {item.item_description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium">${parseFloat(String(item.price)).toFixed(2)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
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
                                  <p className="text-sm">{viewingOrder.description}</p>
                                </div>
                              )}
                              {viewingOrder.notes && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Notes
                                  </Label>
                                  <p className="text-sm">{viewingOrder.notes}</p>
                                </div>
                              )}
                              {viewingOrder.dietary_restrictions && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Dietary Restrictions
                                  </Label>
                                  <p className="text-sm">{viewingOrder.dietary_restrictions}</p>
                                </div>
                              )}
                              {viewingOrder.reheating_instructions && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Reheating Instructions
                                  </Label>
                                  <p className="text-sm">{viewingOrder.reheating_instructions}</p>
                                </div>
                              )}
                              {viewingOrder.packaging_instructions && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Packaging Instructions
                                  </Label>
                                  <p className="text-sm">{viewingOrder.packaging_instructions}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Metadata */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Metadata</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Created At
                                </Label>
                                <p className="text-sm font-medium">
                                  {new Date(viewingOrder.created_at).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Updated At
                                </Label>
                                <p className="text-sm font-medium">
                                  {new Date(viewingOrder.updated_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {viewingOrder.completed_at && (
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Completed At
                                </Label>
                                <p className="text-sm font-medium">
                                  {new Date(viewingOrder.completed_at).toLocaleString()}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
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
                            handleEmail(viewingOrder)
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

                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Note:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>The order PDF will be automatically attached to the email</li>
                      <li>Email subject is determined by the order status template</li>
                      <li>Custom messages will override the template body only</li>
                      <li>CC recipients will receive copies of all emails sent</li>
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEmailDialogOpen(false)
                      setOrderForEmail(null)
                      setCustomClientMessage("")
                      setCustomCatererMessage("")
                      setSelectedFriendEmails(new Set())
                      setManualCcEmails("")
                    }}
                    disabled={isSendingEmail}
                  >
                    Cancel
                  </Button>
                  <Button onClick={confirmSendEmail} disabled={isSendingEmail} className="gap-2">
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

            {/* Add New Menu Item Dialog */}
            <Dialog
              open={menuItemDialogOpen}
              onOpenChange={(open) => {
                setMenuItemDialogOpen(open)
                if (!open) {
                  menuItemForm.reset()
                  setCurrentItemIndex(undefined)
                }
              }}
            >
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-md" />
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                        <UtensilsCrossed className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold">Add New Menu Item</DialogTitle>
                      <DialogDescription className="text-sm">
                        Enter the details of the new menu item to add to the system
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <Form {...menuItemForm}>
                  <form onSubmit={menuItemForm.handleSubmit(handleAddMenuItem)} className="space-y-6 py-4">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">1</span>
                        Basic Information
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={menuItemForm.control}
                          name="item_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Item Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter item name..." {...field} className="h-11 bg-muted/30 border-border/40" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={menuItemForm.control}
                          name="food_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Food Type *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select food type..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="veg">Vegetarian</SelectItem>
                                  <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <FormField
                      control={menuItemForm.control}
                      name="item_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-muted-foreground">Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter item description..."
                              rows={3}
                              {...field}
                              className="resize-none bg-muted/30 border-border/40"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Category & Status */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">2</span>
                        Category & Status
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={menuItemForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Category</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter category..." {...field} className="h-11 bg-muted/30 border-border/40" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={menuItemForm.control}
                          name="is_active"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">Active Status</FormLabel>
                                <div className="text-xs text-muted-foreground">
                                  Item will be visible in menu
                                </div>
                              </div>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">3</span>
                        Pricing
                      </div>
                      <FormField
                        control={menuItemForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">Price ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="h-11 bg-muted/30 border-border/40"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setMenuItemDialogOpen(false)
                          menuItemForm.reset()
                          setCurrentItemIndex(undefined)
                        }}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSavingMenuItem}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isSavingMenuItem ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Menu Item
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SidebarCategoryProvider>
  )
}

export default function OrdersPage() {
  return <OrdersContent />
}

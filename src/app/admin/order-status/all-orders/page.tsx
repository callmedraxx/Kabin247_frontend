"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { SidebarCategoryProvider } from "@/contexts/sidebar-context"
import { useCaterers } from "@/contexts/caterers-context"
import { useAirports } from "@/contexts/airports-context"
import { useClients } from "@/contexts/clients-context"
import { useMenuItems } from "@/contexts/menu-items-context"
import { useFBOs } from "@/contexts/fbos-context"
import { useOrders, type OrderWithSync } from "@/contexts/orders-context"
import { useOffline } from "@/contexts/offline-context"
import { SyncStatusBadge } from "@/components/pwa/sync-status-badge"
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
  Users,
  UserPlus,
  ShoppingCart,
  Package,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  UtensilsCrossed,
  Copy,
  HelpCircle,
  MessageSquare,
  AtSign,
  Info,
  ChevronDown,
  ChevronUp,
  Archive,
  ArchiveRestore,
  Lock,
  LockOpen,
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
import { Combobox } from "@/components/ui/combobox"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useFieldArray } from "react-hook-form"

import { API_BASE_URL } from "@/lib/api-config"
import { apiCall, apiCallJson } from "@/lib/api-client"
import { getStatusOptions, getOrderStatusConfig, getStatusTooltipContent, orderStatusConfig } from "@/lib/order-status-config"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/auth-context"
import { PaymentModal } from "@/components/payments/payment-modal"
import { PaymentButton } from "@/components/payments/payment-button"
import { PaymentHistory } from "@/components/payments/payment-history"
import { getStoredCards, getOrderPayments, StoredCard } from "@/lib/payment-api"
import { SendInvoiceButton } from "@/components/invoices/send-invoice-button"
import { InvoiceList } from "@/components/invoices/invoice-list"
import { CreditCard } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

// Order status types - imported from centralized config
import type { OrderStatus } from "@/lib/order-status-config"
export type { OrderStatus }

// Order data structure matching API response
interface OrderItem {
  id?: number
  order_id?: number
  menu_item_id?: number
  item_id?: number
  item_name: string
  item_description?: string | null
  portion_size: string
  portion_serving?: string | null
  price: string | number
  category?: string | null
  packaging?: string | null
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
  airport_code_iata: string | null
  airport_code_icao: string | null
}

interface OrderFBO {
  id: number
  fbo_name: string
  fbo_email: string | null
  fbo_phone: string | null
}

// Additional interfaces for form data (matching POS page)
interface Client {
  id: number
  full_name: string
  full_address: string
  email: string | null
  contact_number: string | null
  airport_code: string | null
  fbo_name: string | null
  additional_emails?: string[]
  created_at: string
  updated_at: string
}

interface Caterer {
  id: number
  caterer_name: string
  caterer_number: string
  caterer_email: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
  time_zone: string | null
  additional_emails?: string[]
  created_at: string
  updated_at: string
}

interface Airport {
  id: number
  airport_name: string
  fbo_name: string
  airport_code_iata: string | null
  airport_code_icao: string | null
}

interface FBO {
  id: number
  fbo_name: string
  fbo_email: string | null
  fbo_phone: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
  airport_name: string | null
}

interface MenuItem {
  id: number
  item_name: string
  item_description: string | null
  category: string
  variants: Array<{
    id: number
    portion_size: string
    price: number
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

interface Category {
  id: number
  name: string
  slug: string
  is_active: boolean
}

interface ClientsResponse {
  clients: Client[]
  total: number
}

interface CaterersResponse {
  caterers: Caterer[]
  total: number
}

interface AirportsResponse {
  airports: Airport[]
  total: number
}

interface FBOsResponse {
  fbos: FBO[]
  total: number
}

interface MenuItemsResponse {
  menu_items: MenuItem[]
  total: number
}

interface CategoriesResponse {
  categories: Category[]
  total: number
}

interface Order {
  id: number
  order_number: string
  client_id: number
  caterer_id: number
  airport_id: number
  fbo_id?: number | null
  aircraft_tail_number: string | null
  delivery_date: string
  delivery_time: string
  status: OrderStatus
  is_paid?: boolean
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
  coordination_fee: string | number | null
  airport_fee: string | number | null
  fbo_fee: string | number | null
  shopping_fee: string | number | null
  restaurant_pickup_fee: string | number | null
  airport_pickup_fee: string | number | null
  subtotal: string | number
  total: string | number
  items?: OrderItem[]
  client?: OrderClient
  caterer_details?: OrderCaterer
  airport_details?: OrderAirport
  fbo?: OrderFBO
  is_archived?: boolean
  is_price_locked?: boolean
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
// Get status options from centralized config
const statusOptions = getStatusOptions()

// Item schema matching POS page
const itemSchema = z.object({
  itemName: z.string().min(1, "Please enter an item name"),
  itemDescription: z.string().optional(),
  portionSize: z.string().min(1, "Please enter the quantity"),
  portionServing: z.string().optional(), // Size like 500mg, 500ml, etc.
  price: z.string().min(1, "Please enter a price").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Please enter a valid price greater than 0",
  }),
  category: z.string().optional(),
  packaging: z.string().optional(),
})

// Form schema for editing orders - matching POS page schema
const orderSchema = z.object({
  order_number: z.string().optional(),
  client_id: z.number({ message: "Please select a client" }).int().positive("Please select a client"),
  caterer_id: z.number({ message: "Please select a caterer" }).int().positive("Please select a caterer"),
  airport_id: z.number({ message: "Please select an airport" }).int().positive("Please select an airport"),
  fbo_id: z.number().int().positive().optional(),
  description: z.string().optional(),
  items: z.array(itemSchema).min(1, "Please add at least one item to the order"),
  notes: z.string().optional(),
  reheatingInstructions: z.string().optional(),
  packagingInstructions: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  serviceCharge: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Please enter a valid service charge amount",
  }),
  deliveryFee: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Please enter a valid delivery fee amount",
  }),
  coordinationFee: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Please enter a valid coordination fee amount",
  }),
  airportFee: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Please enter a valid airport fee amount",
  }),
  fboFee: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Please enter a valid FBO fee amount",
  }),
  shoppingFee: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Please enter a valid shopping fee amount",
  }),
  restaurantPickupFee: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Please enter a valid restaurant pickup fee amount",
  }),
  airportPickupFee: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Please enter a valid airport pickup fee amount",
  }),
  aircraftTailNumber: z.string().optional(),
  deliveryDate: z.string().min(1, "Please select a delivery date"),
  deliveryTime: z.string().min(1, "Please select a delivery time"),
  orderPriority: z.enum(["low", "normal", "high", "urgent"], { message: "Please select a priority level" }),
  orderType: z.enum(["inflight", "qe_serv_hub", "restaurant_pickup"], { message: "Please select an order type" }),
  paymentMethod: z.enum(["card", "ACH"], { message: "Please select a payment method" }),
  status: z.enum([
    "awaiting_quote",
    "awaiting_client_approval",
    "awaiting_caterer",
    "caterer_confirmed",
    "in_preparation",
    "ready_for_delivery",
    "delivered",
    "paid",
    "cancelled",
    "order_changed",
  ]),
})

type OrderFormValues = z.infer<typeof orderSchema>

// Helper function to decode HTML entities
const decodeHtmlEntities = (text: string): string => {
  if (!text) return ""
  const textarea = document.createElement("textarea")
  textarea.innerHTML = text
  return textarea.value
}

// Helper function to format date for HTML date input (YYYY-MM-DD)
// Uses UTC methods to avoid timezone conversion issues
const formatDateForInput = (dateString: string | null | undefined): string => {
  if (!dateString) return ""
  
  // If it's already in YYYY-MM-DD format, return as is (most common case)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString
  }
  
  // Try to extract YYYY-MM-DD from the beginning of the string (e.g., from ISO datetime)
  const match = dateString.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) {
    return match[1]
  }
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return ""
    }
    // Use UTC methods to avoid timezone conversion issues
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, "0")
    const day = String(date.getUTCDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  } catch {
    return ""
  }
}

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
    const month = String(date.getUTCMonth() + 1).padStart(2, "0")
    const day = String(date.getUTCDate()).padStart(2, "0")
    const year = date.getUTCFullYear()
    return `${month}/${day}/${year}`
  } catch {
    return ""
  }
}

// Helper function to map order type from API format to form format
const mapOrderTypeToForm = (orderType: string | null | undefined): "inflight" | "qe_serv_hub" | "restaurant_pickup" | undefined => {
  if (!orderType) return undefined
  
  const normalized = orderType.toLowerCase().trim()
  
  // Exact matches first
  if (normalized === "inflight" || normalized === "in-flight" || normalized === "in flight") {
    return "inflight"
  }
  if (normalized === "qe_serv_hub" || normalized === "qe serv hub" || normalized === "qe servhub") {
    return "qe_serv_hub"
  }
  if (normalized === "restaurant_pickup" || normalized === "restaurant pickup" || normalized === "restaurantpickup") {
    return "restaurant_pickup"
  }
  
  // Partial matches - check for "qe" (case-insensitive)
  if (normalized === "qe" || normalized.startsWith("qe")) {
    return "qe_serv_hub"
  }
  
  // Check for "serv" - could be "qe_serv_hub" or part of restaurant
  if (normalized === "serv" || normalized.includes("serv hub") || normalized.includes("servhub")) {
    return "qe_serv_hub"
  }
  
  // Check for flight-related
  if (normalized.includes("flight")) {
    return "inflight"
  }
  
  // Check for restaurant/pickup
  if (normalized.includes("pickup") || normalized.includes("restaurant")) {
    return "restaurant_pickup"
  }
  
  // Check for hub (likely qe_serv_hub)
  if (normalized.includes("hub")) {
    return "qe_serv_hub"
  }
  
  return undefined
}

function OrdersContent() {
  const router = useRouter()
  const [orders, setOrders] = React.useState<Order[]>([])
  const [selectedOrders, setSelectedOrders] = React.useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "all">("all")
  const [showArchived, setShowArchived] = React.useState(false)
  const [isArchiving, setIsArchiving] = React.useState(false)
  const [togglingPriceLock, setTogglingPriceLock] = React.useState<number | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = React.useState<number | null>(null)

  // Pagination state
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(50)
  const [total, setTotal] = React.useState(0)
  const [sortBy, setSortBy] = React.useState<string>("created_at")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")
  
  const isMobile = useIsMobile()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null)
  const [paymentOrder, setPaymentOrder] = React.useState<Order | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false)
  const [paymentStoredCards, setPaymentStoredCards] = React.useState<StoredCard[]>([])
  const [invoiceOrder, setInvoiceOrder] = React.useState<Order | null>(null)
  const [invoiceModalOpen, setInvoiceModalOpen] = React.useState(false)
  const [isLoadingFormData, setIsLoadingFormData] = React.useState(false)
  const lastResetOrderId = React.useRef<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null)
  const [viewDrawerOpen, setViewDrawerOpen] = React.useState(false)
  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null)
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false)
  const [orderForStatusUpdate, setOrderForStatusUpdate] = React.useState<Order | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false)
  const [helpDialogOpen, setHelpDialogOpen] = React.useState(false)
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

  // Payment history component for edit modal
  const PaymentHistoryWrapper = ({ orderId }: { orderId: number }) => {
    const [transactions, setTransactions] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
      const loadPayments = async () => {
        try {
          const response = await getOrderPayments(orderId)
          setTransactions(response.transactions)
        } catch (error) {
          console.error('Failed to load payment history:', error)
        } finally {
          setLoading(false)
        }
      }
      loadPayments()
    }, [orderId])

    if (loading) {
      return <div className="text-sm text-muted-foreground">Loading payment history...</div>
    }

    return <PaymentHistory transactions={transactions} />
  }

  // Invoice list component for edit modal
  const InvoiceListWrapper = ({ 
    orderId, 
    onInvoiceUpdate 
  }: { 
    orderId: number
    onInvoiceUpdate?: () => void 
  }) => {
    return <InvoiceList orderId={orderId} onInvoiceUpdate={onInvoiceUpdate} />
  }

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema) as any,
    defaultValues: {
      order_number: "",
      client_id: undefined,
      caterer_id: undefined,
      airport_id: undefined,
      fbo_id: undefined,
      description: "",
      items: [
        {
          itemName: "",
          itemDescription: "",
          portionSize: "",
          portionServing: "",
          price: "",
          category: "",
          packaging: "",
        },
      ],
      notes: "",
      reheatingInstructions: "",
      packagingInstructions: "",
      dietaryRestrictions: "",
      serviceCharge: "",
      deliveryFee: "",
      coordinationFee: "",
      airportFee: "",
      fboFee: "",
      shoppingFee: "",
      restaurantPickupFee: "",
      airportPickupFee: "",
      aircraftTailNumber: "",
      deliveryDate: "",
      deliveryTime: "",
      orderPriority: "normal",
      orderType: undefined,
      paymentMethod: undefined,
      status: "awaiting_quote",
    },
  })

  // Use contexts for data
  const { 
    caterers: caterersData, 
    catererOptions, 
    isLoading: isLoadingCaterers, 
    fetchCaterers: fetchCaterersFromContext,
    getCatererById,
    getCatererOptionById
  } = useCaterers()
  
  const { 
    airports: airportsData, 
    airportOptions, 
    isLoading: isLoadingAirports, 
    fetchAirports: fetchAirportsFromContext,
    getAirportById,
    getAirportOptionById
  } = useAirports()
  
  const { 
    clients: clientsData, 
    clientOptions, 
    isLoading: isLoadingClients, 
    fetchClients: fetchClientsFromContext,
    getClientById,
    getClientOptionById
  } = useClients()
  
  const { 
    menuItems: menuItemsData, 
    menuItemOptions, 
    isLoading: isLoadingMenuItems, 
    fetchMenuItems: fetchMenuItemsFromContext,
    getMenuItemById,
    getMenuItemOptionById,
    getMenuItemByName
  } = useMenuItems()
  
  const {
    fbos: fbosData,
    fboOptions,
    isLoading: isLoadingFBOs,
    fetchFBOs: fetchFBOsFromContext,
    getFBOById,
    getFBOOptionById
  } = useFBOs()

  // Orders context for offline support
  const {
    orders: ordersFromContext,
    isLoading: isLoadingOrdersFromContext,
    fetchOrders: fetchOrdersFromContext,
    getOrder: getOrderFromContext,
    updateOrder: updateOrderFromContext,
    deleteOrder: deleteOrderFromContext,
  } = useOrders()

  // Offline status
  const { isOnline } = useOffline()

  // Sync orders from context to local state when context updates
  React.useEffect(() => {
    if (ordersFromContext.length > 0) {
      setOrders(ordersFromContext as Order[])
      setTotal(ordersFromContext.length)
    }
  }, [ordersFromContext])

  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(false)
  
  // Search states for comboboxes
  const [clientSearch, setClientSearch] = React.useState("")
  const [catererSearch, setCatererSearch] = React.useState("")
  const [airportSearch, setAirportSearch] = React.useState("")
  const [fboSearch, setFboSearch] = React.useState("")
  const [menuItemSearch, setMenuItemSearch] = React.useState("")

  // Menu item dialog states
  const [menuItemDialogOpen, setMenuItemDialogOpen] = React.useState(false)
  const [currentItemIndex, setCurrentItemIndex] = React.useState<number | undefined>(undefined)
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  // Collapse state for items
  const [collapsedItems, setCollapsedItems] = React.useState<Set<number>>(new Set())
  
  // Track items with manually edited prices (by index)
  const [manuallyEditedPrices, setManuallyEditedPrices] = React.useState<Set<number>>(new Set())
  
  // Helper function to resolve menu item price based on caterer and portion size
  const resolveMenuItemPrice = React.useCallback((
    menuItem: { variants?: Array<{ portion_size: string; price: number; caterer_prices?: Array<{ caterer_id: number; price: number }> }> },
    portionSize: string | undefined,
    catererId: number | undefined
  ): number | undefined => {
    if (!menuItem || !portionSize) return undefined
    
    // Find the variant matching the portion size
    const variant = menuItem.variants?.find(v => v.portion_size === portionSize)
    if (!variant) return undefined
    
    // If caterer_id is provided and variant has caterer_prices, try to find caterer-specific price
    if (catererId && variant.caterer_prices && variant.caterer_prices.length > 0) {
      const catererPrice = variant.caterer_prices.find(cp => cp.caterer_id === catererId)
      if (catererPrice) {
        return catererPrice.price
      }
    }
    
    // Fallback to base price
    return variant.price
  }, [])
  
  // Helper function to get item display name
  const getItemDisplayName = React.useCallback((itemName: string | undefined): string => {
    if (!itemName) return "No item selected"
    const itemId = parseInt(itemName)
    if (!isNaN(itemId)) {
      const menuItem = getMenuItemById(itemId)
      if (menuItem) {
        return menuItem.item_name
      }
    }
    // Fallback to menuItemOptions
    const option = menuItemOptions.find(opt => opt.value === itemName)
    return option?.label || "No item selected"
  }, [getMenuItemById, menuItemOptions])
  
  // Toggle collapse state for an item
  const toggleItemCollapse = React.useCallback((index: number) => {
    setCollapsedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }, [])

  // Watch status to disable urgent priority for delivered orders
  const watchedStatus = form.watch("status")
  const isDelivered = watchedStatus === "delivered"
  const watchedPriority = form.watch("orderPriority")
  const selectedCaterer = form.watch("caterer_id")

  // Recalculate prices when caterer changes (skip manually edited prices)
  React.useEffect(() => {
    if (!selectedCaterer) return
    
    const currentItems = form.getValues("items")
    currentItems.forEach((item, index) => {
      // Skip items with manually edited prices
      if (manuallyEditedPrices.has(index)) return
      
      if (item.itemName) {
        const itemId = parseInt(item.itemName)
        if (!isNaN(itemId)) {
          const menuItem = getMenuItemById(itemId)
          if (menuItem && item.portionSize) {
            const resolvedPrice = resolveMenuItemPrice(menuItem, item.portionSize, selectedCaterer)
            if (resolvedPrice !== undefined) {
              form.setValue(`items.${index}.price`, resolvedPrice.toString(), { shouldValidate: false })
            }
          }
        }
      }
    })
  }, [selectedCaterer, getMenuItemById, form, manuallyEditedPrices, resolveMenuItemPrice])

  // Automatically change priority from urgent to normal if status becomes delivered
  React.useEffect(() => {
    if (isDelivered && watchedPriority === "urgent") {
      form.setValue("orderPriority", "normal", { shouldValidate: false })
    }
  }, [isDelivered, watchedPriority, form])

  // Detect if user is on Mac for keyboard shortcut display
  const [isMac, setIsMac] = React.useState(false)
  React.useEffect(() => {
    setIsMac(typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  // Keyboard shortcut for adding items (Ctrl/Cmd + I)
  React.useEffect(() => {
    if (!dialogOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+I (Windows/Linux) or Cmd+I (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        // Don't trigger if user is typing in an input, textarea, or select
        const activeElement = document.activeElement
        const tagName = activeElement?.tagName?.toLowerCase()
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
          return
        }

        e.preventDefault()
        append({
          itemName: "",
          itemDescription: "",
          portionSize: "",
          portionServing: "",
          price: "",
          category: "",
          packaging: "",
        })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dialogOpen, append])

  // Fetch orders from API with offline support
  const fetchOrders = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use the orders context which handles online/offline
      await fetchOrdersFromContext({
        search: searchQuery.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        limit,
        isArchived: showArchived,
        sortBy,
        sortOrder,
      })

      // The context updates its own state, but we also need to sync local state
      // Use ordersFromContext for the actual data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch orders"

      // Check if it's a permission error
      if (errorMessage.toLowerCase().includes("permission") ||
          errorMessage.toLowerCase().includes("insufficient") ||
          errorMessage.toLowerCase().includes("forbidden") ||
          errorMessage.toLowerCase().includes("403")) {
        console.error("[Orders] Permission error when fetching orders:", {
          error: errorMessage,
          note: "This may indicate that the employee's permissions were not properly set when they accepted the invitation. Please verify permissions in the Employees page.",
        })
        setError("Insufficient permissions to view orders. Please contact an administrator to verify your permissions.")
        toast.error("Permission Denied", {
          description: "You don't have permission to view orders. Please contact an administrator to verify your 'Read Orders' permission is enabled.",
          duration: 8000,
        })
      } else {
        // Only show error if online - offline mode will use cache
        if (isOnline) {
          setError(errorMessage)
          toast.error("Error loading orders", {
            description: errorMessage,
          })
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, statusFilter, page, limit, showArchived, sortBy, sortOrder, fetchOrdersFromContext, isOnline])

  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  // Fetch orders on mount and when dependencies change
  // Wait for auth to initialize before making API calls
  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchOrders()
    }
  }, [fetchOrders, authLoading, isAuthenticated])

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to first page on search
      fetchOrders()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Use context fetch functions - they handle all state management and fetch ALL data
  const fetchClients = fetchClientsFromContext
  const fetchCaterers = React.useCallback(async (search?: string, _showLoading?: boolean) => {
    await fetchCaterersFromContext(search)
  }, [fetchCaterersFromContext])
  const fetchAirports = React.useCallback(async (search?: string, _showLoading?: boolean) => {
    await fetchAirportsFromContext(search)
  }, [fetchAirportsFromContext])
  const fetchFBOs = React.useCallback(async (search?: string, _showLoading?: boolean) => {
    await fetchFBOsFromContext(search)
  }, [fetchFBOsFromContext])
  const fetchMenuItems = React.useCallback(async (search?: string, _showLoading?: boolean) => {
    await fetchMenuItemsFromContext(search)
  }, [fetchMenuItemsFromContext])

  // Fetch categories for dropdown
  const fetchCategories = React.useCallback(async () => {
    setIsLoadingCategories(true)
    try {
      const data: CategoriesResponse = await apiCallJson(`/categories?is_active=true&limit=1000`)
      setCategories(data.categories || [])
    } catch (err) {
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        console.warn(`Network error fetching categories from ${API_BASE_URL}/categories`)
      } else {
        console.error("Unexpected error fetching categories:", err)
      }
    } finally {
      setIsLoadingCategories(false)
    }
  }, [])

  // Prepare category options for combobox
  const categoryOptions = React.useMemo(() => {
    return categories.map((cat) => ({
      value: cat.slug,
      label: cat.name,
    }))
  }, [categories])

  // Handlers for combobox open events - fetch data if empty
  const handleCatererComboboxOpen = React.useCallback((open: boolean) => {
    if (open && catererOptions.length === 0 && !isLoadingCaterers) {
      fetchCaterers(undefined, true)
    }
  }, [catererOptions.length, isLoadingCaterers, fetchCaterers])

  const handleAirportComboboxOpen = React.useCallback((open: boolean) => {
    if (open && airportOptions.length === 0 && !isLoadingAirports) {
      fetchAirports(undefined, true)
    }
  }, [airportOptions.length, isLoadingAirports, fetchAirports])

  const handleFboComboboxOpen = React.useCallback((open: boolean) => {
    if (open && fboOptions.length === 0 && !isLoadingFBOs) {
      fetchFBOs(undefined, true)
    }
  }, [fboOptions.length, isLoadingFBOs, fetchFBOs])

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
      await fetchMenuItems()

      // If we have a current item index, set the new menu item as the selected item
      if (currentItemIndex !== undefined) {
        form.setValue(`items.${currentItemIndex}.itemName`, newMenuItem.id.toString())
        // Set description if available
        if (newMenuItem.item_description) {
          form.setValue(`items.${currentItemIndex}.itemDescription`, newMenuItem.item_description)
        }
        // Set price if available
        if (values.price) {
          form.setValue(`items.${currentItemIndex}.price`, values.price.toString())
        } else if (newMenuItem.variants && newMenuItem.variants.length > 0) {
          form.setValue(`items.${currentItemIndex}.price`, newMenuItem.variants[0].price.toString())
        }
        // Set category if available
        if (newMenuItem.category) {
          form.setValue(`items.${currentItemIndex}.category`, newMenuItem.category)
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

  // Filter options based on search (for client-side filtering when server-side search is not enough)
  // Note: Server-side search is already done via fetchCaterers/fetchAirports, but we also filter
  // client-side to support multi-field search (name + airport for caterers, code + FBO + name for airports)
  const filteredCatererOptions = React.useMemo(() => {
    if (!catererSearch.trim()) return catererOptions

    const query = catererSearch.toLowerCase()
    return catererOptions.filter((option) =>
      option.searchText?.includes(query) || option.label.toLowerCase().includes(query)
    )
  }, [catererOptions, catererSearch])

  const filteredAirportOptions = React.useMemo(() => {
    if (!airportSearch.trim()) return airportOptions

    const query = airportSearch.toLowerCase()
    return airportOptions.filter((option) =>
      option.searchText?.includes(query) || option.label.toLowerCase().includes(query)
    )
  }, [airportOptions, airportSearch])

  const filteredFboOptions = React.useMemo(() => {
    if (!fboSearch.trim()) return fboOptions

    const query = fboSearch.toLowerCase()
    return fboOptions.filter((option) =>
      option.searchText?.includes(query) || option.label.toLowerCase().includes(query)
    )
  }, [fboOptions, fboSearch])

  // Load API data when edit dialog opens
  React.useEffect(() => {
    if (dialogOpen) {
      fetchClients()
      fetchCaterers(undefined, true)
      fetchAirports(undefined, true)
      fetchFBOs(undefined, true)
      fetchMenuItems()
      fetchCategories()
    }
  }, [dialogOpen, fetchClients, fetchCaterers, fetchAirports, fetchFBOs, fetchMenuItems, fetchCategories])

  // Reset form when editingOrder and options are ready (backup in case handleEdit timing is off)
  React.useEffect(() => {
    if (dialogOpen && editingOrder && clientOptions.length > 0 && catererOptions.length > 0 && airportOptions.length > 0) {
      // Only reset if we haven't already reset for this order
      if (lastResetOrderId.current !== editingOrder.id) {
        lastResetOrderId.current = editingOrder.id
        setIsLoadingFormData(true)
        
        // Map order items to form format
        // Try to find menu item by ID first, then by name if ID is not available
        const formItems = editingOrder.items && editingOrder.items.length > 0
          ? editingOrder.items.map((item) => {
              // First try item_id or menu_item_id
              let itemName = item.item_id?.toString() || item.menu_item_id?.toString() || ""
              
              // If no ID, try to find by name using context getter
              if (!itemName && item.item_name) {
                const foundMenuItem = getMenuItemByName(item.item_name)
                if (foundMenuItem) {
                  itemName = foundMenuItem.id.toString()
                }
              }
              
              return {
                itemName,
                itemDescription: item.item_description || "",
                portionSize: item.portion_size || "1",
                portionServing: item.portion_serving || "",
                price: typeof item.price === 'number' ? item.price.toString() : (item.price || "0"),
                category: item.category || "",
                packaging: item.packaging || "",
              }
            })
          : [{
              itemName: "",
              itemDescription: "",
              portionSize: "1",
              portionServing: "",
              price: "",
              category: "",
              packaging: "",
            }]

        // Format delivery date for HTML date input (YYYY-MM-DD)
        const formattedDeliveryDate = formatDateForInput(editingOrder.delivery_date)
        
        // Map order type from API format to form format
        const mappedOrderType = mapOrderTypeToForm(editingOrder.order_type)

        // Reset form with all order data - ensure all fields are populated
        form.reset({
          order_number: editingOrder.order_number || "",
          client_id: editingOrder.client_id,
          caterer_id: editingOrder.caterer_id,
          airport_id: editingOrder.airport_id,
          fbo_id: editingOrder.fbo_id || undefined,
          aircraftTailNumber: editingOrder.aircraft_tail_number || "",
          deliveryDate: formattedDeliveryDate,
          deliveryTime: editingOrder.delivery_time || "",
          orderPriority: (editingOrder.order_priority as "low" | "normal" | "high" | "urgent") || "normal",
          orderType: mappedOrderType,
          status: editingOrder.status,
          description: editingOrder.description || "",
          notes: editingOrder.notes || "",
          reheatingInstructions: editingOrder.reheating_instructions || "",
          packagingInstructions: editingOrder.packaging_instructions || "",
          dietaryRestrictions: editingOrder.dietary_restrictions || "",
          serviceCharge: editingOrder.service_charge?.toString() || "0",
          deliveryFee: editingOrder.delivery_fee?.toString() || "0",
          coordinationFee: editingOrder.coordination_fee?.toString() || "0",
          airportFee: editingOrder.airport_fee?.toString() || "0",
          fboFee: editingOrder.fbo_fee?.toString() || "0",
          shoppingFee: editingOrder.shopping_fee?.toString() || "0",
          restaurantPickupFee: editingOrder.restaurant_pickup_fee?.toString() || "0",
          airportPickupFee: editingOrder.airport_pickup_fee?.toString() || "0",
          paymentMethod: (editingOrder.payment_method as "card" | "ACH") || undefined,
          items: formItems,
        })

        // Explicitly set delivery date and order type to ensure they're recognized
        if (formattedDeliveryDate) {
          form.setValue("deliveryDate", formattedDeliveryDate, { shouldValidate: false })
        }
        if (mappedOrderType) {
          form.setValue("orderType", mappedOrderType, { shouldValidate: false })
        }
        
        // Explicitly set caterer_id, airport_id, and client_id to ensure Combobox components recognize them
        if (editingOrder.caterer_id) {
          form.setValue("caterer_id", editingOrder.caterer_id, { shouldValidate: false })
        }
        if (editingOrder.airport_id) {
          form.setValue("airport_id", editingOrder.airport_id, { shouldValidate: false })
        }
        if (editingOrder.client_id) {
          form.setValue("client_id", editingOrder.client_id, { shouldValidate: false })
        }
        if (editingOrder.fbo_id) {
          form.setValue("fbo_id", editingOrder.fbo_id, { shouldValidate: false })
        }
        
        // Explicitly set menu items to ensure Combobox components recognize them
        formItems.forEach((item, index) => {
          if (item.itemName) {
            form.setValue(`items.${index}.itemName`, item.itemName, { shouldValidate: false })
          }
        })
        
        // Set values again after a brief delay to ensure Combobox components recognize them
        setTimeout(() => {
          if (editingOrder.caterer_id) {
            form.setValue("caterer_id", editingOrder.caterer_id, { shouldValidate: false })
          }
          if (editingOrder.airport_id) {
            form.setValue("airport_id", editingOrder.airport_id, { shouldValidate: false })
          }
          if (editingOrder.client_id) {
            form.setValue("client_id", editingOrder.client_id, { shouldValidate: false })
          }
          if (editingOrder.fbo_id) {
            form.setValue("fbo_id", editingOrder.fbo_id, { shouldValidate: false })
          }
          formItems.forEach((item, index) => {
            if (item.itemName) {
              form.setValue(`items.${index}.itemName`, item.itemName, { shouldValidate: false })
            }
          })
          // Form is fully populated, hide loader
          setIsLoadingFormData(false)
        }, 200)
      }
    }
  }, [dialogOpen, editingOrder, clientOptions.length, catererOptions.length, airportOptions.length, menuItemOptions.length, form, getMenuItemByName])

  // Debounced server-side search for caterers
  React.useEffect(() => {
    if (!dialogOpen) return
    
    const timeoutId = setTimeout(() => {
      if (catererSearch.trim()) {
        fetchCaterers(catererSearch, false)
      } else {
        fetchCaterers(undefined, false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [catererSearch, dialogOpen, fetchCaterers])

  // Debounced server-side search for airports
  React.useEffect(() => {
    if (!dialogOpen) return
    
    const timeoutId = setTimeout(() => {
      if (airportSearch.trim()) {
        fetchAirports(airportSearch, false)
      } else {
        fetchAirports(undefined, false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [airportSearch, dialogOpen, fetchAirports])

  // Debounced server-side search for FBOs
  React.useEffect(() => {
    if (!dialogOpen) return
    
    const timeoutId = setTimeout(() => {
      if (fboSearch.trim()) {
        fetchFBOs(fboSearch, false)
      } else {
        fetchFBOs(undefined, false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [fboSearch, dialogOpen, fetchFBOs])

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
      const data: Order = await apiCallJson(`/orders/${order.id}`)
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
      const fullOrder: Order = await apiCallJson(`/orders/${order.id}`)
      
      // Format delivery date for HTML date input (YYYY-MM-DD)
      const formattedDeliveryDate = formatDateForInput(fullOrder.delivery_date)
      
      // Map order type from API format to form format
      const mappedOrderType = mapOrderTypeToForm(fullOrder.order_type)
      
      // Store order data in sessionStorage for the POS page to pick up
      // Store both original and mapped values to ensure compatibility
      const duplicateData = {
        order_number: "", // Clear order number for duplicate (new order will get new number)
        client_id: fullOrder.client_id,
        caterer_id: fullOrder.caterer_id,
        airport_id: fullOrder.airport_id,
        fbo_id: fullOrder.fbo_id || undefined,
        aircraft_tail_number: fullOrder.aircraft_tail_number || "",
        order_priority: fullOrder.order_priority || "normal",
        order_type: mappedOrderType || fullOrder.order_type || undefined, // Use mapped, fallback to original
        order_type_original: fullOrder.order_type || undefined, // Store original for debugging
        payment_method: (fullOrder.payment_method as "card" | "ACH") || undefined,
        service_charge: fullOrder.service_charge || 0,
        delivery_fee: fullOrder.delivery_fee || 0,
        description: fullOrder.description || "",
        notes: fullOrder.notes || "",
        reheating_instructions: fullOrder.reheating_instructions || "",
        packaging_instructions: fullOrder.packaging_instructions || "",
        dietary_restrictions: fullOrder.dietary_restrictions || "",
        delivery_date: formattedDeliveryDate, // Include formatted delivery date
        delivery_time: fullOrder.delivery_time || "", // Include delivery time
        items: fullOrder.items?.map(item => ({
          itemName: item.item_id?.toString() || item.menu_item_id?.toString() || "",
          item_id: item.item_id, // Store original ID for fallback
          menu_item_id: item.menu_item_id, // Store original menu_item_id for fallback
          item_name: item.item_name || "", // Store item name for lookup by name
          itemDescription: item.item_description || "",
          portionSize: item.portion_size || "1",
          portionServing: item.portion_serving || "",
          price: typeof item.price === 'number' ? item.price.toString() : (item.price || "0"),
          category: item.category || "",
          packaging: item.packaging || "",
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
      // Clear search states to ensure filtered options include all options
      setClientSearch("")
      setCatererSearch("")
      setAirportSearch("")
      setFboSearch("")
      setMenuItemSearch("")
      
      // Open dialog first to trigger data fetching
      setDialogOpen(true)
      setIsLoadingFormData(true)
      
      const fullOrder: Order = await apiCallJson(`/orders/${order.id}`)
      setEditingOrder(fullOrder)

      // Fetch all required data using contexts (they fetch ALL data, not just 1000)
      // This ensures we have all caterers, airports, etc. available for matching
      await Promise.all([
        fetchClientsFromContext(),
        fetchCaterersFromContext(),
        fetchAirportsFromContext(),
        fetchFBOsFromContext(),
        fetchMenuItemsFromContext(),
        fetchCategories(),
      ])
      
      // Use context data directly - contexts have ALL data loaded
      const loadedClientOptions = clientOptions
      const loadedCatererOptions = catererOptions
      const loadedAirportOptions = airportOptions
      const loadedFboOptions = fboOptions
      const loadedMenuItemOptions = menuItemOptions
      
      // Map order items to form format
      // Try to find menu item by ID first, then by name if ID is not available
      const formItems = fullOrder.items && fullOrder.items.length > 0
        ? fullOrder.items.map((item) => {
            // First try item_id or menu_item_id
            let itemName = item.item_id?.toString() || item.menu_item_id?.toString() || ""
            
            // If no ID, try to find by name using context getter
            if (!itemName && item.item_name) {
              const foundMenuItem = getMenuItemByName(item.item_name)
              if (foundMenuItem) {
                itemName = foundMenuItem.id.toString()
              }
            }
            
            return {
              itemName,
              itemDescription: item.item_description || "",
              portionSize: item.portion_size || "1",
              portionServing: item.portion_serving || "",
              price: typeof item.price === 'number' ? item.price.toString() : (item.price || "0"),
              category: item.category || "",
              packaging: item.packaging || "",
            }
          })
        : [{
            itemName: "",
            itemDescription: "",
            portionSize: "1",
            portionServing: "",
            price: "",
            category: "",
            packaging: "",
          }]
      
      // Mark that we're resetting for this order
      lastResetOrderId.current = fullOrder.id

      // Format delivery date for HTML date input (YYYY-MM-DD)
      const formattedDeliveryDate = formatDateForInput(fullOrder.delivery_date)
      
      // Map order type from API format to form format
      const mappedOrderType = mapOrderTypeToForm(fullOrder.order_type)

      // Reset form with all order data - ensure all fields are populated
      form.reset({
        order_number: fullOrder.order_number || "",
        client_id: fullOrder.client_id,
        caterer_id: fullOrder.caterer_id,
        airport_id: fullOrder.airport_id,
        fbo_id: fullOrder.fbo_id || undefined,
        aircraftTailNumber: fullOrder.aircraft_tail_number || "",
        deliveryDate: formattedDeliveryDate,
        deliveryTime: fullOrder.delivery_time || "",
        orderPriority: (fullOrder.order_priority as "low" | "normal" | "high" | "urgent") || "normal",
        orderType: mappedOrderType,
        status: fullOrder.status,
        description: fullOrder.description || "",
        notes: fullOrder.notes || "",
        reheatingInstructions: fullOrder.reheating_instructions || "",
        packagingInstructions: fullOrder.packaging_instructions || "",
        dietaryRestrictions: fullOrder.dietary_restrictions || "",
        serviceCharge: fullOrder.service_charge?.toString() || "0",
        deliveryFee: fullOrder.delivery_fee?.toString() || "0",
        coordinationFee: fullOrder.coordination_fee?.toString() || "0",
        airportFee: fullOrder.airport_fee?.toString() || "0",
        fboFee: fullOrder.fbo_fee?.toString() || "0",
        shoppingFee: fullOrder.shopping_fee?.toString() || "0",
        restaurantPickupFee: fullOrder.restaurant_pickup_fee?.toString() || "0",
        airportPickupFee: fullOrder.airport_pickup_fee?.toString() || "0",
        paymentMethod: (fullOrder.payment_method as "card" | "ACH") || undefined,
        items: formItems,
      })

      // Explicitly set values to ensure Combobox components recognize them
      // This helps with timing issues where the form might not immediately reflect the reset
      if (formattedDeliveryDate) {
        form.setValue("deliveryDate", formattedDeliveryDate, { shouldValidate: false })
      }
      if (mappedOrderType) {
        form.setValue("orderType", mappedOrderType, { shouldValidate: false })
      }
      
      // Explicitly set caterer_id, airport_id, and client_id to ensure Combobox components recognize them
      // Check if options exist using the directly loaded options (compare as strings)
      const catererIdStr = fullOrder.caterer_id?.toString()
      const airportIdStr = fullOrder.airport_id?.toString()
      const clientIdStr = fullOrder.client_id?.toString()
      const fboIdStr = fullOrder.fbo_id?.toString()
      
      const catererExists = catererIdStr && loadedCatererOptions.some(opt => opt.value === catererIdStr)
      const airportExists = airportIdStr && loadedAirportOptions.some(opt => opt.value === airportIdStr)
      const clientExists = clientIdStr && loadedClientOptions.some(opt => opt.value === clientIdStr)
      const fboExists = fboIdStr ? loadedFboOptions.some(opt => opt.value === fboIdStr) : false
      
      if (fullOrder.caterer_id) {
        // Always set the value, even if option check fails (options might not be fully loaded)
        form.setValue("caterer_id", fullOrder.caterer_id, { shouldValidate: false })
      }
      if (fullOrder.airport_id) {
        form.setValue("airport_id", fullOrder.airport_id, { shouldValidate: false })
      }
      if (fullOrder.client_id) {
        form.setValue("client_id", fullOrder.client_id, { shouldValidate: false })
      }
      if (fullOrder.fbo_id) {
        form.setValue("fbo_id", fullOrder.fbo_id, { shouldValidate: false })
      }
      
      // Explicitly set menu items to ensure Combobox components recognize them
      formItems.forEach((item, index) => {
        if (item.itemName) {
          const menuItemExists = loadedMenuItemOptions.some(opt => opt.value === item.itemName)
          form.setValue(`items.${index}.itemName`, item.itemName, { shouldValidate: false })
        }
      })
      
      // Force a small delay and set values again to ensure Combobox components have updated
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Set values again after a brief delay to ensure Combobox components recognize them
      if (fullOrder.caterer_id) {
        form.setValue("caterer_id", fullOrder.caterer_id, { shouldValidate: false })
      }
      if (fullOrder.airport_id) {
        form.setValue("airport_id", fullOrder.airport_id, { shouldValidate: false })
      }
      if (fullOrder.client_id) {
        form.setValue("client_id", fullOrder.client_id, { shouldValidate: false })
      }
      if (fullOrder.fbo_id) {
        form.setValue("fbo_id", fullOrder.fbo_id, { shouldValidate: false })
      }
      formItems.forEach((item, index) => {
        if (item.itemName) {
          form.setValue(`items.${index}.itemName`, item.itemName, { shouldValidate: false })
        }
      })
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch order details"
      toast.error("Error loading order", {
        description: errorMessage,
      })
      setDialogOpen(false)
    }
  }

  // Handle save (edit only, as orders are created from POS)
  const handleSave = async (values: OrderFormValues) => {
    if (!editingOrder) return

    try {
      const body: any = {
        order_number: values.order_number?.trim() || null,
        client_id: values.client_id,
        caterer_id: values.caterer_id,
        airport_id: values.airport_id,
        fbo_id: values.fbo_id || null,
        aircraft_tail_number: values.aircraftTailNumber || null,
        delivery_date: values.deliveryDate,
        delivery_time: values.deliveryTime,
        order_priority: values.orderPriority,
        order_type: values.orderType || null,
        payment_method: values.paymentMethod,
        status: values.status,
        service_charge: values.serviceCharge && values.serviceCharge.trim() ? parseFloat(values.serviceCharge) : 0,
        delivery_fee: values.deliveryFee && values.deliveryFee.trim() ? parseFloat(values.deliveryFee) : 0,
        coordination_fee: values.coordinationFee && values.coordinationFee.trim() ? parseFloat(values.coordinationFee) : 0,
        airport_fee: values.airportFee && values.airportFee.trim() ? parseFloat(values.airportFee) : 0,
        fbo_fee: values.fboFee && values.fboFee.trim() ? parseFloat(values.fboFee) : 0,
        shopping_fee: values.shoppingFee && values.shoppingFee.trim() ? parseFloat(values.shoppingFee) : 0,
        restaurant_pickup_fee: values.restaurantPickupFee && values.restaurantPickupFee.trim() ? parseFloat(values.restaurantPickupFee) : 0,
        airport_pickup_fee: values.airportPickupFee && values.airportPickupFee.trim() ? parseFloat(values.airportPickupFee) : 0,
        description: values.description || null,
        notes: values.notes || null,
        reheating_instructions: values.reheatingInstructions || null,
        packaging_instructions: values.packagingInstructions || null,
        dietary_restrictions: values.dietaryRestrictions || null,
        items: values.items.map((item) => {
          const itemId = parseInt(item.itemName)
          const menuItem = menuItemsData.find((mi) => mi.id === itemId)
          const itemName = menuItem?.item_name || menuItemOptions.find((opt) => opt.value === item.itemName)?.label || ""
          
          return {
            item_id: itemId,
            item_name: itemName,
            item_description: item.itemDescription || null,
            portion_size: item.portionSize,
            portion_serving: item.portionServing?.trim() || "No#",
            price: parseFloat(item.price),
            category: item.category || null,
            packaging: item.packaging || null,
          }
        }),
      }

      // Use orders context for offline support
      const localId = (editingOrder as OrderWithSync)._localId
      const result = await updateOrderFromContext(
        localId || editingOrder.id,
        body
      )

      if (!result) {
        throw new Error("Failed to update order")
      }

      // Show appropriate toast based on sync status
      if (result._syncStatus === "pending_update") {
        toast.success("Order saved offline", {
          description: `Order ${editingOrder.order_number} will sync when online`,
        })
      } else {
        toast.success("Order updated", {
          description: `Order ${editingOrder.order_number} has been updated successfully.`,
        })
      }

      setDialogOpen(false)
      setEditingOrder(null)
      lastResetOrderId.current = null
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
      // Use orders context for offline support
      const localId = (orderToDelete as OrderWithSync)._localId
      const success = await deleteOrderFromContext(localId || orderToDelete.id)

      if (!success) {
        throw new Error("Failed to delete order")
      }

      toast.success("Order deleted", {
        description: `Order ${orderToDelete.order_number} has been deleted${!isOnline ? " (will sync when online)" : ""}.`,
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

  // Handle archive/unarchive
  const handleArchive = async (order: Order, archive: boolean) => {
    setIsArchiving(true)
    try {
      await apiCallJson(`/orders/${order.id}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ is_archived: archive }),
      })

      toast.success(archive ? "Order archived" : "Order unarchived", {
        description: `Order ${order.order_number} has been ${archive ? "archived" : "unarchived"} successfully.`,
      })

      fetchOrders()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${archive ? "archive" : "unarchive"} order`
      toast.error(`Error ${archive ? "archiving" : "unarchiving"} order`, {
        description: errorMessage,
      })
    } finally {
      setIsArchiving(false)
    }
  }

  // Handle price lock toggle
  const handlePriceLockToggle = async (order: Order) => {
    const newLockState = !order.is_price_locked
    setTogglingPriceLock(order.id)
    try {
      await apiCallJson(`/orders/${order.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_price_locked: newLockState }),
      })

      // Update local state immediately for responsive UI
      setOrders(prev => prev.map(o =>
        o.id === order.id ? { ...o, is_price_locked: newLockState } : o
      ))

      toast.success(newLockState ? "Price locked" : "Price unlocked", {
        description: `Order ${order.order_number} price is now ${newLockState ? "locked - changes to prices will show a warning" : "unlocked"}.`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update price lock"
      toast.error("Error updating price lock", {
        description: errorMessage,
      })
    } finally {
      setTogglingPriceLock(null)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedOrders.size === 0) return

    setIsDeleting(true)
    try {
      const data = await apiCallJson(`/orders`, {
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
      await apiCallJson(`/orders/${orderForStatusUpdate.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
        }),
      })

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

  // Helper function to get PDF endpoint
  // Backend now routes automatically based on order status:
  // - caterer_confirmed -> PDF B (no pricing, client info, status "caterer confirmed")
  // - delivered -> PDF A (with pricing, client info)
  // - Other statuses -> PDF A (default)
  const getPdfEndpoint = (orderId: number, status: OrderStatus, type: "preview" | "download"): string => {
    if (type === "preview") {
      return `${API_BASE_URL}/orders/${orderId}/preview`
    } else {
      return `${API_BASE_URL}/orders/${orderId}/pdf?regenerate=true`
    }
  }

  // Handle PDF preview
  const handlePdfPreview = async (order: Order, forceType?: "a" | "b") => {
    setOrderForPdf(order)
    setPdfPreviewOpen(true)
    setPdfHtml("") // Reset while loading

    try {
      // Determine endpoint path based on status or forced type
      let endpointPath: string
      if (forceType === "a") {
        endpointPath = `/orders/${order.id}/preview`
      } else if (forceType === "b") {
        endpointPath = `/orders/${order.id}/preview-b`
      } else {
        // Extract path from full URL
        const fullEndpoint = getPdfEndpoint(order.id, order.status, "preview")
        endpointPath = fullEndpoint.replace(API_BASE_URL, "")
      }

      // Use apiCallJson to include authentication headers
      const data = await apiCallJson<{ html: string }>(endpointPath)
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
  const handlePdfDownload = async (order: Order, forceType?: "a" | "b") => {
    toast.loading("Generating PDF...", { id: `pdf-${order.id}` })

    try {
      // Determine endpoint based on status or forced type
      let endpoint: string
      if (forceType === "a") {
        endpoint = `${API_BASE_URL}/orders/${order.id}/pdf?regenerate=true`
      } else if (forceType === "b") {
        endpoint = `${API_BASE_URL}/orders/${order.id}/pdf-b?regenerate=true`
      } else {
        endpoint = getPdfEndpoint(order.id, order.status, "download")
      }

      // Extract the path from the full URL for apiCall
      const urlPath = endpoint.replace(API_BASE_URL, "")
      const response = await apiCall(urlPath)

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
      // Add suffix to indicate PDF type
      const suffix = forceType === "a" ? "_invoice" : forceType === "b" ? "_confirmation" : ""
      link.download = `order_${order.order_number}${suffix}.pdf`
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

  // Handle Invoice download (always uses PDF A with prices)
  const handleInvoiceDownload = async (order: Order) => {
    await handlePdfDownload(order, "a")
  }

  // Handle Invoice preview (always uses PDF A with prices)
  const handleInvoicePreview = async (order: Order) => {
    await handlePdfPreview(order, "a")
  }

  // Handle email send
  const handleEmailSend = (order: Order) => {
    setOrderForEmail(order)
    setCustomClientMessage("")
    setCustomCatererMessage("")
    setEmailRecipient("client")
    setSelectedFriendEmails(new Set())
    setManualCcEmails("")
    setEmailDialogOpen(true)
  }

  const confirmEmailSend = async () => {
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

  // Handle sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  // Get status badge with tooltip
  const getStatusBadge = (status: OrderStatus | "completed") => {
    const normalizedStatus: OrderStatus = status === "completed" ? "delivered" : status
    const statusOption = statusOptions.find((s) => s.value === normalizedStatus)
    const statusConfig = getOrderStatusConfig(normalizedStatus)
    const tooltipContent = getStatusTooltipContent(normalizedStatus)
    
    const badge = (
      <Badge className={statusOption?.color || ""} variant="outline">
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
    
    // Fallback: use UTC methods
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ""
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
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
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Order Management
                      </CardTitle>
                      {!isOnline && (
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                          <span className="mr-1.5 h-2 w-2 rounded-full bg-amber-500 inline-block" />
                          Offline
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1.5">
                      {isOnline
                        ? "View and manage all orders, track status, and communicate with clients and caterers"
                        : "Viewing cached orders. Changes will sync when online."}
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
                  {/* Archive Toggle */}
                  <Button
                    variant={showArchived ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowArchived(!showArchived)}
                    className="gap-2 h-10"
                  >
                    <Archive className="h-4 w-4" />
                    {showArchived ? "Showing Archived" : "Show Archived"}
                  </Button>
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
                              sortOrder === "asc" ? (
                                <ArrowUp className="ml-2 h-3 w-3" />
                              ) : (
                                <ArrowDown className="ml-2 h-3 w-3" />
                              )
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
                              sortOrder === "asc" ? (
                                <ArrowUp className="ml-2 h-3 w-3" />
                              ) : (
                                <ArrowDown className="ml-2 h-3 w-3" />
                              )
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
                            Payment
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            Type
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold w-20 text-center">
                          <div className="flex items-center justify-center gap-1" title="Price locked - agreed with client">
                            <Lock className="h-4 w-4 text-muted-foreground" />
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
                          <TableCell colSpan={10} className="h-24 text-center">
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
                              <div className="flex items-center gap-2">
                                <div className="truncate max-w-[120px]" title={order.order_number}>
                                  <span className="font-mono text-sm">{order.order_number}</span>
                                </div>
                                {(order as OrderWithSync)._syncStatus && (order as OrderWithSync)._syncStatus !== "synced" && (
                                  <SyncStatusBadge status={(order as OrderWithSync)._syncStatus!} size="sm" />
                                )}
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
                              <div className="flex flex-col gap-0.5">
                                <div className="truncate" title={order.airport_details?.airport_name ? decodeHtmlEntities(order.airport_details.airport_name) : "—"}>
                                  <span>{order.airport_details?.airport_name ? decodeHtmlEntities(order.airport_details.airport_name) : "—"}</span>
                                  {order.airport_details?.airport_code_icao && (
                                    <span className="ml-1.5 text-xs font-mono text-muted-foreground">
                                      ({order.airport_details.airport_code_icao})
                                    </span>
                                  )}
                                </div>
                                {order.fbo?.fbo_name && (
                                  <div className="text-xs text-muted-foreground truncate" title={order.fbo.fbo_name}>
                                    <Building2 className="h-3 w-3 inline mr-1" />
                                    {order.fbo.fbo_name}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[120px]">
                              <div className="flex flex-col gap-0.5">
                                <div className="text-xs text-muted-foreground truncate">
                                  {formatDateForDisplay(order.delivery_date)}
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
                              {isAdmin ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Badge
                                      className={order.is_paid ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-gray-500/10 text-gray-600 border-gray-500/20"}
                                      variant="outline"
                                      style={{ cursor: 'pointer' }}
                                    >
                                      {updatingPaymentStatus === order.id ? (
                                        <span className="flex items-center gap-2">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          Updating...
                                        </span>
                                      ) : (
                                        order.is_paid ? 'Paid' : 'Unpaid'
                                      )}
                                    </Badge>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      disabled={updatingPaymentStatus === order.id || order.is_paid === true}
                                      onClick={async () => {
                                        if (order.is_paid === true) return
                                        setUpdatingPaymentStatus(order.id)
                                        try {
                                          await apiCallJson(`/orders/${order.id}/payment-status`, {
                                            method: 'PATCH',
                                            body: JSON.stringify({ is_paid: true }),
                                          })
                                          toast.success('Order marked as paid')
                                          fetchOrders()
                                        } catch (error: any) {
                                          toast.error(error.message || 'Failed to update payment status')
                                        } finally {
                                          setUpdatingPaymentStatus(null)
                                        }
                                      }}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={updatingPaymentStatus === order.id || order.is_paid === false}
                                      onClick={async () => {
                                        if (order.is_paid === false) return
                                        setUpdatingPaymentStatus(order.id)
                                        try {
                                          await apiCallJson(`/orders/${order.id}/payment-status`, {
                                            method: 'PATCH',
                                            body: JSON.stringify({ is_paid: false }),
                                          })
                                          toast.success('Order marked as unpaid')
                                          fetchOrders()
                                        } catch (error: any) {
                                          toast.error(error.message || 'Failed to update payment status')
                                        } finally {
                                          setUpdatingPaymentStatus(null)
                                        }
                                      }}
                                    >
                                      <X className="h-4 w-4 mr-2 text-gray-600" />
                                      Mark as Unpaid
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <Badge
                                  className={order.is_paid ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-gray-500/10 text-gray-600 border-gray-500/20"}
                                  variant="outline"
                                >
                                  {order.is_paid ? 'Paid' : 'Unpaid'}
                                </Badge>
                              )}
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
                            <TableCell className="text-center">
                              <button
                                onClick={() => handlePriceLockToggle(order)}
                                disabled={togglingPriceLock === order.id}
                                className={`p-1.5 rounded-md transition-colors ${
                                  order.is_price_locked
                                    ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                }`}
                                title={order.is_price_locked ? "Price locked - click to unlock" : "Click to lock price (mark as quoted)"}
                              >
                                {togglingPriceLock === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : order.is_price_locked ? (
                                  <Lock className="h-4 w-4" />
                                ) : (
                                  <LockOpen className="h-4 w-4" />
                                )}
                              </button>
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
                                    {order.status === "awaiting_client_approval" ? "Preview Quote" : "Preview Order"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handlePdfDownload(order)}
                                    className="cursor-pointer"
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    {order.status === "awaiting_client_approval" ? "Download Quote" : "Download Order"}
                                  </DropdownMenuItem>
                                  {/* Show Invoice option for delivered orders or any order that might need an invoice */}
                                  {order.status === "delivered" && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleInvoicePreview(order)}
                                        className="cursor-pointer"
                                      >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Preview Invoice
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleInvoiceDownload(order)}
                                        className="cursor-pointer"
                                      >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Invoice
                                      </DropdownMenuItem>
                                    </>
                                  )}
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
                                  {/* Payment processing - Admin only, show for non-paid orders */}
                                  {isAuthenticated && !order.is_paid && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={async (e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          setPaymentOrder(order)
                                          setPaymentModalOpen(true)
                                          if (order.client_id) {
                                            try {
                                              const response = await getStoredCards(order.client_id)
                                              setPaymentStoredCards(response.cards)
                                            } catch (error) {
                                              console.error('Failed to load stored cards:', error)
                                              setPaymentStoredCards([])
                                            }
                                          }
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Process Payment
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          setInvoiceOrder(order)
                                          setInvoiceModalOpen(true)
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Invoice
                                      </DropdownMenuItem>
                                    </>
                                  )}
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
                                    onClick={() => handleArchive(order, !order.is_archived)}
                                    className="cursor-pointer"
                                    disabled={isArchiving}
                                  >
                                    {order.is_archived ? (
                                      <>
                                        <ArchiveRestore className="mr-2 h-4 w-4" />
                                        Unarchive
                                      </>
                                    ) : (
                                      <>
                                        <Archive className="mr-2 h-4 w-4" />
                                        Archive
                                      </>
                                    )}
                                  </DropdownMenuItem>
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
                                  <p className="text-sm font-medium">{decodeHtmlEntities(viewingOrder.airport_details.airport_name)}</p>
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
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* FBO Information Card */}
                        {viewingOrder.fbo && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-amber-500" />
                                FBO Information
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    FBO Name
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.fbo.fbo_name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    FBO Email
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.fbo.fbo_email || "—"}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    FBO Phone
                                  </Label>
                                  <p className="text-sm font-medium">{viewingOrder.fbo.fbo_phone || "—"}</p>
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
                                  {parseFloat(String(viewingOrder.coordination_fee || 0)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Coordination Fee:</span>
                                      <span className="font-medium">${parseFloat(String(viewingOrder.coordination_fee)).toFixed(2)}</span>
                                    </div>
                                  )}
                                  {parseFloat(String(viewingOrder.airport_fee || 0)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Airport Fee:</span>
                                      <span className="font-medium">${parseFloat(String(viewingOrder.airport_fee)).toFixed(2)}</span>
                                    </div>
                                  )}
                                  {parseFloat(String(viewingOrder.fbo_fee || 0)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">FBO Fee:</span>
                                      <span className="font-medium">${parseFloat(String(viewingOrder.fbo_fee)).toFixed(2)}</span>
                                    </div>
                                  )}
                                  {parseFloat(String(viewingOrder.shopping_fee || 0)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Shopping Fee:</span>
                                      <span className="font-medium">${parseFloat(String(viewingOrder.shopping_fee)).toFixed(2)}</span>
                                    </div>
                                  )}
                                  {parseFloat(String(viewingOrder.restaurant_pickup_fee || 0)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Restaurant Pickup Fee:</span>
                                      <span className="font-medium">${parseFloat(String(viewingOrder.restaurant_pickup_fee)).toFixed(2)}</span>
                                    </div>
                                  )}
                                  {parseFloat(String(viewingOrder.airport_pickup_fee || 0)) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Airport Pickup Fee:</span>
                                      <span className="font-medium">${parseFloat(String(viewingOrder.airport_pickup_fee)).toFixed(2)}</span>
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
                        className="flex-1 min-w-[100px] gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        {viewingOrder && viewingOrder.status === "awaiting_client_approval" ? "Quote" : "Preview"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (viewingOrder) {
                            handlePdfDownload(viewingOrder)
                          }
                        }}
                        className="flex-1 min-w-[100px] gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {viewingOrder && viewingOrder.status === "awaiting_client_approval" ? "Quote PDF" : "Order PDF"}
                      </Button>
                      {/* Show Invoice button for delivered orders */}
                      {viewingOrder?.status === "delivered" && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (viewingOrder) {
                              handleInvoiceDownload(viewingOrder)
                            }
                          }}
                          className="flex-1 min-w-[100px] gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Invoice
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (viewingOrder) {
                            handleEmailSend(viewingOrder)
                          }
                        }}
                        className="flex-1 min-w-[100px] gap-2"
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
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) {
                setIsLoadingFormData(false)
              }
            }}>
              <DialogContent className={isMobile ? "!max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] m-0 rounded-none overflow-hidden flex flex-col p-0 gap-0" : "!max-w-[98vw] w-[98vw] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0"}>
                <DialogHeader className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-border/30 bg-gradient-to-b from-background to-background/95 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg" />
                      <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                        <Edit className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text truncate">
                        Edit Order {editingOrder?.order_number}
                      </DialogTitle>
                      <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Update all order information including items, client, and delivery details
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto scrollbar-hide relative" style={{ maxHeight: isMobile ? 'calc(100vh - 140px)' : undefined }}>
                  {isLoadingFormData && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-foreground">Loading order data...</p>
                        <p className="text-xs text-muted-foreground">Please wait while we populate the form</p>
                      </div>
                    </div>
                  )}
                  <div className={`p-4 sm:p-6 lg:p-8 ${isMobile ? 'pb-24' : ''}`}>
                    <Card className="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-b from-card via-card to-card/95 shadow-2xl shadow-black/40 ring-1 ring-white/[0.05]">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                      <CardContent className="relative pt-6 pb-6 px-4 sm:px-6 lg:px-8">
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-8">
                            {/* Client & Order Information Section */}
                            <section className="space-y-5">
                        <div className="flex items-center gap-3 pb-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 ring-1 ring-blue-500/20">
                            <User className="h-4 w-4 text-blue-400" />
                          </div>
                          <h2 className="text-sm font-semibold tracking-wide text-foreground">Client & Order Information</h2>
                          <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
                        </div>
                        <div className={`grid gap-4 sm:gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'}`}>
                          <FormField
                            control={form.control}
                            name="order_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Order Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., KA000001" 
                                    {...field}
                                    className="text-sm"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="client_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Client *</FormLabel>
                                <FormControl>
                                  <Combobox
                                    options={clientOptions}
                                    value={field.value?.toString() || ""}
                                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                                    placeholder="Select client..."
                                    searchPlaceholder="Search clients..."
                                    emptyMessage="No clients found."
                                    onSearchChange={setClientSearch}
                                    isLoading={isLoadingClients}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="caterer_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Caterer *</FormLabel>
                                <FormControl>
                                  <Combobox
                                    options={filteredCatererOptions}
                                    value={field.value?.toString() || ""}
                                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                                    placeholder="Select caterer..."
                                    searchPlaceholder="Search caterers..."
                                    emptyMessage="No caterers found."
                                    onSearchChange={setCatererSearch}
                                    isLoading={isLoadingCaterers}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="airport_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Airport *</FormLabel>
                                <FormControl>
                                  <Combobox
                                    options={filteredAirportOptions}
                                    value={field.value?.toString() || ""}
                                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                                    placeholder="Select airport..."
                                    searchPlaceholder="Search airports..."
                                    emptyMessage="No airports found."
                                    onSearchChange={setAirportSearch}
                                    isLoading={isLoadingAirports}
                                    onOpenChange={handleAirportComboboxOpen}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="fbo_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">FBO</FormLabel>
                                <FormControl>
                                  <Combobox
                                    options={filteredFboOptions}
                                    value={field.value?.toString() || ""}
                                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                                    placeholder="Select FBO..."
                                    searchPlaceholder="Search FBOs..."
                                    emptyMessage="No FBOs found."
                                    onSearchChange={setFboSearch}
                                    isLoading={isLoadingFBOs}
                                    onOpenChange={handleFboComboboxOpen}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="aircraftTailNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Tail Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="N123AB" {...field} />
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
                                <FormLabel className="text-xs font-medium text-muted-foreground">Delivery Date *</FormLabel>
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
                                <FormLabel className="text-xs font-medium text-muted-foreground">Delivery Time *</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="orderPriority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Priority *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="low">
                                      <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        Low
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="normal">
                                      <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                                        Normal
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="high">
                                      <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                                        High
                                      </span>
                                    </SelectItem>
                                    <SelectItem 
                                      value="urgent"
                                      disabled={isDelivered}
                                      className={isDelivered ? "opacity-50 cursor-not-allowed" : ""}
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-red-500" />
                                        Urgent
                                        {isDelivered && (
                                          <span className="text-xs text-muted-foreground ml-2">
                                            (Not available for paid/delivered orders)
                                          </span>
                                        )}
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="serviceCharge"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Service Charge</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="deliveryFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Delivery Fee</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="coordinationFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Coordination Fee</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="airportFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Airport Fee</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="fboFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">FBO Fee</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="shoppingFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Shopping Fee</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="restaurantPickupFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Restaurant Pickup Fee</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="airportPickupFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Airport Pickup Fee</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="orderType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Order Type *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="inflight">Inflight order</SelectItem>
                                    <SelectItem value="qe_serv_hub">QE Serv Hub Order</SelectItem>
                                    <SelectItem value="restaurant_pickup">Restaurant Pickup Order</SelectItem>
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
                                <FormLabel className="text-xs font-medium text-muted-foreground">Payment *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="ACH">ACH Transfer</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Status *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
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
                          {isAdmin && editingOrder && (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Payment Status</FormLabel>
                              <div className="flex items-center gap-3">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Badge
                                      className={editingOrder.is_paid ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-gray-500/10 text-gray-600 border-gray-500/20"}
                                      variant="outline"
                                      style={{ cursor: 'pointer' }}
                                    >
                                      {updatingPaymentStatus === editingOrder.id ? (
                                        <span className="flex items-center gap-2">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          Updating...
                                        </span>
                                      ) : (
                                        editingOrder.is_paid ? 'Paid' : 'Unpaid'
                                      )}
                                    </Badge>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      disabled={updatingPaymentStatus === editingOrder.id || editingOrder.is_paid === true}
                                      onClick={async () => {
                                        if (editingOrder.is_paid === true) return
                                        setUpdatingPaymentStatus(editingOrder.id)
                                        try {
                                          await apiCallJson(`/orders/${editingOrder.id}/payment-status`, {
                                            method: 'PATCH',
                                            body: JSON.stringify({ is_paid: true }),
                                          })
                                          toast.success('Order marked as paid')
                                          // Refresh the order data
                                          const updatedOrder = await apiCallJson(`/orders/${editingOrder.id}`)
                                          setEditingOrder(updatedOrder)
                                        } catch (error: any) {
                                          toast.error(error.message || 'Failed to update payment status')
                                        } finally {
                                          setUpdatingPaymentStatus(null)
                                        }
                                      }}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={updatingPaymentStatus === editingOrder.id || editingOrder.is_paid === false}
                                      onClick={async () => {
                                        if (editingOrder.is_paid === false) return
                                        setUpdatingPaymentStatus(editingOrder.id)
                                        try {
                                          await apiCallJson(`/orders/${editingOrder.id}/payment-status`, {
                                            method: 'PATCH',
                                            body: JSON.stringify({ is_paid: false }),
                                          })
                                          toast.success('Order marked as unpaid')
                                          // Refresh the order data
                                          const updatedOrder = await apiCallJson(`/orders/${editingOrder.id}`)
                                          setEditingOrder(updatedOrder)
                                        } catch (error: any) {
                                          toast.error(error.message || 'Failed to update payment status')
                                        } finally {
                                          setUpdatingPaymentStatus(null)
                                        }
                                      }}
                                    >
                                      <X className="h-4 w-4 mr-2 text-gray-600" />
                                      Mark as Unpaid
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </FormItem>
                          )}
                        </div>
                      </section>

                      {/* Description Section */}
                      <section className="space-y-5">
                        <div className="flex items-center gap-3 pb-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/10 ring-1 ring-violet-500/20">
                            <FileText className="h-4 w-4 text-violet-400" />
                          </div>
                          <h2 className="text-sm font-semibold tracking-wide text-foreground">Order Notes</h2>
                          <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
                        </div>
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Add any notes or special instructions for this order..."
                                  className="min-h-[80px] resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </section>

                      {/* Instructions Section */}
                      <section className="space-y-5">
                        <div className="flex items-center gap-3 pb-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 ring-1 ring-amber-500/20">
                            <Package className="h-4 w-4 text-amber-400" />
                          </div>
                          <h2 className="text-sm font-semibold tracking-wide text-foreground">Special Instructions</h2>
                          <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
                        </div>
                        <div className={`grid gap-4 sm:gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
                          <FormField
                            control={form.control}
                            name="reheatingInstructions"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Reheating</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="How should items be reheated?"
                                    className="min-h-[80px] resize-none text-sm"
                                    {...field}
                                  />
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
                                <FormLabel className="text-xs font-medium text-muted-foreground">Packaging</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Special packaging requirements..."
                                    className="min-h-[80px] resize-none text-sm"
                                    {...field}
                                  />
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
                                <FormLabel className="text-xs font-medium text-muted-foreground">Dietary Restrictions</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Allergies, dietary needs..."
                                    className="min-h-[80px] resize-none text-sm"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Additional Notes</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Any other notes..."
                                    className="min-h-[80px] resize-none text-sm"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </section>

                            {/* Items Section */}
                            <section className="space-y-5">
                              <div className="flex items-center justify-between pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 ring-1 ring-emerald-500/20">
                                    <UtensilsCrossed className="h-4 w-4 text-emerald-400" />
                                  </div>
                                  <h2 className="text-sm font-semibold tracking-wide text-foreground">Order Items</h2>
                                  <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                    {fields.length} item{fields.length !== 1 ? 's' : ''}
                                  </Badge>
                                  <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 border-0"
                                  onClick={() =>
                                    append({
                                      itemName: "",
                                      itemDescription: "",
                                      portionSize: "",
                                      portionServing: "",
                                      price: "",
                                      category: "",
                                      packaging: "",
                                    })
                                  }
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add Item
                                  <span className="ml-1.5 text-[10px] opacity-80 font-normal">
                                    {isMac ? '⌘I' : 'Ctrl+I'}
                                  </span>
                                </Button>
                              </div>

                              {fields.map((field, index) => {
                                const isCollapsed = collapsedItems.has(index)
                                const itemName = form.watch(`items.${index}.itemName`)
                                const displayName = getItemDisplayName(itemName)
                                const portionSize = form.watch(`items.${index}.portionSize`)
                                const portionServing = form.watch(`items.${index}.portionServing`)
                                const price = form.watch(`items.${index}.price`)
                                
                                return (
                                <div 
                                  key={field.id} 
                                  className="group relative p-4 sm:p-5 rounded-xl border border-border/30 bg-gradient-to-b from-muted/30 to-muted/10 space-y-4 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                                >
                                  <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                                  {/* Item Header */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="relative">
                                        <div className="absolute inset-0 bg-emerald-500/20 rounded-lg blur-sm group-hover:blur-md transition-all" />
                                        <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-xs font-bold text-white shadow-md">
                                          {index + 1}
                                        </span>
                                      </div>
                                      {isCollapsed ? (
                                        <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                                          <span className="text-sm font-semibold text-foreground">{displayName}</span>
                                          {price && (
                                            <span className="text-xs text-muted-foreground">${parseFloat(price.toString()).toFixed(2)}</span>
                                          )}
                                          {portionSize && (
                                            <span className="text-xs text-muted-foreground">Qty: {portionSize}</span>
                                          )}
                                          {portionServing && (
                                            <span className="text-xs text-muted-foreground">{portionServing}</span>
                                          )}
                                        </div>
                                      ) : (
                                      <div>
                                        <span className="text-sm font-semibold">Item {index + 1}</span>
                                        <p className="text-[11px] text-muted-foreground">Add menu item details</p>
                                      </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleItemCollapse(index)}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        title={isCollapsed ? "Expand item" : "Collapse item"}
                                      >
                                        {isCollapsed ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronUp className="h-4 w-4" />
                                        )}
                                      </Button>
                                    {fields.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          // Clean up manuallyEditedPrices when item is removed
                                          setManuallyEditedPrices(prev => {
                                            const next = new Set<number>()
                                            // Remove the deleted index and shift remaining indices down by 1
                                            prev.forEach(idx => {
                                              if (idx < index) {
                                                // Keep indices before the removed one as-is
                                                next.add(idx)
                                              } else if (idx > index) {
                                                // Shift indices after the removed one down by 1
                                                next.add(idx - 1)
                                              }
                                              // Skip the removed index itself
                                            })
                                            return next
                                          })
                                          remove(index)
                                        }}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                    </div>
                                  </div>

                                  {/* Item Fields */}
                                  {!isCollapsed && (
                                    <>
                                  {/* Item Fields - Row 1: Menu Item, Qty, Serving Size, Price, Category */}
                                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}>
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.itemName`}
                                      render={({ field }) => (
                                        <FormItem className="lg:col-span-1">
                                          <FormLabel className="text-xs font-medium text-muted-foreground">Menu Item *</FormLabel>
                                          <div className="flex gap-2">
                                            <FormControl>
                                              <Combobox
                                                options={menuItemOptions}
                                                value={field.value}
                                                onValueChange={(value) => {
                                                  field.onChange(value)
                                                  // Reset manual override flag when item changes
                                                  setManuallyEditedPrices(prev => {
                                                    const next = new Set(prev)
                                                    next.delete(index)
                                                    return next
                                                  })
                                                  
                                                  if (value) {
                                                    const itemId = parseInt(value)
                                                    const selectedItem = !isNaN(itemId) ? getMenuItemById(itemId) : undefined
                                                    if (selectedItem) {
                                                      // Get current portion size and caterer_id from form
                                                      const currentPortionSize = form.getValues(`items.${index}.portionSize`)
                                                      const catererId = form.getValues("caterer_id")
                                                      
                                                      // Resolve price based on caterer_id and portion size
                                                      let resolvedPrice = resolveMenuItemPrice(selectedItem, currentPortionSize || undefined, catererId)
                                                      
                                                      // If no price resolved, try first variant with caterer-specific price or base price
                                                      if (resolvedPrice === undefined && selectedItem.variants && selectedItem.variants.length > 0) {
                                                        const firstVariant = selectedItem.variants[0]
                                                        // Check for caterer-specific price in first variant
                                                        if (catererId && firstVariant.caterer_prices && firstVariant.caterer_prices.length > 0) {
                                                          const catererPrice = firstVariant.caterer_prices.find(cp => cp.caterer_id === catererId)
                                                          if (catererPrice) {
                                                            resolvedPrice = catererPrice.price
                                                          }
                                                        }
                                                        // Fallback to first variant's base price
                                                        if (resolvedPrice === undefined) {
                                                          resolvedPrice = firstVariant.price
                                                        }
                                                      }
                                                      
                                                      // Ultimate fallback: check for price directly on menu item (legacy support)
                                                      if (resolvedPrice === undefined && (selectedItem as any).price !== undefined) {
                                                        resolvedPrice = (selectedItem as any).price
                                                      }
                                                      
                                                      if (resolvedPrice !== undefined && resolvedPrice !== null) {
                                                        form.setValue(`items.${index}.price`, resolvedPrice.toString())
                                                      }
                                                      
                                                      if (selectedItem.item_description) {
                                                        form.setValue(`items.${index}.itemDescription`, selectedItem.item_description)
                                                      }
                                                      if (selectedItem.category) {
                                                        form.setValue(`items.${index}.category`, selectedItem.category)
                                                      }
                                                    }
                                                  }
                                                }}
                                                placeholder="Select item..."
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
                                      name={`items.${index}.portionSize`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-muted-foreground">Qty *</FormLabel>
                                          <FormControl>
                                            <Input 
                                              placeholder="1" 
                                              {...field}
                                              onChange={(e) => {
                                                field.onChange(e)
                                                // Reset manual override flag when portion size changes
                                                setManuallyEditedPrices(prev => {
                                                  const next = new Set(prev)
                                                  next.delete(index)
                                                  return next
                                                })
                                                
                                                // Recalculate price when portion size changes
                                                const itemName = form.getValues(`items.${index}.itemName`)
                                                const newPortionSize = e.target.value
                                                const catererId = form.getValues("caterer_id")
                                                
                                                if (itemName && newPortionSize) {
                                                  const itemId = parseInt(itemName)
                                                  const menuItem = !isNaN(itemId) ? getMenuItemById(itemId) : undefined
                                                  if (menuItem) {
                                                    const resolvedPrice = resolveMenuItemPrice(menuItem, newPortionSize, catererId)
                                                    if (resolvedPrice !== undefined) {
                                                      form.setValue(`items.${index}.price`, resolvedPrice.toString(), { shouldValidate: false })
                                                    }
                                                  }
                                                }
                                              }}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.portionServing`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-muted-foreground">Serving Size</FormLabel>
                                          <FormControl>
                                            <Input placeholder="500ml, 250g..." {...field} />
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
                                          <FormLabel className="text-xs font-medium text-muted-foreground">Price *</FormLabel>
                                          <FormControl>
                                            <div className="relative">
                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                              <Input 
                                                type="number" 
                                                step="0.01" 
                                                placeholder="0.00" 
                                                className="pl-7" 
                                                {...field}
                                                onChange={(e) => {
                                                  field.onChange(e)
                                                  // Mark this item as manually edited when user types in price
                                                  setManuallyEditedPrices(prev => new Set(prev).add(index))
                                                }}
                                              />
                                            </div>
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.category`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-muted-foreground">Category</FormLabel>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              placeholder="Enter or select category..."
                                              list={`category-list-${index}`}
                                              className="text-sm"
                                            />
                                          </FormControl>
                                          <datalist id={`category-list-${index}`}>
                                            {categoryOptions.map((cat) => (
                                              <option key={cat.value} value={cat.label} />
                                            ))}
                                          </datalist>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  {/* Item Fields - Row 2: Notes and Packaging */}
                                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.itemDescription`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-muted-foreground">Notes</FormLabel>
                                          <FormControl>
                                            <Textarea
                                              placeholder="Special instructions or notes..."
                                              className="min-h-[60px] resize-none text-sm"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.packaging`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-muted-foreground">Packaging</FormLabel>
                                          <FormControl>
                                            <Textarea
                                              placeholder="Enter packaging information for this item..."
                                              className="min-h-[60px] resize-none text-sm"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                    </>
                                  )}
                                </div>
                                )
                              })}
                              {form.formState.errors.items && (
                                <p className="text-sm text-destructive">
                                  {form.formState.errors.items.message}
                                </p>
                              )}
                            </section>

                            {/* Payment Section - Admin only */}
                            {isAuthenticated && editingOrder && !editingOrder.is_paid && (
                              <section className="space-y-5">
                                <div className="flex items-center gap-3 pb-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 ring-1 ring-green-500/20">
                                    <CreditCard className="h-4 w-4 text-green-400" />
                                  </div>
                                  <h2 className="text-sm font-semibold tracking-wide text-foreground">Payment</h2>
                                  <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
                                </div>
                                <div className="p-4 border rounded-lg bg-muted/50">
                                  <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'} mb-4`}>
                                    <div>
                                      <div className="text-sm font-medium">Order Total</div>
                                      <div className="text-2xl font-bold">${parseFloat(editingOrder.total.toString()).toFixed(2)}</div>
                                    </div>
                                    <div className={`flex ${isMobile ? 'flex-col gap-2 w-full' : 'items-center gap-2'}`}>
                                      <div className={isMobile ? 'w-full [&>button]:w-full' : ''}>
                                        <PaymentButton
                                          orderId={editingOrder.id!}
                                          orderNumber={editingOrder.order_number}
                                          amount={parseFloat(editingOrder.total.toString())}
                                          clientId={editingOrder.client_id || undefined}
                                          onPaymentSuccess={() => {
                                            fetchOrders()
                                            setDialogOpen(false)
                                            setEditingOrder(null)
                                            toast.success('Payment processed successfully')
                                          }}
                                        />
                                      </div>
                                      <div className={isMobile ? 'w-full [&>button]:w-full' : ''}>
                                        <SendInvoiceButton
                                          orderId={editingOrder.id!}
                                          orderNumber={editingOrder.order_number}
                                          orderTotal={parseFloat(editingOrder.total.toString())}
                                          clientEmail={editingOrder.client?.email}
                                          clientAdditionalEmails={editingOrder.client?.additional_emails}
                                          onInvoiceCreated={() => {
                                            fetchOrders()
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  {editingOrder.id && (
                                    <>
                                      <PaymentHistoryWrapper orderId={editingOrder.id} />
                                      <section className="space-y-4">
                                        <div className="flex items-center gap-3 pb-3">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/10 ring-1 ring-violet-500/20">
                                            <CreditCard className="h-4 w-4 text-violet-400" />
                                          </div>
                                          <h3 className="text-sm font-semibold tracking-wide text-foreground">Invoices</h3>
                                          <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
                                        </div>
                                        <InvoiceListWrapper 
                                          orderId={editingOrder.id}
                                          onInvoiceUpdate={() => fetchOrders()}
                                        />
                                      </section>
                                    </>
                                  )}
                                </div>
                              </section>
                            )}
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                <DialogFooter className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-t border-border/30 bg-gradient-to-b from-background/95 to-background shrink-0 flex-col sm:flex-row gap-2 sm:gap-3 sticky bottom-0 z-10">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setDialogOpen(false)
                      setEditingOrder(null)
                      lastResetOrderId.current = null
                      form.reset()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    onClick={form.handleSubmit(handleSave)} 
                    className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 shadow-lg shadow-primary/25 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Update Order
                  </Button>
                </DialogFooter>
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
              <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border-b border-border/50">
                  <DialogTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    Send Order via Email
                  </DialogTitle>
                  <DialogDescription className="text-sm mt-2">
                    Send order <span className="font-semibold text-foreground">{orderForEmail?.order_number}</span> to the selected recipient(s). 
                    Status: <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{orderForEmail?.status?.replace(/_/g, " ")}</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                  <div className="space-y-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Recipient
                    </Label>
                    <Select value={emailRecipient} onValueChange={(value) => setEmailRecipient(value as "client" | "caterer" | "both")}>
                      <SelectTrigger className="h-12 bg-muted/30 border-border/50 hover:border-primary/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">
                          <div className="flex flex-col py-1">
                            <span className="font-medium">Client Only</span>
                            {orderForEmail?.client?.email && (
                              <span className="text-xs text-muted-foreground">{orderForEmail.client.email}</span>
                            )}
                          </div>
                        </SelectItem>
                        <SelectItem value="caterer">
                          <div className="flex flex-col py-1">
                            <span className="font-medium">Caterer Only</span>
                            {orderForEmail?.caterer_details?.caterer_email && (
                              <span className="text-xs text-muted-foreground">{orderForEmail.caterer_details.caterer_email}</span>
                            )}
                          </div>
                        </SelectItem>
                        <SelectItem value="both">
                          <span className="font-medium">Both Client and Caterer</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom message for client */}
                  {(emailRecipient === "client" || emailRecipient === "both") && (
                    <div className="space-y-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                      <Label htmlFor="clientMessage" className="text-sm font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-emerald-500" />
                        Custom Message for Client
                        <span className="text-xs font-normal text-muted-foreground">(optional - overrides template body)</span>
                      </Label>
                      <Textarea
                        id="clientMessage"
                        placeholder="Leave empty to use the default template message..."
                        value={customClientMessage}
                        onChange={(e) => setCustomClientMessage(e.target.value)}
                        className="min-h-[80px] resize-none bg-muted/30 border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      />
                      {orderForEmail?.client?.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          Will be sent to: <span className="font-medium text-foreground">{orderForEmail.client.email}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Custom message for caterer */}
                  {(emailRecipient === "caterer" || emailRecipient === "both") && (
                    <div className="space-y-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                      <Label htmlFor="catererMessage" className="text-sm font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-orange-500" />
                        Custom Message for Caterer
                        <span className="text-xs font-normal text-muted-foreground">(optional - overrides template body)</span>
                      </Label>
                      <Textarea
                        id="catererMessage"
                        placeholder="Leave empty to use the default template message..."
                        value={customCatererMessage}
                        onChange={(e) => setCustomCatererMessage(e.target.value)}
                        className="min-h-[80px] resize-none bg-muted/30 border-border/50 focus:border-orange-500/50 focus:ring-orange-500/20"
                      />
                      {orderForEmail?.caterer_details?.caterer_email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          Will be sent to: <span className="font-medium text-foreground">{orderForEmail.caterer_details.caterer_email}</span>
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
                        <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-violet-500/20 shadow-sm">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-violet-500" />
                            Include Friend Emails (CC)
                          </Label>
                          <div className="space-y-4">
                            {clientEmails.length > 0 && (emailRecipient === "client" || emailRecipient === "both") && (
                              <div className="space-y-2">
                                <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Client's Friends:</span>
                                <div className="grid gap-2">
                                  {clientEmails.map((email) => (
                                    <label key={email} className="flex items-center gap-3 p-2.5 rounded-lg bg-card/50 border border-border/30 cursor-pointer hover:bg-card hover:border-violet-500/30 transition-all group">
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
                                        className="data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                                      />
                                      <Mail className="h-4 w-4 text-muted-foreground group-hover:text-violet-400 transition-colors" />
                                      <span className="text-sm font-medium truncate flex-1">{email}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                            {catererEmails.length > 0 && (emailRecipient === "caterer" || emailRecipient === "both") && (
                              <div className="space-y-2">
                                <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Caterer's Friends:</span>
                                <div className="grid gap-2">
                                  {catererEmails.map((email) => (
                                    <label key={email} className="flex items-center gap-3 p-2.5 rounded-lg bg-card/50 border border-border/30 cursor-pointer hover:bg-card hover:border-violet-500/30 transition-all group">
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
                                        className="data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                                      />
                                      <Mail className="h-4 w-4 text-muted-foreground group-hover:text-violet-400 transition-colors" />
                                      <span className="text-sm font-medium truncate flex-1">{email}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Manual CC Emails */}
                  <div className="space-y-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                    <Label htmlFor="manualCc" className="text-sm font-semibold flex items-center gap-2">
                      <AtSign className="h-4 w-4 text-cyan-500" />
                      Additional CC Emails
                      <span className="text-xs font-normal text-muted-foreground">(comma-separated, optional)</span>
                    </Label>
                    <Input
                      id="manualCc"
                      type="text"
                      placeholder="email1@example.com, email2@example.com"
                      value={manualCcEmails}
                      onChange={(e) => setManualCcEmails(e.target.value)}
                      className="h-11 bg-muted/30 border-border/50 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      These emails will receive a copy of the email but won't be saved.
                    </p>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 p-4 text-sm">
                    <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Note:
                    </p>
                    <ul className="space-y-1.5 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5 text-amber-500/70 flex-shrink-0" />
                        <span>The order PDF will be automatically attached to the email</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Mail className="h-4 w-4 mt-0.5 text-amber-500/70 flex-shrink-0" />
                        <span>Email subject is determined by the order status template</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 mt-0.5 text-amber-500/70 flex-shrink-0" />
                        <span>Custom messages will override the template body only</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Users className="h-4 w-4 mt-0.5 text-amber-500/70 flex-shrink-0" />
                        <span>CC recipients will receive copies of all emails sent</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <DialogFooter className="px-6 py-4 bg-muted/30 border-t border-border/50 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEmailDialogOpen(false)
                      setSelectedFriendEmails(new Set())
                      setManualCcEmails("")
                    }} 
                    disabled={isSendingEmail}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={confirmEmailSend} 
                    disabled={isSendingEmail} 
                    className="gap-2 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20"
                  >
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
                            className="flex-1 min-w-[100px] gap-2"
                          >
                            <Download className="h-4 w-4" />
                            {orderForPdf.status === "awaiting_client_approval" ? "Download Quote" : "Download Order"}
                          </Button>
                          {/* Show Invoice button for delivered orders */}
                          {orderForPdf.status === "delivered" && (
                            <Button
                              variant="outline"
                              onClick={() => handleInvoiceDownload(orderForPdf)}
                              className="flex-1 min-w-[100px] gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Invoice
                            </Button>
                          )}
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

            {/* Order Status Help Dialog */}
            <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    Order Status Guide
                  </DialogTitle>
                  <DialogDescription>
                    Learn about each order status, when to use them, and what happens when they're set.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {orderStatusConfig.map((status) => (
                    <Card key={status.value} className="border-border/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Badge className={status.color} variant="outline">
                            {status.label}
                          </Badge>
                          {status.autoUpdate && (
                            <Badge variant="secondary" className="text-xs">
                              Auto-updated
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <span className="font-semibold">Purpose: </span>
                          <span>{status.purpose}</span>
                        </div>
                        <div>
                          <span className="font-semibold">PDF Type: </span>
                          <span>{status.pdfType}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Email Recipient: </span>
                          <span>{status.emailRecipient}</span>
                        </div>
                        {status.emailSubject && (
                          <div>
                            <span className="font-semibold">Email Subject: </span>
                            <span className="text-muted-foreground font-mono text-xs">{status.emailSubject}</span>
                          </div>
                        )}
                        {status.billTo && (
                          <div>
                            <span className="font-semibold">Bill-to: </span>
                            <span>{status.billTo}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-border/50">
                          <span className="font-semibold">Details: </span>
                          <span className="text-muted-foreground">{status.details}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <DialogFooter>
                  <Button onClick={() => setHelpDialogOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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

          {/* Payment Modal */}
          {paymentOrder && (
            <PaymentModal
              open={paymentModalOpen}
              onOpenChange={setPaymentModalOpen}
              orderId={paymentOrder.id!}
              orderNumber={paymentOrder.order_number}
              amount={parseFloat(paymentOrder.total.toString())}
              clientId={paymentOrder.client_id || undefined}
              storedCards={paymentStoredCards}
              onPaymentSuccess={() => {
                fetchOrders()
                setPaymentOrder(null)
                setPaymentModalOpen(false)
                toast.success('Payment processed successfully')
              }}
            />
          )}

          {/* Invoice Modal */}
          {invoiceOrder && (
            <SendInvoiceButton
              orderId={invoiceOrder.id!}
              orderNumber={invoiceOrder.order_number}
              orderTotal={parseFloat(invoiceOrder.total.toString())}
              clientEmail={invoiceOrder.client?.email}
              clientAdditionalEmails={invoiceOrder.client?.additional_emails}
              open={invoiceModalOpen}
              onOpenChange={(open) => {
                setInvoiceModalOpen(open)
                if (!open) {
                  setInvoiceOrder(null)
                }
              }}
              onInvoiceCreated={() => {
                fetchOrders()
                setInvoiceOrder(null)
                setInvoiceModalOpen(false)
              }}
            />
          )}
        </SidebarInset>
      </SidebarProvider>
    </SidebarCategoryProvider>
  )
}

export default function AllOrdersPage() {
  return <OrdersContent />
}


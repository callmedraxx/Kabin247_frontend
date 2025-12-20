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
import { Combobox } from "@/components/ui/combobox"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"
import { useFieldArray } from "react-hook-form"

import { API_BASE_URL } from "@/lib/api-config"

// Order status types
export type OrderStatus = 
  | "awaiting_quote"
  | "quote_sent"
  | "awaiting_client_approval"
  | "quote_approved"
  | "awaiting_caterer"
  | "caterer_confirmed"
  | "in_preparation"
  | "ready_for_delivery"
  | "delivered"
  | "cancelled"
  | "order_changed"

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
}

interface Caterer {
  id: number
  caterer_name: string
  caterer_number: string
  caterer_email: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
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
  fbo?: OrderFBO
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
  { value: "quote_sent", label: "Quote Sent", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { value: "awaiting_client_approval", label: "Awaiting Client Approval", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "quote_approved", label: "Quote Approved", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  { value: "awaiting_caterer", label: "Awaiting Caterer", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "caterer_confirmed", label: "Caterer Confirmed", color: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
  { value: "in_preparation", label: "In Preparation", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { value: "ready_for_delivery", label: "Ready for Delivery", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  { value: "delivered", label: "Delivered", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  { value: "order_changed", label: "Order Changed", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
]

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
  aircraftTailNumber: z.string().optional(),
  deliveryDate: z.string().min(1, "Please select a delivery date"),
  deliveryTime: z.string().min(1, "Please select a delivery time"),
  orderPriority: z.enum(["low", "normal", "high", "urgent"], { message: "Please select a priority level" }),
  orderType: z.enum(["inflight", "qe_serv_hub", "restaurant_pickup"], { message: "Please select an order type" }),
  paymentMethod: z.enum(["card", "ACH"], { message: "Please select a payment method" }),
  status: z.enum([
    "awaiting_quote",
    "quote_sent",
    "awaiting_client_approval",
    "quote_approved",
    "awaiting_caterer",
    "caterer_confirmed",
    "in_preparation",
    "ready_for_delivery",
    "delivered",
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
      aircraftTailNumber: "",
      deliveryDate: "",
      deliveryTime: "",
      orderPriority: "normal",
      orderType: undefined,
      paymentMethod: undefined,
      status: "awaiting_quote",
    },
  })

  // API data states for edit form
  const [clientsData, setClientsData] = React.useState<Client[]>([])
  const [caterersData, setCaterersData] = React.useState<Caterer[]>([])
  const [airportsData, setAirportsData] = React.useState<Airport[]>([])
  const [fbosData, setFBOsData] = React.useState<FBO[]>([])
  const [menuItemsData, setMenuItemsData] = React.useState<MenuItem[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  
  // Loading states
  const [isLoadingClients, setIsLoadingClients] = React.useState(false)
  const [isLoadingCaterers, setIsLoadingCaterers] = React.useState(false)
  const [isLoadingAirports, setIsLoadingAirports] = React.useState(false)
  const [isLoadingFBOs, setIsLoadingFBOs] = React.useState(false)
  const [isLoadingMenuItems, setIsLoadingMenuItems] = React.useState(false)
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(false)
  
  // Search states for comboboxes
  const [clientSearch, setClientSearch] = React.useState("")
  const [catererSearch, setCatererSearch] = React.useState("")
  const [airportSearch, setAirportSearch] = React.useState("")
  const [fboSearch, setFboSearch] = React.useState("")
  const [menuItemSearch, setMenuItemSearch] = React.useState("")
  
  // Options for comboboxes
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([])
  const [catererOptions, setCatererOptions] = React.useState<{ value: string; label: string; searchText?: string }[]>([])
  const [airportOptions, setAirportOptions] = React.useState<{ value: string; label: string; searchText?: string }[]>([])
  const [fboOptions, setFboOptions] = React.useState<{ value: string; label: string; searchText?: string }[]>([])
  const [menuItemOptions, setMenuItemOptions] = React.useState<{ value: string; label: string }[]>([])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
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

  // Fetch clients from API
  const fetchClients = React.useCallback(async (search?: string) => {
    setIsLoadingClients(true)
    try {
      const params = new URLSearchParams()
      if (search?.trim()) {
        params.append("search", search.trim())
      }
      params.append("limit", "1000")
      
      const response = await fetch(`${API_BASE_URL}/clients?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch clients" }))
        toast.error("Failed to load clients", {
          description: errorData.error || `HTTP error! status: ${response.status}`,
        })
        return
      }
      
      const data: ClientsResponse = await response.json()
      setClientsData(data.clients || [])
      
      const options = (data.clients || []).map((client) => ({
        value: client.id.toString(),
        label: client.full_name,
      }))
      setClientOptions(options)
    } catch (err) {
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        console.warn(`Network error fetching clients from ${API_BASE_URL}/clients`)
      } else {
        console.error("Unexpected error fetching clients:", err)
      }
    } finally {
      setIsLoadingClients(false)
    }
  }, [])

  // Fetch caterers from API
  const fetchCaterers = React.useCallback(async (search?: string, showLoading = false) => {
    if (showLoading) setIsLoadingCaterers(true)
    try {
      const params = new URLSearchParams()
      if (search?.trim()) {
        params.append("search", search.trim())
      }
      params.append("limit", "1000")
      
      const response = await fetch(`${API_BASE_URL}/caterers?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch caterers" }))
        toast.error("Failed to load caterers", {
          description: errorData.error || `HTTP error! status: ${response.status}`,
        })
        return
      }
      
      const data: CaterersResponse = await response.json()
      setCaterersData(data.caterers || [])
      
      const options = (data.caterers || []).map((caterer) => {
        const airportCodes = [
          caterer.airport_code_iata,
          caterer.airport_code_icao,
        ].filter(Boolean).join("/")
        
        let label = ""
        if (airportCodes) {
          label = `${airportCodes} - ${caterer.caterer_name}`
        } else {
          label = caterer.caterer_name
        }
        
        const searchText = `${caterer.caterer_name} ${airportCodes}`.toLowerCase()
        
        return {
          value: caterer.id.toString(),
          label,
          searchText,
        }
      })
      setCatererOptions(options)
    } catch (err) {
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        console.warn(`Network error fetching caterers from ${API_BASE_URL}/caterers`)
      } else {
        console.error("Unexpected error fetching caterers:", err)
      }
    } finally {
      if (showLoading) setIsLoadingCaterers(false)
    }
  }, [])

  // Fetch airports from API
  const fetchAirports = React.useCallback(async (search?: string, showLoading = false) => {
    if (showLoading) setIsLoadingAirports(true)
    try {
      const params = new URLSearchParams()
      if (search?.trim()) {
        params.append("search", search.trim())
      }
      params.append("limit", "1000")
      
      const response = await fetch(`${API_BASE_URL}/airports?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch airports" }))
        toast.error("Failed to load airports", {
          description: errorData.error || `HTTP error! status: ${response.status}`,
        })
        return
      }
      
      const data: AirportsResponse = await response.json()
      setAirportsData(data.airports || [])
      
      const options = (data.airports || []).map((airport) => {
        const codes = [
          airport.airport_code_iata,
          airport.airport_code_icao,
        ].filter(Boolean).join("/")
        
        const decodedAirportName = decodeHtmlEntities(airport.airport_name)
        
        let label = ""
        if (codes) {
          label = `${codes} - ${decodedAirportName}`
        } else {
          label = decodedAirportName
        }
        
        const searchText = `${codes} ${decodedAirportName}`.toLowerCase()
        
        return {
          value: airport.id.toString(),
          label,
          searchText,
        }
      })
      
      options.sort((a, b) => {
        const aHasCode = a.searchText?.includes("/") || false
        const bHasCode = b.searchText?.includes("/") || false
        if (aHasCode && !bHasCode) return -1
        if (!aHasCode && bHasCode) return 1
        return 0
      })
      
      setAirportOptions(options)
    } catch (err) {
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        console.warn(`Network error fetching airports from ${API_BASE_URL}/airports`)
      } else {
        console.error("Unexpected error fetching airports:", err)
      }
    } finally {
      if (showLoading) setIsLoadingAirports(false)
    }
  }, [])

  // Fetch FBOs from API
  const fetchFBOs = React.useCallback(async (search?: string, showLoading = false) => {
    if (showLoading) setIsLoadingFBOs(true)
    try {
      const params = new URLSearchParams()
      if (search?.trim()) {
        params.append("search", search.trim())
      }
      params.append("limit", "1000")
      
      const response = await fetch(`${API_BASE_URL}/fbos?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch FBOs" }))
        toast.error("Failed to load FBOs", {
          description: errorData.error || `HTTP error! status: ${response.status}`,
        })
        return
      }
      
      const data: FBOsResponse = await response.json()
      setFBOsData(data.fbos || [])
      
      const options = (data.fbos || []).map((fbo) => {
        const airportCodes = [
          fbo.airport_code_iata,
          fbo.airport_code_icao,
        ].filter(Boolean).join("/")
        
        let label = ""
        if (airportCodes) {
          label = `${airportCodes} - ${fbo.fbo_name}`
        } else {
          label = fbo.fbo_name
        }
        
        const searchText = `${fbo.fbo_name} ${airportCodes} ${fbo.airport_name || ""}`.toLowerCase()
        
        return {
          value: fbo.id.toString(),
          label,
          searchText,
        }
      })
      setFboOptions(options)
    } catch (err) {
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        console.warn(`Network error fetching FBOs from ${API_BASE_URL}/fbos`)
      } else {
        console.error("Unexpected error fetching FBOs:", err)
      }
    } finally {
      if (showLoading) setIsLoadingFBOs(false)
    }
  }, [])

  // Fetch menu items from API
  const fetchMenuItems = React.useCallback(async (search?: string, showLoading = false) => {
    if (showLoading) setIsLoadingMenuItems(true)
    try {
      const params = new URLSearchParams()
      if (search?.trim()) {
        params.append("search", search.trim())
      }
      params.append("limit", "1000")
      params.append("is_active", "true")
      
      const response = await fetch(`${API_BASE_URL}/menu-items?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch menu items" }))
        toast.error("Failed to load menu items", {
          description: errorData.error || `HTTP error! status: ${response.status}`,
        })
        return
      }
      
      const data: MenuItemsResponse = await response.json()
      setMenuItemsData(data.menu_items || [])
      
      const options = (data.menu_items || []).map((item) => ({
        value: item.id.toString(),
        label: item.item_name,
      }))
      setMenuItemOptions(options)
    } catch (err) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        console.info("Network error fetching menu items (this may be expected):", err.message)
      } else {
        console.error("Error fetching menu items:", err)
      }
    } finally {
      if (showLoading) setIsLoadingMenuItems(false)
    }
  }, [])

  // Fetch categories for dropdown
  const fetchCategories = React.useCallback(async () => {
    setIsLoadingCategories(true)
    try {
      const response = await fetch(`${API_BASE_URL}/categories?is_active=true&limit=1000`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch categories" }))
        toast.error("Failed to load categories", {
          description: errorData.error || `HTTP error! status: ${response.status}`,
        })
        return
      }
      
      const data: CategoriesResponse = await response.json()
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
        order_number: "", // Clear order number for duplicate (new order will get new number)
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
          portionServing: item.portion_serving || "",
          price: String(item.price),
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
      // Open dialog first to trigger data fetching
      setDialogOpen(true)
      
      const response = await fetch(`${API_BASE_URL}/orders/${order.id}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch order details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const fullOrder: Order = await response.json()
      setEditingOrder(fullOrder)

      // Also fetch menu items to ensure they're available for the combobox
      // This runs in parallel with the dialogOpen useEffect
      await fetchMenuItems()

      // Map order items to form format
      const formItems = fullOrder.items && fullOrder.items.length > 0
        ? fullOrder.items.map((item) => ({
            itemName: item.item_id?.toString() || item.menu_item_id?.toString() || "",
            itemDescription: item.item_description || "",
            portionSize: item.portion_size || "1",
            portionServing: item.portion_serving || "",
            price: typeof item.price === 'number' ? item.price.toString() : (item.price || "0"),
            category: item.category || "",
            packaging: item.packaging || "",
          }))
        : [{
            itemName: "",
            itemDescription: "",
            portionSize: "1",
            portionServing: "",
            price: "",
            category: "",
            packaging: "",
          }]

      // Small delay to ensure menu items options are set in state
      await new Promise(resolve => setTimeout(resolve, 100))

      form.reset({
        order_number: fullOrder.order_number || "",
        client_id: fullOrder.client_id,
        caterer_id: fullOrder.caterer_id,
        airport_id: fullOrder.airport_id,
        fbo_id: fullOrder.fbo_id || undefined,
        aircraftTailNumber: fullOrder.aircraft_tail_number || "",
        deliveryDate: fullOrder.delivery_date,
        deliveryTime: fullOrder.delivery_time,
        orderPriority: fullOrder.order_priority as "low" | "normal" | "high" | "urgent",
        orderType: fullOrder.order_type as "inflight" | "qe_serv_hub" | "restaurant_pickup",
        status: fullOrder.status,
        description: fullOrder.description || "",
        notes: fullOrder.notes || "",
        reheatingInstructions: fullOrder.reheating_instructions || "",
        packagingInstructions: fullOrder.packaging_instructions || "",
        dietaryRestrictions: fullOrder.dietary_restrictions || "",
        serviceCharge: fullOrder.service_charge?.toString() || "0",
        deliveryFee: fullOrder.delivery_fee?.toString() || "0",
        paymentMethod: fullOrder.payment_method as "card" | "ACH",
        items: formItems,
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

  // Helper function to determine which PDF endpoint to use based on order status
  // PDF A (with prices): awaiting_quote, quote_sent - for client quotes
  // PDF B (no prices): awaiting_client_approval, quote_approved, awaiting_caterer, caterer_confirmed, in_preparation, ready_for_delivery, delivered - for confirmations
  const getPdfEndpoint = (orderId: number, status: OrderStatus, type: "preview" | "download"): string => {
    const pdfAStatuses: OrderStatus[] = ["awaiting_quote", "quote_sent"]
    const usePdfA = pdfAStatuses.includes(status)
    
    if (type === "preview") {
      return usePdfA ? `${API_BASE_URL}/orders/${orderId}/preview` : `${API_BASE_URL}/orders/${orderId}/preview-b`
    } else {
      return usePdfA ? `${API_BASE_URL}/orders/${orderId}/pdf` : `${API_BASE_URL}/orders/${orderId}/pdf-b`
    }
  }

  // Handle PDF preview
  const handlePdfPreview = async (order: Order, forceType?: "a" | "b") => {
    setOrderForPdf(order)
    setPdfPreviewOpen(true)
    setPdfHtml("") // Reset while loading

    try {
      // Determine endpoint based on status or forced type
      let endpoint: string
      if (forceType === "a") {
        endpoint = `${API_BASE_URL}/orders/${order.id}/preview`
      } else if (forceType === "b") {
        endpoint = `${API_BASE_URL}/orders/${order.id}/preview-b`
      } else {
        endpoint = getPdfEndpoint(order.id, order.status, "preview")
      }

      const response = await fetch(endpoint)

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
  const handlePdfDownload = async (order: Order, forceType?: "a" | "b") => {
    toast.loading("Generating PDF...", { id: `pdf-${order.id}` })

    try {
      // Determine endpoint based on status or forced type
      let endpoint: string
      if (forceType === "a") {
        endpoint = `${API_BASE_URL}/orders/${order.id}/pdf`
      } else if (forceType === "b") {
        endpoint = `${API_BASE_URL}/orders/${order.id}/pdf-b`
      } else {
        endpoint = getPdfEndpoint(order.id, order.status, "download")
      }

      const response = await fetch(endpoint)

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
                                    {["awaiting_quote", "quote_sent"].includes(order.status) ? "Preview Quote" : "Preview Order"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handlePdfDownload(order)}
                                    className="cursor-pointer"
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    {["awaiting_quote", "quote_sent"].includes(order.status) ? "Download Quote" : "Download Order"}
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
                        {viewingOrder && ["awaiting_quote", "quote_sent"].includes(viewingOrder.status) ? "Quote" : "Preview"}
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
                        {viewingOrder && ["awaiting_quote", "quote_sent"].includes(viewingOrder.status) ? "Quote PDF" : "Order PDF"}
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="!max-w-[98vw] w-[98vw] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0">
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
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <div className="p-4 sm:p-6 lg:p-8">
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
                        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
                                <Select onValueChange={field.onChange} value={field.value}>
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
                                    <SelectItem value="urgent">
                                      <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-red-500" />
                                        Urgent
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
                            name="orderType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Order Type *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
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
                                <Select onValueChange={field.onChange} value={field.value}>
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
                        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                                </Button>
                              </div>

                              {fields.map((field, index) => (
                                <div 
                                  key={field.id} 
                                  className="group relative p-4 sm:p-5 rounded-xl border border-border/30 bg-gradient-to-b from-muted/30 to-muted/10 space-y-4 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                                >
                                  <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                                  {/* Item Header */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <div className="absolute inset-0 bg-emerald-500/20 rounded-lg blur-sm group-hover:blur-md transition-all" />
                                        <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-xs font-bold text-white shadow-md">
                                          {index + 1}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-sm font-semibold">Item {index + 1}</span>
                                        <p className="text-[11px] text-muted-foreground">Add menu item details</p>
                                      </div>
                                    </div>
                                    {fields.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => remove(index)}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>

                                  {/* Item Fields - Row 1: Menu Item, Qty, Serving Size, Price, Category */}
                                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.itemName`}
                                      render={({ field }) => (
                                        <FormItem className="lg:col-span-1">
                                          <FormLabel className="text-xs font-medium text-muted-foreground">Menu Item *</FormLabel>
                                          <FormControl>
                                            <Combobox
                                              options={menuItemOptions}
                                              value={field.value}
                                              onValueChange={(value) => {
                                                field.onChange(value)
                                                if (value) {
                                                  const selectedItem = menuItemsData.find((item) => item.id.toString() === value)
                                                  if (selectedItem) {
                                                    const price = (selectedItem.variants && selectedItem.variants.length > 0)
                                                      ? selectedItem.variants[0].price
                                                      : (selectedItem as any).price
                                                    if (price !== undefined && price !== null) {
                                                      form.setValue(`items.${index}.price`, price.toString())
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
                                              onSearchChange={setMenuItemSearch}
                                              isLoading={isLoadingMenuItems}
                                            />
                                          </FormControl>
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
                                            <Input placeholder="1" {...field} />
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
                                              <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} />
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
                                  <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
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
                                </div>
                              ))}
                              {form.formState.errors.items && (
                                <p className="text-sm text-destructive">
                                  {form.formState.errors.items.message}
                                </p>
                              )}
                            </section>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                <DialogFooter className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-t border-border/30 bg-gradient-to-b from-background/95 to-background shrink-0 flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setDialogOpen(false)
                      setEditingOrder(null)
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
                            className="flex-1 min-w-[100px] gap-2"
                          >
                            <Download className="h-4 w-4" />
                            {["awaiting_quote", "quote_sent"].includes(orderForPdf.status) ? "Download Quote" : "Download Order"}
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


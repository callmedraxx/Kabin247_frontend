"use client"

import * as React from "react"
import { useSearchParams, usePathname } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import { SidebarCategoryProvider } from "@/contexts/sidebar-context"
import { HeaderNav } from "@/components/dashboard/header-nav"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Combobox } from "@/components/ui/combobox"
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Trash2, 
  Eye, 
  Save, 
  Plus, 
  X, 
  User, 
  UtensilsCrossed, 
  Plane, 
  Calendar, 
  Clock, 
  CreditCard, 
  DollarSign, 
  FileText, 
  Package, 
  ChefHat,
  ShoppingBag,
  Info,
  Mail,
  Phone,
  MapPin,
  Flag,
  Loader2,
  Building2,
  Leaf,
  Circle,
  CheckCircle2
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

// Data structures matching API responses
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

// API Response types
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

interface Category {
  id: number
  name: string
  slug: string
  is_active: boolean
}

interface CategoriesResponse {
  categories: Category[]
  total: number
}

// Menu item form schema
const menuItemFormSchema = z.object({
  item_name: z.string().min(1, "Please enter an item name"),
  item_description: z.string().optional(),
  food_type: z.enum(["veg", "non_veg"], { message: "Please select a food type" }),
  category: z.string().optional(),
  image_url: z.string().optional(),
  price: z.number().positive("Price must be greater than 0").optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  service_charge: z.number().min(0).optional(),
  is_active: z.boolean(),
})

type MenuItemFormValues = z.infer<typeof menuItemFormSchema>

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

const formSchema = z.object({
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
})

type FormValues = z.infer<typeof formSchema>

// Initial mock data - replace with actual API calls
const initialClients = [
  { 
    value: "client1", 
    label: "John Doe",
    email: "john.doe@example.com",
    fullAddress: "123 Main St, New York, NY 10001",
    contactNumber: "+1 (555) 123-4567",
    airport: "JFK"
  },
  { 
    value: "client2", 
    label: "Jane Smith",
    email: "jane.smith@example.com",
    fullAddress: "456 Oak Ave, Los Angeles, CA 90001",
    contactNumber: "+1 (555) 234-5678",
    airport: "LAX"
  },
  { 
    value: "client3", 
    label: "Bob Johnson",
    email: "bob.johnson@example.com",
    fullAddress: "789 Pine Rd, Chicago, IL 60601",
    contactNumber: "+1 (555) 345-6789",
    airport: "ORD"
  },
]

const initialCaterers = [
  { value: "caterer1", label: "Airport Catering Co." },
  { value: "caterer2", label: "Skyline Foods" },
  { value: "caterer3", label: "Wings & More" },
]

const initialAirports = [
  { value: "jfk", label: "JFK International Airport" },
  { value: "lax", label: "LAX International Airport" },
  { value: "ord", label: "O'Hare International Airport" },
]

const initialMenuItems = [
  { value: "item1", label: "Chicken Sandwich" },
  { value: "item2", label: "Beef Burger" },
  { value: "item3", label: "Vegetarian Wrap" },
  { value: "item4", label: "Caesar Salad" },
]

// Helper function to decode HTML entities
const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement("textarea")
  textarea.innerHTML = text
  return textarea.value
}

// Helper function to format date for HTML date input (YYYY-MM-DD)
const formatDateForInput = (dateString: string | null | undefined): string => {
  if (!dateString) return ""
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString
      }
      return ""
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  } catch {
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
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

// Draft persistence key
const DRAFT_STORAGE_KEY = "pos_order_draft"

// Helper functions for draft persistence
const saveDraft = (formData: FormValues) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData))
    } catch (error) {
      console.warn("Failed to save draft to localStorage:", error)
    }
  }
}

const loadDraft = (): FormValues | null => {
  if (typeof window !== "undefined") {
    try {
      const draftData = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (draftData) {
        return JSON.parse(draftData) as FormValues
      }
    } catch (error) {
      console.warn("Failed to load draft from localStorage:", error)
    }
  }
  return null
}

const clearDraft = () => {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch (error) {
      console.warn("Failed to clear draft from localStorage:", error)
    }
  }
}

function POSContent() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewHtml, setPreviewHtml] = React.useState<string>("")
  
  // API data states
  const [clientsData, setClientsData] = React.useState<Client[]>([])
  const [caterersData, setCaterersData] = React.useState<Caterer[]>([])
  const [airportsData, setAirportsData] = React.useState<Airport[]>([])
  const [fbosData, setFBOsData] = React.useState<FBO[]>([])
  const [menuItemsData, setMenuItemsData] = React.useState<MenuItem[]>([])
  
  // Loading states (only for search operations, not initial load)
  const [isLoadingClients, setIsLoadingClients] = React.useState(false)
  const [isLoadingCaterers, setIsLoadingCaterers] = React.useState(false)
  const [isLoadingAirports, setIsLoadingAirports] = React.useState(false)
  const [isLoadingFBOs, setIsLoadingFBOs] = React.useState(false)
  const [isLoadingMenuItems, setIsLoadingMenuItems] = React.useState(false)
  
  // Search states for comboboxes
  const [clientSearch, setClientSearch] = React.useState("")
  const [catererSearch, setCatererSearch] = React.useState("")
  const [airportSearch, setAirportSearch] = React.useState("")
  const [fboSearch, setFboSearch] = React.useState("")
  const [menuItemSearch, setMenuItemSearch] = React.useState("")
  
  // Options for comboboxes (formatted for display)
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([])
  const [catererOptions, setCatererOptions] = React.useState<{ value: string; label: string; searchText?: string }[]>([])
  const [airportOptions, setAirportOptions] = React.useState<{ value: string; label: string; searchText?: string }[]>([])
  const [fboOptions, setFboOptions] = React.useState<{ value: string; label: string; searchText?: string }[]>([])
  const [menuItemOptions, setMenuItemOptions] = React.useState<{ value: string; label: string }[]>([])
  
  // Dialog states
  const [clientDialogOpen, setClientDialogOpen] = React.useState(false)
  const [catererDialogOpen, setCatererDialogOpen] = React.useState(false)
  const [airportDialogOpen, setAirportDialogOpen] = React.useState(false)
  const [fboDialogOpen, setFboDialogOpen] = React.useState(false)
  const [menuItemDialogOpen, setMenuItemDialogOpen] = React.useState(false)
  const [currentItemIndex, setCurrentItemIndex] = React.useState<number | undefined>(undefined)
  
  // Form states for adding new items
  const [newClientName, setNewClientName] = React.useState("")
  const [newClientEmail, setNewClientEmail] = React.useState("")
  const [newClientAddress, setNewClientAddress] = React.useState("")
  const [newClientContact, setNewClientContact] = React.useState("")
  
  const [newCatererName, setNewCatererName] = React.useState("")
  const [newCatererNumber, setNewCatererNumber] = React.useState("")
  const [newCatererEmail, setNewCatererEmail] = React.useState("")
  const [newCatererAirportIata, setNewCatererAirportIata] = React.useState("")
  const [newCatererAirportIcao, setNewCatererAirportIcao] = React.useState("")
  const [newCatererTimezone, setNewCatererTimezone] = React.useState("")
  const [selectedCatererAirport, setSelectedCatererAirport] = React.useState<number | undefined>(undefined)
  
  const [newAirportName, setNewAirportName] = React.useState("")
  const [newFboName, setNewFboName] = React.useState("")
  const [newAirportIata, setNewAirportIata] = React.useState("")
  const [newAirportIcao, setNewAirportIcao] = React.useState("")
  const [newFboEmail, setNewFboEmail] = React.useState("")
  const [newFboPhone, setNewFboPhone] = React.useState("")
  
  // FBO standalone form fields (separate from airport FBO fields)
  const [newStandaloneFboName, setNewStandaloneFboName] = React.useState("")
  const [newStandaloneFboEmail, setNewStandaloneFboEmail] = React.useState("")
  const [newStandaloneFboPhone, setNewStandaloneFboPhone] = React.useState("")
  
  const [newMenuItemName, setNewMenuItemName] = React.useState("")
  
  // Categories state
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(false)
  
  // Menu item form
  const menuItemForm = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema) as any,
    defaultValues: {
      item_name: "",
      item_description: "",
      food_type: "veg",
      category: "",
      image_url: "",
      price: undefined,
      tax_rate: undefined,
      service_charge: undefined,
      is_active: true,
    },
  })
  
  // Saving states
  const [isSavingClient, setIsSavingClient] = React.useState(false)
  const [isSavingCaterer, setIsSavingCaterer] = React.useState(false)
  const [isSavingAirport, setIsSavingAirport] = React.useState(false)
  const [isSavingFBO, setIsSavingFBO] = React.useState(false)
  const [isSavingMenuItem, setIsSavingMenuItem] = React.useState(false)
  
  const { state, isMobile } = useSidebar()
  const sidebarCollapsed = state === "collapsed"
  const buttonMarginLeft = !isMobile ? (sidebarCollapsed ? "4rem" : "14rem") : "0"

  const formatCurrency = React.useCallback((value: number) => {
    if (Number.isNaN(value)) return "$0.00"
    return value.toLocaleString("en-US", { style: "currency", currency: "USD" })
  }, [])

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
      
      // Format for combobox
      const options = (data.clients || []).map((client) => ({
        value: client.id.toString(),
        label: client.full_name,
      }))
      setClientOptions(options)
    } catch (err) {
      // Handle network errors gracefully - these are expected in some scenarios (offline, CORS, etc.)
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        // Network error - log as warn instead of error since it's not necessarily a problem
        // This can happen if backend is not running, CORS issues, or network problems
        console.warn(`Network error fetching clients from ${API_BASE_URL}/clients - this may be expected if backend is not running`)
      } else {
        // Other unexpected errors
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
      
      // Format for combobox with airport code prefix (same format as airports)
      const options = (data.caterers || []).map((caterer) => {
        const airportCodes = [
          caterer.airport_code_iata,
          caterer.airport_code_icao,
        ].filter(Boolean).join("/")
        
        // Display format: "CODE - Caterer Name" or "Caterer Name" if no codes
        let label = ""
        if (airportCodes) {
          label = `${airportCodes} - ${caterer.caterer_name}`
        } else {
          label = caterer.caterer_name
        }
        
        // Search text includes both name and codes
        const searchText = `${caterer.caterer_name} ${airportCodes}`.toLowerCase()
        
        return {
          value: caterer.id.toString(),
          label,
          searchText,
        }
      })
      setCatererOptions(options)
    } catch (err) {
      // Handle network errors gracefully - these are expected in some scenarios (offline, CORS, etc.)
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        // Network error - log as warn instead of error since it's not necessarily a problem
        // This can happen if backend is not running, CORS issues, or network problems
        console.warn(`Network error fetching caterers from ${API_BASE_URL}/caterers - this may be expected if backend is not running`)
      } else {
        // Other unexpected errors
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
      
      // Format for combobox - codes first, then airport name
      const options = (data.airports || []).map((airport) => {
        const codes = [
          airport.airport_code_iata,
          airport.airport_code_icao,
        ].filter(Boolean).join("/")
        
        // Decode HTML entities in airport name
        const decodedAirportName = decodeHtmlEntities(airport.airport_name)
        
        // Display format: "CODE - Airport Name" or "Airport Name" if no codes
        let label = ""
        if (codes) {
          label = `${codes} - ${decodedAirportName}`
        } else {
          label = decodedAirportName
        }
        
        // Search text includes codes and decoded airport name
        const searchText = `${codes} ${decodedAirportName}`.toLowerCase()
        
        return {
          value: airport.id.toString(),
          label,
          searchText,
        }
      })
      
      // Sort: airports with codes first
      options.sort((a, b) => {
        const aHasCode = a.searchText?.includes("/") || false
        const bHasCode = b.searchText?.includes("/") || false
        if (aHasCode && !bHasCode) return -1
        if (!aHasCode && bHasCode) return 1
        return 0
      })
      
      setAirportOptions(options)
    } catch (err) {
      // Handle network errors gracefully - these are expected in some scenarios (offline, CORS, etc.)
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        // Network error - log as warn instead of error since it's not necessarily a problem
        // This can happen if backend is not running, CORS issues, or network problems
        console.warn(`Network error fetching airports from ${API_BASE_URL}/airports - this may be expected if backend is not running`)
      } else {
        // Other unexpected errors
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
      
      // Format for combobox with airport code prefix (same format as caterers)
      const options = (data.fbos || []).map((fbo) => {
        const airportCodes = [
          fbo.airport_code_iata,
          fbo.airport_code_icao,
        ].filter(Boolean).join("/")
        
        // Display format: "CODE - FBO Name" or "FBO Name" if no codes
        let label = ""
        if (airportCodes) {
          label = `${airportCodes} - ${fbo.fbo_name}`
        } else {
          label = fbo.fbo_name
        }
        
        // Search text includes both name and codes
        const searchText = `${fbo.fbo_name} ${airportCodes} ${fbo.airport_name || ""}`.toLowerCase()
        
        return {
          value: fbo.id.toString(),
          label,
          searchText,
        }
      })
      setFboOptions(options)
    } catch (err) {
      // Handle network errors gracefully - these are expected in some scenarios (offline, CORS, etc.)
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        // Network error - log as warn instead of error since it's not necessarily a problem
        // This can happen if backend is not running, CORS issues, or network problems
        console.warn(`Network error fetching FBOs from ${API_BASE_URL}/fbos - this may be expected if backend is not running`)
      } else {
        // Other unexpected errors
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
      
      // Format for combobox
      const options = (data.menu_items || []).map((item) => ({
        value: item.id.toString(),
        label: item.item_name,
      }))
      setMenuItemOptions(options)
    } catch (err) {
      // Handle network errors gracefully - these are expected in some scenarios (offline, CORS, etc.)
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        // Network error - log as info/warn instead of error since it's not necessarily a problem
        console.info("Network error fetching menu items (this may be expected):", err.message)
      } else {
        // Other unexpected errors
        console.error("Error fetching menu items:", err)
      }
    } finally {
      if (showLoading) setIsLoadingMenuItems(false)
    }
  }, [])
  
  // Initial fetch on mount - show loading indicators for better UX
  React.useEffect(() => {
    fetchClients()
    fetchCaterers(undefined, true) // Show loading indicator
    fetchAirports(undefined, true) // Show loading indicator
    fetchFBOs(undefined, true) // Show loading indicator
    fetchMenuItems()
  }, [fetchClients, fetchCaterers, fetchAirports, fetchFBOs, fetchMenuItems])
  
  // Debounced search for clients (only show loading during search, not initial load)
  React.useEffect(() => {
    if (clientSearch.trim()) {
      const timer = setTimeout(() => {
        fetchClients(clientSearch)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [clientSearch, fetchClients])

  // Debounced search for caterers (only show loading during search, not initial load)
  React.useEffect(() => {
    if (catererSearch.trim()) {
      const timer = setTimeout(() => {
        fetchCaterers(catererSearch, true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [catererSearch, fetchCaterers])

  // Debounced search for airports (only show loading during search, not initial load)
  React.useEffect(() => {
    if (airportSearch.trim()) {
      const timer = setTimeout(() => {
        fetchAirports(airportSearch, true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [airportSearch, fetchAirports])

  // Debounced search for FBOs (only show loading during search, not initial load)
  React.useEffect(() => {
    if (fboSearch.trim()) {
      const timer = setTimeout(() => {
        fetchFBOs(fboSearch, true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [fboSearch, fetchFBOs])

  // Debounced search for menu items (only show loading during search, not initial load)
  React.useEffect(() => {
    if (menuItemSearch.trim()) {
      const timer = setTimeout(() => {
        fetchMenuItems(menuItemSearch, true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [menuItemSearch, fetchMenuItems])
  
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
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
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
    },
  })

  // Watched form values for live summaries
  const watchedItems = form.watch("items") || []
  const watchedServiceCharge = form.watch("serviceCharge") || ""
  const watchedDeliveryFee = form.watch("deliveryFee") || ""
  const watchedPriority = form.watch("orderPriority")
  const watchedOrderType = form.watch("orderType")
  const watchedPayment = form.watch("paymentMethod")
  const watchedDeliveryDate = form.watch("deliveryDate")
  const watchedDeliveryTime = form.watch("deliveryTime")
  const selectedClient = form.watch("client_id")
  const selectedCaterer = form.watch("caterer_id")
  const selectedAirport = form.watch("airport_id")
  const selectedFBO = form.watch("fbo_id")

  const priorityBadgeClass = React.useMemo(() => {
    switch (watchedPriority) {
      case "urgent":
        return "border-red-500/40 text-red-400 bg-red-500/10"
      case "high":
        return "border-amber-500/40 text-amber-400 bg-amber-500/10"
      case "normal":
        return "border-blue-500/40 text-blue-300 bg-blue-500/10"
      case "low":
        return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
      default:
        return "border-border/60 text-muted-foreground bg-muted/30"
    }
  }, [watchedPriority])

  const paymentBadgeClass = React.useMemo(() => {
    switch (watchedPayment) {
      case "ACH":
        return "border-cyan-500/40 text-cyan-300 bg-cyan-500/10"
      case "card":
        return "border-indigo-500/40 text-indigo-300 bg-indigo-500/10"
      default:
        return "border-border/60 text-muted-foreground bg-muted/30"
    }
  }, [watchedPayment])

  const orderTypeBadgeClass = React.useMemo(() => {
    switch (watchedOrderType) {
      case "inflight":
        return "border-purple-500/40 text-purple-300 bg-purple-500/10"
      case "qe_serv_hub":
        return "border-teal-500/40 text-teal-300 bg-teal-500/10"
      case "restaurant_pickup":
        return "border-orange-500/40 text-orange-300 bg-orange-500/10"
      default:
        return "border-border/60 text-muted-foreground bg-muted/30"
    }
  }, [watchedOrderType])

  const orderTypeDisplayName = React.useMemo(() => {
    switch (watchedOrderType) {
      case "inflight":
        return "Inflight order"
      case "qe_serv_hub":
        return "QE Serv Hub Order"
      case "restaurant_pickup":
        return "Restaurant Pickup Order"
      default:
        return watchedOrderType || "—"
    }
  }, [watchedOrderType])

  // Track if we've loaded initial data to prevent multiple loads
  const [hasLoadedInitialData, setHasLoadedInitialData] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)

  // Mark component as mounted (client-side only)
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load duplicate order data if coming from duplicate action, or load draft on mount
  React.useEffect(() => {
    if (!isMounted) return // Wait for client-side mount
    if (hasLoadedInitialData) return // Only run once

    const isDuplicate = searchParams.get("duplicate")
    if (isDuplicate === "true") {
      const duplicateDataStr = sessionStorage.getItem("duplicateOrder")
      if (duplicateDataStr) {
        try {
          const duplicateData = JSON.parse(duplicateDataStr)
          
          // Format delivery date if provided
          const formattedDeliveryDate = duplicateData.delivery_date 
            ? formatDateForInput(duplicateData.delivery_date) 
            : ""
          
          // Map order type from API format to form format
          const mappedOrderType = mapOrderTypeToForm(duplicateData.order_type)
          
          // Reset form with duplicate data - include all fields
          form.reset({
            order_number: "",
            client_id: duplicateData.client_id || undefined,
            caterer_id: duplicateData.caterer_id || undefined,
            airport_id: duplicateData.airport_id || undefined,
            fbo_id: duplicateData.fbo_id || undefined,
            description: duplicateData.description || "",
            items: duplicateData.items?.length > 0 ? duplicateData.items.map((item: any) => ({
              itemName: item.itemName || item.item_id?.toString() || item.menu_item_id?.toString() || "",
              itemDescription: item.itemDescription || item.item_description || "",
              portionSize: item.portionSize || item.portion_size || "1",
              portionServing: item.portionServing || item.portion_serving || "",
              price: item.price?.toString() || "0",
              category: item.category || "",
              packaging: item.packaging || "",
            })) : [{
              itemName: "",
              itemDescription: "",
              portionSize: "",
              portionServing: "",
              price: "",
              category: "",
              packaging: "",
            }],
            notes: duplicateData.notes || "",
            reheatingInstructions: duplicateData.reheating_instructions || "",
            packagingInstructions: duplicateData.packaging_instructions || "",
            dietaryRestrictions: duplicateData.dietary_restrictions || "",
            serviceCharge: duplicateData.service_charge?.toString() || "0",
            deliveryFee: duplicateData.delivery_fee?.toString() || "0",
            aircraftTailNumber: duplicateData.aircraft_tail_number || "",
            deliveryDate: formattedDeliveryDate, // Use formatted delivery date
            deliveryTime: duplicateData.delivery_time || "", // Use delivery time from duplicate
            orderPriority: duplicateData.order_priority || "normal",
            orderType: mappedOrderType, // Use mapped order type
            paymentMethod: duplicateData.payment_method || undefined,
          })
          
          // Explicitly set delivery date and order type to ensure they're recognized
          if (formattedDeliveryDate) {
            form.setValue("deliveryDate", formattedDeliveryDate, { shouldValidate: false })
          }
          if (mappedOrderType) {
            form.setValue("orderType", mappedOrderType, { shouldValidate: false })
          }
          if (duplicateData.delivery_time) {
            form.setValue("deliveryTime", duplicateData.delivery_time, { shouldValidate: false })
          }
          if (duplicateData.payment_method) {
            form.setValue("paymentMethod", duplicateData.payment_method as "card" | "ACH", { shouldValidate: false })
          }
          
          // Clear the sessionStorage
          sessionStorage.removeItem("duplicateOrder")
          
          toast.success("Order duplicated", {
            description: "Please update the delivery date and time for the new order.",
          })
          // Clear draft when duplicating an order
          clearDraft()
          setHasLoadedInitialData(true)
        } catch (err) {
          console.error("Error loading duplicate order:", err)
          setHasLoadedInitialData(true)
        }
      } else {
        setHasLoadedInitialData(true)
      }
    } else {
      // Load draft data if not duplicating
      const draftData = loadDraft()
      if (draftData) {
        try {
          console.log("Loading draft:", draftData)
          // Use setTimeout to ensure form is ready
          setTimeout(() => {
            form.reset(draftData)
            toast.success("Draft restored", {
              description: "Your previous order draft has been restored.",
            })
          }, 100)
        } catch (err) {
          console.error("Error loading draft:", err)
        }
      } else {
        console.log("No draft found to load")
      }
      setHasLoadedInitialData(true)
    }
  }, [searchParams, form, hasLoadedInitialData, isMounted])

  // Helper function to save draft if form has data
  const saveDraftIfNeeded = React.useCallback(() => {
    if (!hasLoadedInitialData) return
    const isDuplicate = searchParams.get("duplicate") === "true"
    if (isDuplicate) return

    const currentValues = form.getValues()
    // Only save if form has some meaningful data
    const hasData = 
      currentValues.client_id ||
      currentValues.caterer_id ||
      currentValues.airport_id ||
      currentValues.items?.some(item => item.itemName) ||
      currentValues.description ||
      currentValues.notes ||
      currentValues.deliveryDate ||
      currentValues.deliveryTime

    if (hasData) {
      console.log("Saving draft:", currentValues)
      saveDraft(currentValues)
    } else {
      // Clear draft if form is empty
      clearDraft()
    }
  }, [form, hasLoadedInitialData, searchParams])

  // Auto-save draft whenever form values change (debounced)
  const formValues = form.watch()
  React.useEffect(() => {
    // Don't save draft if we haven't loaded initial data yet or if we just loaded a duplicate
    if (!hasLoadedInitialData) return
    const isDuplicate = searchParams.get("duplicate") === "true"
    if (isDuplicate) return

    // Debounce the save (reduced to 500ms for faster saves)
    const timer = setTimeout(() => {
      saveDraftIfNeeded()
    }, 500) // Debounce for 500ms

    return () => clearTimeout(timer)
  }, [formValues, saveDraftIfNeeded])

  // Save draft when navigating away (Next.js client-side navigation)
  const prevPathname = React.useRef(pathname)
  React.useEffect(() => {
    // If pathname changed and we're no longer on the POS page, save draft immediately
    if (prevPathname.current !== pathname && prevPathname.current === "/admin/pos" && pathname !== "/admin/pos") {
      if (hasLoadedInitialData) {
        const currentValues = form.getValues()
        const hasData = 
          currentValues.client_id ||
          currentValues.caterer_id ||
          currentValues.airport_id ||
          currentValues.items?.some(item => item.itemName) ||
          currentValues.description ||
          currentValues.notes ||
          currentValues.deliveryDate ||
          currentValues.deliveryTime

        if (hasData) {
          console.log("Saving draft on navigation:", currentValues)
          saveDraft(currentValues)
        }
      }
    }
    prevPathname.current = pathname
  }, [pathname, form, hasLoadedInitialData])

  // Save draft on component unmount (when navigating away)
  React.useEffect(() => {
    return () => {
      // Save draft when component unmounts - get values directly to avoid stale closure
      if (!hasLoadedInitialData) return
      const isDuplicate = searchParams.get("duplicate") === "true"
      if (isDuplicate) return

      const currentValues = form.getValues()
      const hasData = 
        currentValues.client_id ||
        currentValues.caterer_id ||
        currentValues.airport_id ||
        currentValues.items?.some(item => item.itemName) ||
        currentValues.description ||
        currentValues.notes ||
        currentValues.deliveryDate ||
        currentValues.deliveryTime

      if (hasData) {
        console.log("Saving draft on unmount:", currentValues)
        saveDraft(currentValues)
      }
    }
  }, [form, hasLoadedInitialData, searchParams])

  // Save draft before page unload (for browser navigation/refresh)
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      saveDraftIfNeeded()
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [saveDraftIfNeeded])

  const summary = React.useMemo(() => {
    const itemsArray = Array.isArray(watchedItems) ? watchedItems : []

    let subtotal = 0
    let totalQuantity = 0

    itemsArray.forEach((item) => {
      const qty = parseFloat(item.portionSize || "0")
      const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1
      const priceNum = parseFloat(item.price || "0")
      const price = Number.isFinite(priceNum) ? priceNum : 0

      totalQuantity += quantity
      // Calculate subtotal: price per item * quantity
      subtotal += price * quantity
    })

    const serviceChargeValue = parseFloat(watchedServiceCharge || "0")
    const serviceCharge = Number.isFinite(serviceChargeValue) ? serviceChargeValue : 0
    const deliveryFeeValue = parseFloat(watchedDeliveryFee || "0")
    const deliveryFee = Number.isFinite(deliveryFeeValue) ? deliveryFeeValue : 0
    const total = subtotal + serviceCharge + deliveryFee

    return {
      subtotal,
      serviceCharge,
      deliveryFee,
      total,
      totalQuantity,
      itemCount: itemsArray.length,
    }
  }, [watchedItems, watchedServiceCharge, watchedDeliveryFee])

  const selectedClientLabel = React.useMemo(
    () => clientOptions.find((o) => o.value === selectedClient?.toString())?.label || clientsData.find((c) => c.id === selectedClient)?.full_name || "Not selected",
    [clientOptions, selectedClient, clientsData]
  )

  const selectedCatererLabel = React.useMemo(
    () => filteredCatererOptions.find((o) => o.value === selectedCaterer?.toString())?.label || caterersData.find((c) => c.id === selectedCaterer)?.caterer_name || "Not selected",
    [filteredCatererOptions, selectedCaterer, caterersData]
  )

  const selectedAirportLabel = React.useMemo(() => {
    const option = filteredAirportOptions.find((o) => o.value === selectedAirport?.toString())
    if (option) return option.label
    const airport = airportsData.find((a) => a.id === selectedAirport)
    if (airport) return decodeHtmlEntities(airport.airport_name)
    return "Not selected"
  }, [filteredAirportOptions, selectedAirport, airportsData])

  const selectedFBOLabel = React.useMemo(
    () => filteredFboOptions.find((o) => o.value === selectedFBO?.toString())?.label || fbosData.find((f) => f.id === selectedFBO)?.fbo_name || "Not selected",
    [filteredFboOptions, selectedFBO, fbosData]
  )

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  // Handle add client - save to backend API
  const handleAddClient = async () => {
    if (!newClientName.trim() || !newClientAddress.trim()) {
      toast.error("Please fill in all required fields (Name and Address)")
      return
    }
    
    setIsSavingClient(true)
    try {
      const body: any = {
        full_name: newClientName.trim(),
        full_address: newClientAddress.trim(),
      }
      
      if (newClientEmail.trim()) {
        body.email = newClientEmail.trim()
      }
      if (newClientContact.trim()) {
        body.contact_number = newClientContact.trim()
      }
      
      const response = await fetch(`${API_BASE_URL}/clients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create client" }))
        throw new Error(errorData.error || "Failed to create client")
      }
      
      const newClient: Client = await response.json()
      
      toast.success("Client created successfully")
      
      // Refresh clients list
      await fetchClients()
      
      // Set the form value to the new client
      form.setValue("client_id", newClient.id)
      
      // Reset form fields
      setNewClientName("")
      setNewClientEmail("")
      setNewClientAddress("")
      setNewClientContact("")
      setClientDialogOpen(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create client"
      toast.error("Error creating client", {
        description: errorMessage,
      })
    } finally {
      setIsSavingClient(false)
    }
  }

  // Handle add caterer - save to backend API
  const handleAddCaterer = async () => {
    if (!newCatererName.trim() || !newCatererNumber.trim()) {
      toast.error("Please fill in all required fields")
      return
    }
    
    setIsSavingCaterer(true)
    try {
      const body: any = {
        caterer_name: newCatererName.trim(),
        caterer_number: newCatererNumber.trim(),
      }
      
      if (newCatererEmail.trim()) {
        body.caterer_email = newCatererEmail.trim()
      }
      if (newCatererAirportIata.trim()) {
        body.airport_code_iata = newCatererAirportIata.trim()
      }
      if (newCatererAirportIcao.trim()) {
        body.airport_code_icao = newCatererAirportIcao.trim()
      }
      if (newCatererTimezone.trim()) {
        body.time_zone = newCatererTimezone.trim()
      }
      
      const response = await fetch(`${API_BASE_URL}/caterers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create caterer" }))
        throw new Error(errorData.error || "Failed to create caterer")
      }
      
      const newCaterer: Caterer = await response.json()
      
      toast.success("Caterer created successfully")
      
      // Refresh caterers list
      await fetchCaterers()
      
      // Set the form value to the new caterer
      form.setValue("caterer_id", newCaterer.id)
      
      // Reset form fields
      setNewCatererName("")
      setNewCatererNumber("")
      setNewCatererEmail("")
      setNewCatererAirportIata("")
      setNewCatererAirportIcao("")
      setSelectedCatererAirport(undefined)
      setCatererDialogOpen(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create caterer"
      toast.error("Error creating caterer", {
        description: errorMessage,
      })
    } finally {
      setIsSavingCaterer(false)
    }
  }

  // Handle add airport - save to backend API
  const handleAddAirport = async () => {
    if (!newAirportName.trim()) {
      toast.error("Please fill in airport name")
      return
    }
    
    setIsSavingAirport(true)
    try {
      const body: any = {
        airport_name: newAirportName.trim(),
      }
      
      if (newAirportIata.trim()) {
        body.airport_code_iata = newAirportIata.trim()
      }
      if (newAirportIcao.trim()) {
        body.airport_code_icao = newAirportIcao.trim()
      }
      
      const response = await fetch(`${API_BASE_URL}/airports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create airport" }))
        throw new Error(errorData.error || "Failed to create airport")
      }
      
      const newAirport: Airport = await response.json()
      
      toast.success("Airport created successfully")
      
      // Refresh airports list
      await fetchAirports()
      
      // Set the form value to the new airport
      form.setValue("airport_id", newAirport.id)
      
      // Reset form fields
      setNewAirportName("")
      setNewAirportIata("")
      setNewAirportIcao("")
      setAirportDialogOpen(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create airport"
      toast.error("Error creating airport", {
        description: errorMessage,
      })
    } finally {
      setIsSavingAirport(false)
    }
  }

  // Handle add FBO - save to backend API
  const handleAddFBO = async () => {
    if (!newStandaloneFboName.trim()) {
      toast.error("Please fill in FBO name")
      return
    }

    setIsSavingFBO(true)
    try {
      const body: any = {
        fbo_name: newStandaloneFboName.trim(),
      }

      if (newStandaloneFboEmail.trim()) {
        body.fbo_email = newStandaloneFboEmail.trim()
      }
      if (newStandaloneFboPhone.trim()) {
        body.fbo_phone = newStandaloneFboPhone.trim()
      }

      const response = await fetch(`${API_BASE_URL}/fbos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create FBO" }))
        throw new Error(errorData.error || "Failed to create FBO")
      }

      const newFBO: FBO = await response.json()

      toast.success("FBO created successfully")

      // Refresh FBOs list
      await fetchFBOs()

      // Set the form value to the new FBO
      form.setValue("fbo_id", newFBO.id)

      // Reset form fields
      setNewStandaloneFboName("")
      setNewStandaloneFboEmail("")
      setNewStandaloneFboPhone("")
      setFboDialogOpen(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create FBO"
      toast.error("Error creating FBO", {
        description: errorMessage,
      })
    } finally {
      setIsSavingFBO(false)
    }
  }

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
      // Handle network errors gracefully - these are expected in some scenarios (offline, CORS, etc.)
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        // Network error - log as warn instead of error since it's not necessarily a problem
        // This can happen if backend is not running, CORS issues, or network problems
        console.warn(`Network error fetching categories from ${API_BASE_URL}/categories - this may be expected if backend is not running`)
      } else {
        // Other unexpected errors
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

  // Fetch categories on mount
  React.useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Handle menu item creation
  const handleAddMenuItem = async (values: MenuItemFormValues) => {
    setIsSavingMenuItem(true)
    try {
      const body: any = {
        item_name: values.item_name,
        food_type: values.food_type,
        is_active: values.is_active,
      }

      if (values.category && values.category.trim()) {
        body.category = values.category
      }
      if (values.price !== undefined) {
        body.price = values.price
      }
      if (values.item_description) {
        body.item_description = values.item_description
      }
      if (values.image_url) {
        body.image_url = values.image_url
      }
      if (values.tax_rate !== undefined) {
        body.tax_rate = values.tax_rate
      }
      if (values.service_charge !== undefined) {
        body.service_charge = values.service_charge
      }

      const response = await fetch(`${API_BASE_URL}/menu-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create menu item" }))
        throw new Error(errorData.error || "Failed to create menu item")
      }

      const newMenuItem: MenuItem = await response.json()
      
      toast.success("Menu item created successfully", {
        description: `${newMenuItem.item_name} has been added to the system.`,
      })

      // Refresh menu items list
      await fetchMenuItems(undefined, false)
      
      // Set the form value to the new menu item
      if (currentItemIndex !== undefined) {
        form.setValue(`items.${currentItemIndex}.itemName`, newMenuItem.id.toString())
        // Auto-populate price if available (from variants for backward compatibility, or from price field)
        const price = (newMenuItem.variants && newMenuItem.variants.length > 0) 
          ? newMenuItem.variants[0].price 
          : (newMenuItem as any).price
        if (price !== undefined) {
          form.setValue(`items.${currentItemIndex}.price`, price.toString())
        }
        // Auto-populate category if available
        if (newMenuItem.category) {
          form.setValue(`items.${currentItemIndex}.category`, newMenuItem.category)
        }
      }

      // Reset form and close dialog
      menuItemForm.reset()
      setMenuItemDialogOpen(false)
      setCurrentItemIndex(undefined)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create menu item"
      toast.error("Error creating menu item", {
        description: errorMessage,
      })
    } finally {
      setIsSavingMenuItem(false)
    }
  }

  const handleClear = () => {
    form.reset()
    clearDraft() // Clear draft when user clicks clear
    toast.success("Form cleared", {
      description: "All form data has been cleared.",
    })
  }

  const handlePreview = () => {
    // Generate HTML preview from form values
    // This will be replaced with actual HTML from backend or generated here
    // For now, we'll keep the existing preview structure but prepare for HTML
    setPreviewOpen(true)
    // TODO: Set previewHtml with actual HTML content from backend or generate it here
    // setPreviewHtml(generatedHtml)
  }

  const handleSave = async () => {
    const isValid = await form.trigger()
    if (!isValid) {
      toast.error("Please fix form errors before saving")
      return
    }

    try {
      const formData = form.getValues()
      
      // Prepare the order payload
      const orderPayload = {
        order_number: formData.order_number?.trim() || null,
        client_id: formData.client_id,
        caterer_id: formData.caterer_id,
        airport_id: formData.airport_id,
        fbo_id: formData.fbo_id || null,
        aircraft_tail_number: formData.aircraftTailNumber || null,
        delivery_date: formData.deliveryDate,
        delivery_time: formData.deliveryTime,
        order_priority: formData.orderPriority,
        order_type: formData.orderType,
        payment_method: formData.paymentMethod,
        service_charge: formData.serviceCharge && formData.serviceCharge.trim() ? parseFloat(formData.serviceCharge) : 0,
        delivery_fee: formData.deliveryFee && formData.deliveryFee.trim() ? parseFloat(formData.deliveryFee) : 0,
        description: formData.description || null,
        notes: formData.notes || null,
        reheating_instructions: formData.reheatingInstructions || null,
        packaging_instructions: formData.packagingInstructions || null,
        dietary_restrictions: formData.dietaryRestrictions || null,
        items: formData.items.map((item) => {
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

      console.log("Order payload being sent:", JSON.stringify(orderPayload, null, 2))
      
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Order creation error response:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })
        const errorMessage = errorData.message || errorData.error || `Failed to create order: ${response.statusText} (${response.status})`
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log("Order created successfully:", result)
      toast.success("Order created successfully!")
      setPreviewOpen(false)
      form.reset()
      clearDraft() // Clear draft after successful save
    } catch (error) {
      console.error("Error creating order:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create order. Please try again."
      toast.error("Order Creation Failed", {
        description: errorMessage,
        duration: 5000,
      })
    }
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <HeaderNav title="Create New Order" />
        <div className="flex flex-1 flex-col p-4 pt-4 md:p-6 md:pl-0 md:peer-data-[collapsible=icon]:pl-2 bg-gradient-to-br from-background via-background to-primary/[0.02]">
          <div className="relative flex h-[calc(100vh-5rem)] flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-28">
              <div className="max-w-6xl mx-auto space-y-5">
                      {/* Page Header */}
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg" />
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                              <ShoppingBag className="h-6 w-6 text-primary-foreground" />
                            </div>
                          </div>
                          <div>
                            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">New Order</h1>
                            <p className="text-sm text-muted-foreground">Create a new catering order for delivery</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs font-medium border-primary/30 bg-primary/5 text-primary">
                            <span className="mr-1.5 h-2 w-2 rounded-full bg-primary animate-pulse inline-block" />
                            Draft
                          </Badge>
                        </div>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
                        {/* Main Form Card */}
                        <Card className="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-b from-card via-card to-card/95 shadow-2xl shadow-black/40 ring-1 ring-white/[0.05]">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent" />
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                          <CardContent className="relative pt-8 pb-6 px-6">
                            <Form {...form}>
                              <form className="space-y-8">
                            {/* Client & Order Information Section */}
                            <section className="space-y-5">
                              <div className="flex items-center gap-3 pb-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 ring-1 ring-blue-500/20">
                                  <User className="h-4 w-4 text-blue-400" />
                                </div>
                                <h2 className="text-sm font-semibold tracking-wide text-foreground">Client & Order Information</h2>
                                <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
                              </div>
                              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                                        onAddNew={() => setClientDialogOpen(true)}
                                        addNewLabel="Add New Client"
                                        onSearchChange={setClientSearch}
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
                                        onAddNew={() => setCatererDialogOpen(true)}
                                        addNewLabel="Add New Caterer"
                                        onSearchChange={setCatererSearch}
                                        isLoading={isLoadingCaterers}
                                        onOpenChange={handleCatererComboboxOpen}
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
                                        onAddNew={() => setAirportDialogOpen(true)}
                                        addNewLabel="Add New Airport"
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
                                        onAddNew={() => setFboDialogOpen(true)}
                                        addNewLabel="Add New FBO"
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
                              <div className="grid gap-5 sm:grid-cols-2">
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
                            <section className="space-y-4">
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
                                  className="group relative p-5 rounded-xl border border-border/30 bg-gradient-to-b from-muted/30 to-muted/10 space-y-4 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
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

                                  {/* Item Fields */}
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.itemName`}
                                      render={({ field }) => (
                                        <FormItem>
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
                                                    // Auto-populate price if available (from variants or direct price field)
                                                    const price = (selectedItem.variants && selectedItem.variants.length > 0)
                                                      ? selectedItem.variants[0].price
                                                      : (selectedItem as any).price
                                                    if (price !== undefined && price !== null) {
                                                      form.setValue(`items.${index}.price`, price.toString())
                                                    }
                                                    // Auto-populate description if available
                                                    if (selectedItem.item_description) {
                                                      form.setValue(`items.${index}.itemDescription`, selectedItem.item_description)
                                                    }
                                                    // Auto-populate category if available
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
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <div className="grid grid-cols-3 gap-3">
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
                                    </div>
                                  </div>

                                  <div className="grid gap-4 sm:grid-cols-2">
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
                                  </div>

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
                      {/* Order Summary Sidebar */}
                      <div className="space-y-4">
                        <Card className="sticky top-4 overflow-hidden rounded-2xl border-0 bg-gradient-to-b from-card via-card to-card/95 shadow-2xl shadow-black/40 ring-1 ring-white/[0.05]">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent" />
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                          <CardContent className="relative space-y-5 pt-6 pb-6">
                            {/* Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-border/30">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20">
                                  <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="text-sm font-semibold">Order Summary</h3>
                                  <p className="text-[11px] text-muted-foreground">Live preview</p>
                                </div>
                              </div>
                              <Badge variant="outline" className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${priorityBadgeClass}`}>
                                {watchedPriority ? watchedPriority.charAt(0).toUpperCase() + watchedPriority.slice(1) : "Priority"}
                              </Badge>
                            </div>

                            {/* Client Info */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-500/5 to-transparent border border-blue-500/10">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                                  <User className="h-4 w-4 text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-muted-foreground">Client</p>
                                  <p className="text-sm font-medium truncate">{selectedClientLabel}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-500/5 to-transparent border border-violet-500/10">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                                  <ChefHat className="h-4 w-4 text-violet-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-muted-foreground">Caterer</p>
                                  <p className="text-sm font-medium truncate">{selectedCatererLabel}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-500/5 to-transparent border border-cyan-500/10">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                                  <Plane className="h-4 w-4 text-cyan-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-muted-foreground">Airport</p>
                                  <p className="text-sm font-medium truncate">{selectedAirportLabel}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-500/5 to-transparent border border-blue-500/10">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                                  <Building2 className="h-4 w-4 text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-muted-foreground">FBO</p>
                                  <p className="text-sm font-medium truncate">{selectedFBOLabel}</p>
                                </div>
                              </div>
                            </div>

                            {/* Delivery & Payment Info */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30">
                                <div className="flex items-center gap-2 mb-1">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</p>
                                </div>
                                <p className="text-sm font-semibold">{watchedDeliveryDate || "—"}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</p>
                                </div>
                                <p className="text-sm font-semibold">{watchedDeliveryTime || "—"}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30">
                                <div className="flex items-center gap-2 mb-1">
                                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Payment</p>
                                </div>
                                <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[10px] ${paymentBadgeClass}`}>
                                  {watchedPayment ? (watchedPayment === "ACH" ? "ACH" : "Card") : "—"}
                                </Badge>
                              </div>
                              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                                <div className="flex items-center gap-2 mb-1">
                                  <Package className="h-3.5 w-3.5 text-purple-400" />
                                  <p className="text-[10px] text-purple-400/80 uppercase tracking-wider">Type</p>
                                </div>
                                <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[10px] ${orderTypeBadgeClass}`}>
                                  {watchedOrderType || "—"}
                                </Badge>
                              </div>
                              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                                <div className="flex items-center gap-2 mb-1">
                                  <UtensilsCrossed className="h-3.5 w-3.5 text-emerald-400" />
                                  <p className="text-[10px] text-emerald-400/80 uppercase tracking-wider">Items</p>
                                </div>
                                <p className="text-sm font-semibold text-emerald-400">{summary.itemCount} · {summary.totalQuantity} qty</p>
                              </div>
                            </div>

                            {/* Totals */}
                            <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">{formatCurrency(summary.subtotal)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Service charge</span>
                                <span className="font-medium">{formatCurrency(summary.serviceCharge)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Delivery fee</span>
                                <span className="font-medium">{formatCurrency(summary.deliveryFee)}</span>
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t border-primary/20">
                                <span className="text-sm font-semibold">Total</span>
                                <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">{formatCurrency(summary.total)}</span>
                              </div>
                            </div>

                            {/* Recent Items */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-muted-foreground">Recent Items</p>
                                <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] bg-muted/50">
                                  {watchedItems.length}
                                </Badge>
                              </div>
                              {watchedItems.length === 0 ? (
                                <div className="p-4 rounded-xl border border-dashed border-border/50 bg-muted/10 text-center">
                                  <UtensilsCrossed className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
                                  <p className="text-xs text-muted-foreground">No items added yet</p>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-hide">
                                  {watchedItems.slice(0, 4).map((item, idx) => (
                                    <div key={`${item.itemName}-${idx}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/20 hover:border-border/40 transition-colors">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-400">
                                        {idx + 1}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{menuItemOptions.find(m => m.value === item.itemName)?.label || item.itemName || "Unnamed"}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                          Qty: {item.portionSize || "1"}
                                          {item.portionServing && <span className="ml-2">• Size: {item.portionServing}</span>}
                                        </p>
                                      </div>
                                      <span className="text-sm font-semibold text-primary">{formatCurrency(parseFloat(item.price || "0"))}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Fixed buttons at bottom */}
                  <div 
                    className="fixed bottom-0 right-0 z-50 flex items-center gap-4 border-t border-border/30 bg-gradient-to-r from-background/98 via-background/95 to-background/98 backdrop-blur-xl p-4 shadow-[0_-4px_30px_rgba(0,0,0,0.3)] transition-[margin-left] duration-200 ease-linear"
                    style={{ marginLeft: buttonMarginLeft }}
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span>Draft saved</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={handleClear}
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear
                    </Button>
                    <Drawer open={previewOpen} onOpenChange={setPreviewOpen} direction="right">
                      <DrawerTrigger asChild>
                        <Button
                          type="button"
                          size="lg"
                          className="gap-2 px-8 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 shadow-lg shadow-primary/25 text-white font-semibold"
                          onClick={handlePreview}
                        >
                          <Eye className="h-4 w-4" />
                          Preview Order
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent side="right" resizable>
                        <div className="flex flex-col h-full">
                          <DrawerHeader className="flex-shrink-0">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg" />
                                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-500 shadow-lg shadow-primary/25">
                                  <Eye className="h-6 w-6 text-white" />
                                </div>
                              </div>
                              <div>
                                <DrawerTitle>Order Preview</DrawerTitle>
                                <DrawerDescription>
                                  Review all order details before saving
                                </DrawerDescription>
                              </div>
                            </div>
                          </DrawerHeader>
                          <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                            {previewHtml ? (
                              <div 
                                className="prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                              />
                            ) : (
                              <div className="space-y-6">
                                {/* Order Info Cards */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 overflow-hidden">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                                        <User className="h-4 w-4 text-blue-400" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Client</p>
                                        <p className="font-semibold truncate">
                                          {clientOptions.find((c) => c.value === formValues.client_id?.toString())?.label || 
                                           clientsData.find((c) => c.id === formValues.client_id)?.full_name || 
                                           "Not selected"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20 overflow-hidden">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/20">
                                        <ChefHat className="h-4 w-4 text-violet-400" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Caterer</p>
                                        <p className="font-semibold truncate">
                                          {catererOptions.find((c) => c.value === formValues.caterer_id?.toString())?.label || 
                                           caterersData.find((c) => c.id === formValues.caterer_id)?.caterer_name || 
                                           "Not selected"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 overflow-hidden">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20">
                                        <Plane className="h-4 w-4 text-cyan-400" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Airport</p>
                                        <p className="font-semibold truncate" title={(() => {
                                          const option = airportOptions.find((a) => a.value === formValues.airport_id?.toString())
                                          if (option) return option.label
                                          const airport = airportsData.find((a) => a.id === formValues.airport_id)
                                          if (airport) return decodeHtmlEntities(airport.airport_name)
                                          return "Not selected"
                                        })()}>
                                          {(() => {
                                            const option = airportOptions.find((a) => a.value === formValues.airport_id?.toString())
                                            if (option) return option.label
                                            const airport = airportsData.find((a) => a.id === formValues.airport_id)
                                            if (airport) return decodeHtmlEntities(airport.airport_name)
                                            return "Not selected"
                                          })()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  {formValues.aircraftTailNumber && (
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30">
                                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Tail Number</p>
                                      <p className="font-semibold font-mono">{formValues.aircraftTailNumber}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Delivery & Payment Info */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</p>
                                    </div>
                                    <p className="font-semibold text-sm">{formValues.deliveryDate || "—"}</p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</p>
                                    </div>
                                    <p className="font-semibold text-sm">{formValues.deliveryTime || "—"}</p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Priority</p>
                                    {formValues.orderPriority ? (
                                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${
                                        formValues.orderPriority === "low" ? "border-green-500/30 bg-green-500/10 text-green-400" :
                                        formValues.orderPriority === "normal" ? "border-blue-500/30 bg-blue-500/10 text-blue-400" :
                                        formValues.orderPriority === "high" ? "border-orange-500/30 bg-orange-500/10 text-orange-400" :
                                        "border-red-500/30 bg-red-500/10 text-red-400"
                                      }`}>
                                        {formValues.orderPriority.charAt(0).toUpperCase() + formValues.orderPriority.slice(1)}
                                      </Badge>
                                    ) : <span className="text-sm text-muted-foreground">—</span>}
                                  </div>
                                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                                    <div className="flex items-center gap-2 mb-1">
                                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Payment</p>
                                    </div>
                                    <p className="font-semibold text-sm">
                                      {formValues.paymentMethod === "card" ? "Card" : formValues.paymentMethod === "ACH" ? "ACH" : "—"}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Order Type</p>
                                    </div>
                                    {formValues.orderType ? (
                                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${
                                        formValues.orderType === "inflight" ? "border-purple-500/30 bg-purple-500/10 text-purple-400" :
                                        formValues.orderType === "qe_serv_hub" ? "border-teal-500/30 bg-teal-500/10 text-teal-400" :
                                        "border-orange-500/30 bg-orange-500/10 text-orange-400"
                                      }`}>
                                        {formValues.orderType === "inflight" ? "Inflight order" :
                                         formValues.orderType === "qe_serv_hub" ? "QE Serv Hub Order" :
                                         formValues.orderType === "restaurant_pickup" ? "Restaurant Pickup Order" :
                                         formValues.orderType}
                                      </Badge>
                                    ) : <span className="text-sm text-muted-foreground">—</span>}
                                  </div>
                                </div>

                                {/* Description */}
                                {formValues.description && (
                                  <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                                    <p className="text-sm">{formValues.description}</p>
                                  </div>
                                )}

                                {/* Special Instructions */}
                                {(formValues.reheatingInstructions || formValues.packagingInstructions || formValues.dietaryRestrictions || formValues.notes) && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 ring-1 ring-amber-500/20">
                                        <FileText className="h-4 w-4 text-amber-400" />
                                      </div>
                                      <h3 className="font-semibold">Special Instructions</h3>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      {formValues.reheatingInstructions && (
                                        <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Reheating</p>
                                          <p className="text-sm">{formValues.reheatingInstructions}</p>
                                        </div>
                                      )}
                                      {formValues.packagingInstructions && (
                                        <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Packaging</p>
                                          <p className="text-sm">{formValues.packagingInstructions}</p>
                                        </div>
                                      )}
                                      {formValues.dietaryRestrictions && (
                                        <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Dietary</p>
                                          <p className="text-sm">{formValues.dietaryRestrictions}</p>
                                        </div>
                                      )}
                                      {formValues.notes && (
                                        <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                                          <p className="text-sm">{formValues.notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Order Items */}
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 ring-1 ring-emerald-500/20">
                                      <UtensilsCrossed className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <h3 className="font-semibold">Order Items</h3>
                                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                      {formValues.items?.length || 0} items
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    {formValues.items?.map((item, index) => (
                                      <div key={index} className="p-4 rounded-xl bg-gradient-to-b from-muted/30 to-muted/10 border border-border/30">
                                        <div className="flex items-start gap-3">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-400 flex-shrink-0">
                                            {index + 1}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">
                                              {menuItemOptions.find((i) => i.value === item.itemName)?.label || 
                                               menuItemsData.find((i) => i.id.toString() === item.itemName)?.item_name || 
                                               "Not selected"}
                                            </p>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                              <span>Qty: {item.portionSize || "1"}</span>
                                              {item.portionServing && <span>Size: {item.portionServing}</span>}
                                              <span className="font-semibold text-primary">${item.price || "0.00"}</span>
                                            </div>
                                            {item.category && (
                                              <div className="mt-2">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Category: </span>
                                                <span className="text-sm text-muted-foreground">{item.category}</span>
                                              </div>
                                            )}
                                            {item.itemDescription && (
                                              <p className="mt-2 text-sm text-muted-foreground">{item.itemDescription}</p>
                                            )}
                                            {item.packaging && (
                                              <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-border/20">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Packaging</p>
                                                <p className="text-sm text-muted-foreground">{item.packaging}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Totals */}
                                {formValues.items && formValues.items.length > 0 && (
                                  <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-muted-foreground">Subtotal</span>
                                      <span className="font-medium">
                                        ${formValues.items.reduce((sum, item) => {
                                          const price = parseFloat(item.price || "0")
                                          const quantity = parseFloat(item.portionSize || "1")
                                          return sum + (price * quantity)
                                        }, 0).toFixed(2)}
                                      </span>
                                    </div>
                                    {formValues.serviceCharge && parseFloat(formValues.serviceCharge) > 0 && (
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Service Charge</span>
                                        <span className="font-medium">${parseFloat(formValues.serviceCharge).toFixed(2)}</span>
                                      </div>
                                    )}
                                    {formValues.deliveryFee && parseFloat(formValues.deliveryFee) > 0 && (
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Delivery Fee</span>
                                        <span className="font-medium">${parseFloat(formValues.deliveryFee).toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center pt-3 border-t border-primary/20">
                                      <span className="font-semibold">Total</span>
                                      <span className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                                        ${(
                                          formValues.items.reduce((sum, item) => {
                                            const price = parseFloat(item.price || "0")
                                            const quantity = parseFloat(item.portionSize || "1")
                                            return sum + (price * quantity)
                                          }, 0) +
                                          (parseFloat(formValues.serviceCharge || "0")) +
                                          (parseFloat(formValues.deliveryFee || "0"))
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <DrawerFooter className="flex-shrink-0 flex-row gap-3">
                            <DrawerClose asChild>
                              <Button variant="ghost" className="flex-1 text-muted-foreground hover:text-foreground">Cancel</Button>
                            </DrawerClose>
                            <Button 
                              onClick={handleSave} 
                              className="flex-1 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 shadow-lg shadow-primary/25 text-white"
                            >
                              <Save className="mr-2 h-4 w-4" />
                              Save Order
                            </Button>
                          </DrawerFooter>
                        </div>
                      </DrawerContent>
                    </Drawer>
                  </div>

                  {/* Add Client Dialog */}
                  <Dialog 
                    open={clientDialogOpen} 
                    onOpenChange={(open) => {
                      setClientDialogOpen(open)
                      if (!open) {
                        setNewClientName("")
                        setNewClientEmail("")
                        setNewClientAddress("")
                        setNewClientContact("")
                      }
                    }}
                  >
                    <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-hide border-0 bg-card shadow-2xl shadow-black/50 ring-1 ring-white/[0.05]">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.05] via-transparent to-transparent rounded-lg pointer-events-none" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                      <DialogHeader className="relative pb-4 border-b border-border/30">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-lg" />
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                              <User className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div>
                            <DialogTitle className="text-xl font-bold">Add New Client</DialogTitle>
                            <DialogDescription className="text-sm">
                              Enter the client information to add to the system
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                      <div className="relative space-y-5 py-6">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="client-name" className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                              <User className="h-3.5 w-3.5" />
                              Client Name *
                            </Label>
                            <Input
                              id="client-name"
                              placeholder="Enter client name..."
                              value={newClientName}
                              onChange={(e) => setNewClientName(e.target.value)}
                              className="h-11 bg-muted/30 border-border/40 focus:border-blue-500/50 focus:ring-blue-500/20"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
                                  const form = e.target.closest("form") || e.target.closest("[role='dialog']")
                                  const nextInput = form?.querySelector("input:not([id='client-name'])") as HTMLInputElement
                                  if (nextInput) {
                                    nextInput.focus()
                                  } else {
                                    e.preventDefault()
                                    handleAddClient()
                                  }
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="client-email" className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5" />
                              Email Address
                            </Label>
                            <Input
                              id="client-email"
                              type="email"
                              placeholder="Enter email address..."
                              value={newClientEmail}
                              onChange={(e) => setNewClientEmail(e.target.value)}
                              className="h-11 bg-muted/30 border-border/40 focus:border-blue-500/50 focus:ring-blue-500/20"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
                                  const form = e.target.closest("form") || e.target.closest("[role='dialog']")
                                  const nextInput = form?.querySelector("input:not([id='client-email']):not([id='client-name'])") as HTMLInputElement
                                  if (nextInput) {
                                    nextInput.focus()
                                  } else {
                                    e.preventDefault()
                                    handleAddClient()
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="client-address" className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5" />
                            Full Address *
                          </Label>
                          <Textarea
                            id="client-address"
                            placeholder="Enter full address..."
                            value={newClientAddress}
                            onChange={(e) => setNewClientAddress(e.target.value)}
                            rows={3}
                            className="resize-none bg-muted/30 border-border/40 focus:border-blue-500/50 focus:ring-blue-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="client-contact" className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            Contact Number
                          </Label>
                          <Input
                            id="client-contact"
                            type="tel"
                            placeholder="Enter contact number..."
                            value={newClientContact}
                            onChange={(e) => setNewClientContact(e.target.value)}
                            className="h-11 bg-muted/30 border-border/40 focus:border-blue-500/50 focus:ring-blue-500/20 sm:max-w-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
                                e.preventDefault()
                                handleAddClient()
                              }
                            }}
                          />
                        </div>
                      </div>
                      <DialogFooter className="relative pt-4 border-t border-border/30 gap-3">
                        <Button 
                          variant="ghost" 
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setClientDialogOpen(false)
                            setNewClientName("")
                            setNewClientEmail("")
                            setNewClientAddress("")
                            setNewClientContact("")
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddClient} 
                          disabled={isSavingClient || !newClientName.trim() || !newClientAddress.trim()}
                          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/25 text-white px-6"
                        >
                          {isSavingClient ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Client
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Add Caterer Dialog */}
                  <Dialog open={catererDialogOpen} onOpenChange={setCatererDialogOpen}>
                    <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-hide border-0 bg-card shadow-2xl shadow-black/50 ring-1 ring-white/[0.05]">
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.05] via-transparent to-transparent rounded-lg pointer-events-none" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                      <DialogHeader className="relative pb-4 border-b border-border/30">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-violet-500/20 rounded-xl blur-lg" />
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25">
                              <ChefHat className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div>
                            <DialogTitle className="text-xl font-bold">Add New Caterer</DialogTitle>
                            <DialogDescription className="text-sm">
                              Enter the details of the new caterer to add to the system
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                      <div className="relative space-y-5 py-6">
                        {/* Basic Info Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/10 text-violet-400">1</span>
                            Basic Information
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="caterer-name" className="text-xs font-medium text-muted-foreground">Caterer Name *</Label>
                              <Input
                                id="caterer-name"
                                placeholder="Enter caterer name..."
                                value={newCatererName}
                                onChange={(e) => setNewCatererName(e.target.value)}
                                className="h-11 bg-muted/30 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="caterer-number" className="text-xs font-medium text-muted-foreground">Caterer Number *</Label>
                              <Input
                                id="caterer-number"
                                placeholder="Enter caterer number..."
                                value={newCatererNumber}
                                onChange={(e) => setNewCatererNumber(e.target.value)}
                                className="h-11 bg-muted/30 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="caterer-email" className="text-xs font-medium text-muted-foreground">Email Address</Label>
                            <Input
                              id="caterer-email"
                              type="email"
                              placeholder="Enter email..."
                              value={newCatererEmail}
                              onChange={(e) => setNewCatererEmail(e.target.value)}
                              className="h-11 bg-muted/30 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20 sm:max-w-md"
                            />
                          </div>
                        </div>
                        
                        {/* Airport Selection Section */}
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/10 text-violet-400">2</span>
                            Airport Information
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="caterer-airport" className="text-xs font-medium text-muted-foreground">Select Airport</Label>
                            <Combobox
                              options={filteredAirportOptions}
                              value={selectedCatererAirport?.toString() || ""}
                              onValueChange={(value) => {
                                if (value) {
                                  const airportId = parseInt(value)
                                  setSelectedCatererAirport(airportId)
                                  const airport = airportsData.find((a) => a.id === airportId)
                                  if (airport) {
                                    setNewCatererAirportIata(airport.airport_code_iata || "")
                                    setNewCatererAirportIcao(airport.airport_code_icao || "")
                                  }
                                } else {
                                  setSelectedCatererAirport(undefined)
                                  setNewCatererAirportIata("")
                                  setNewCatererAirportIcao("")
                                }
                              }}
                              placeholder="Select airport to auto-fill codes..."
                              searchPlaceholder="Search airports..."
                              emptyMessage="No airports found."
                              onSearchChange={setAirportSearch}
                              isLoading={isLoadingAirports}
                              onOpenChange={handleAirportComboboxOpen}
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="caterer-iata" className="text-xs font-medium text-muted-foreground">IATA Code</Label>
                              <Input
                                id="caterer-iata"
                                placeholder="e.g., JFK"
                                value={newCatererAirportIata}
                                onChange={(e) => setNewCatererAirportIata(e.target.value.toUpperCase())}
                                maxLength={3}
                                readOnly={!!selectedCatererAirport}
                                className={`h-11 bg-muted/30 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20 font-mono uppercase ${selectedCatererAirport ? "cursor-not-allowed opacity-60" : ""}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="caterer-icao" className="text-xs font-medium text-muted-foreground">ICAO Code</Label>
                              <Input
                                id="caterer-icao"
                                placeholder="e.g., KJFK"
                                value={newCatererAirportIcao}
                                onChange={(e) => setNewCatererAirportIcao(e.target.value.toUpperCase())}
                                maxLength={4}
                                readOnly={!!selectedCatererAirport}
                                className={`h-11 bg-muted/30 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20 font-mono uppercase ${selectedCatererAirport ? "cursor-not-allowed opacity-60" : ""}`}
                              />
                            </div>
                          </div>
                          {selectedCatererAirport && (
                            <p className="text-xs text-muted-foreground">
                              Airport codes are auto-filled from selected airport. Clear selection to enter manually.
                            </p>
                          )}
                        </div>
                        
                        {/* Time Zone Section */}
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/10 text-violet-400">3</span>
                            Time Zone
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="caterer-timezone" className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5" />
                              Time Zone
                            </Label>
                            <Input
                              id="caterer-timezone"
                              placeholder="e.g., America/New_York"
                              value={newCatererTimezone}
                              onChange={(e) => setNewCatererTimezone(e.target.value)}
                              className="h-11 bg-muted/30 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20 sm:max-w-md"
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="relative pt-4 border-t border-border/30 gap-3">
                        <Button 
                          variant="ghost" 
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setCatererDialogOpen(false)
                            setNewCatererName("")
                            setNewCatererNumber("")
                            setNewCatererEmail("")
                            setNewCatererAirportIata("")
                            setNewCatererAirportIcao("")
                            setNewCatererTimezone("")
                            setSelectedCatererAirport(undefined)
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddCaterer} 
                          disabled={isSavingCaterer || !newCatererName.trim() || !newCatererNumber.trim()}
                          className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/25 text-white px-6"
                        >
                          {isSavingCaterer ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Caterer
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Add Airport Dialog */}
                  <Dialog open={airportDialogOpen} onOpenChange={setAirportDialogOpen}>
                    <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-hide border-0 bg-card shadow-2xl shadow-black/50 ring-1 ring-white/[0.05]">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.05] via-transparent to-transparent rounded-lg pointer-events-none" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                      <DialogHeader className="relative pb-4 border-b border-border/30">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/20 rounded-xl blur-lg" />
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/25">
                              <Plane className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div>
                            <DialogTitle className="text-xl font-bold">Add New Airport</DialogTitle>
                            <DialogDescription className="text-sm">
                              Enter the details of the new airport to add to the system
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                      <div className="relative space-y-5 py-6">
                        {/* Basic Info Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/10 text-cyan-400">1</span>
                            Airport Information
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="airport-name" className="text-xs font-medium text-muted-foreground">Airport Name *</Label>
                            <Input
                              id="airport-name"
                              placeholder="Enter airport name..."
                              value={newAirportName}
                              onChange={(e) => setNewAirportName(e.target.value)}
                              className="h-11 bg-muted/30 border-border/40 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                            />
                          </div>
                        </div>
                        
                        {/* Airport Codes Section */}
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/10 text-cyan-400">2</span>
                            Airport Codes
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="airport-iata" className="text-xs font-medium text-muted-foreground">IATA Code</Label>
                              <Input
                                id="airport-iata"
                                placeholder="e.g., JFK"
                                value={newAirportIata}
                                onChange={(e) => setNewAirportIata(e.target.value.toUpperCase())}
                                maxLength={3}
                                className="h-11 bg-muted/30 border-border/40 focus:border-cyan-500/50 focus:ring-cyan-500/20 font-mono uppercase"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="airport-icao" className="text-xs font-medium text-muted-foreground">ICAO Code</Label>
                              <Input
                                id="airport-icao"
                                placeholder="e.g., KJFK"
                                value={newAirportIcao}
                                onChange={(e) => setNewAirportIcao(e.target.value.toUpperCase())}
                                maxLength={4}
                                className="h-11 bg-muted/30 border-border/40 focus:border-cyan-500/50 focus:ring-cyan-500/20 font-mono uppercase"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="relative pt-4 border-t border-border/30 gap-3">
                        <Button 
                          variant="ghost" 
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setAirportDialogOpen(false)
                            setNewAirportName("")
                            setNewAirportIata("")
                            setNewAirportIcao("")
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddAirport} 
                          disabled={isSavingAirport || !newAirportName.trim()}
                          className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-lg shadow-cyan-500/25 text-white px-6"
                        >
                          {isSavingAirport ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Airport
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Add FBO Dialog */}
                  <Dialog open={fboDialogOpen} onOpenChange={setFboDialogOpen}>
                    <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-hide border-0 bg-card shadow-2xl shadow-black/50 ring-1 ring-white/[0.05]">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.05] via-transparent to-transparent rounded-lg pointer-events-none" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                      <DialogHeader className="relative pb-4 border-b border-border/30">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-lg" />
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                              <Building2 className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div>
                            <DialogTitle className="text-xl font-bold">Add New FBO</DialogTitle>
                            <DialogDescription className="text-sm">
                              Enter the details of the new FBO to add to the system
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                      <div className="relative space-y-5 py-6">
                        {/* FBO Information Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10 text-blue-400">1</span>
                            FBO Information
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="standalone-fbo-name" className="text-xs font-medium text-muted-foreground">FBO Name *</Label>
                            <Input
                              id="standalone-fbo-name"
                              placeholder="Enter FBO name..."
                              value={newStandaloneFboName}
                              onChange={(e) => setNewStandaloneFboName(e.target.value)}
                              className="h-11 bg-muted/30 border-border/40 focus:border-blue-500/50 focus:ring-blue-500/20"
                            />
                          </div>
                        </div>
                        
                        {/* Contact Information Section */}
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10 text-blue-400">2</span>
                            Contact Information
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="standalone-fbo-email" className="text-xs font-medium text-muted-foreground">Email Address</Label>
                              <Input
                                id="standalone-fbo-email"
                                type="email"
                                placeholder="Enter FBO email..."
                                value={newStandaloneFboEmail}
                                onChange={(e) => setNewStandaloneFboEmail(e.target.value)}
                                className="h-11 bg-muted/30 border-border/40 focus:border-blue-500/50 focus:ring-blue-500/20"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="standalone-fbo-phone" className="text-xs font-medium text-muted-foreground">Phone Number</Label>
                              <Input
                                id="standalone-fbo-phone"
                                type="tel"
                                placeholder="Enter FBO phone..."
                                value={newStandaloneFboPhone}
                                onChange={(e) => setNewStandaloneFboPhone(e.target.value)}
                                className="h-11 bg-muted/30 border-border/40 focus:border-blue-500/50 focus:ring-blue-500/20"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="relative pt-4 border-t border-border/30 gap-3">
                        <Button 
                          variant="ghost" 
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setFboDialogOpen(false)
                            setNewStandaloneFboName("")
                            setNewStandaloneFboEmail("")
                            setNewStandaloneFboPhone("")
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddFBO} 
                          disabled={isSavingFBO || !newStandaloneFboName.trim()}
                          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/25 text-white px-6"
                        >
                          {isSavingFBO ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Add FBO
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Add Menu Item Dialog */}
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
                    <DialogContent className="sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide border-0 bg-card shadow-2xl shadow-black/50 ring-1 ring-white/[0.05]">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] via-transparent to-transparent rounded-lg pointer-events-none" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                      <DialogHeader className="relative pb-4 border-b border-border/30">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-lg" />
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
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
                        <form onSubmit={menuItemForm.handleSubmit(handleAddMenuItem)} className="relative space-y-6 py-6">
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
                                      <Input placeholder="Enter item name..." {...field} className="h-11 bg-muted/30 border-border/40 focus:border-emerald-500/50 focus:ring-emerald-500/20" />
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
                                        <SelectItem value="veg">
                                          <div className="flex items-center gap-2">
                                            <Leaf className="h-4 w-4 text-green-500" />
                                            Vegetarian
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="non_veg">
                                          <div className="flex items-center gap-2">
                                            <Circle className="h-4 w-4 text-red-500 fill-current" />
                                            Non-Vegetarian
                                          </div>
                                        </SelectItem>
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
                                    className="resize-none bg-muted/30 border-border/40 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Category & Status */}
                          <div className="space-y-4 pt-2">
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
                                      {isLoadingCategories ? (
                                        <Skeleton className="h-11 w-full rounded-lg" />
                                      ) : (
                                        <Combobox
                                          options={categoryOptions}
                                          value={field.value}
                                          onValueChange={field.onChange}
                                          placeholder="Select category..."
                                          searchPlaceholder="Search categories..."
                                          emptyMessage="No categories found."
                                        />
                                      )}
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={menuItemForm.control}
                                name="is_active"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
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
                          <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">3</span>
                              Pricing & Charges
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
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
                                        className="h-11 bg-muted/30 border-border/40 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={menuItemForm.control}
                                name="tax_rate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium text-muted-foreground">Tax Rate (%)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        {...field}
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        className="h-11 bg-muted/30 border-border/40 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={menuItemForm.control}
                                name="service_charge"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium text-muted-foreground">Service Charge ($)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        {...field}
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        className="h-11 bg-muted/30 border-border/40 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>

                          {/* Image URL */}
                          <FormField
                            control={menuItemForm.control}
                            name="image_url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">Image URL</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter image URL..." 
                                    {...field} 
                                    className="h-11 bg-muted/30 border-border/40 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </form>
                      </Form>
                      <DialogFooter className="relative pt-4 border-t border-border/30 gap-3">
                        <Button 
                          variant="ghost" 
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setMenuItemDialogOpen(false)
                            menuItemForm.reset()
                            setCurrentItemIndex(undefined)
                          }}
                          disabled={isSavingMenuItem}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={menuItemForm.handleSubmit(handleAddMenuItem)} 
                          disabled={isSavingMenuItem}
                          className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/25 text-white px-6"
                        >
                          {isSavingMenuItem ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Create Menu Item
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
          </div> {/* relative container */}
        </div> {/* flex container */}
      </SidebarInset>
    </>
  )
}

export default function POSPage() {
  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <React.Suspense fallback={null}>
          <POSContent />
        </React.Suspense>
      </SidebarProvider>
    </SidebarCategoryProvider>
  )
}


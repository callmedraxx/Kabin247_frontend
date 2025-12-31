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
import { Combobox } from "@/components/ui/combobox"
import {
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  MoreHorizontal,
  Search,
  X,
  Eye,
  Image as ImageIcon,
  UtensilsCrossed,
  Leaf,
  Circle,
  Package,
  DollarSign,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import * as XLSX from "xlsx"
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"
import { apiCall, apiCallJson } from "@/lib/api-client"

// Menu item data structure matching API response
interface MenuItemVariant {
  id?: number
  menu_item_id?: number
  portion_size: string
  price: number // Base/default price
  sort_order?: number
  caterer_prices?: Array<{
    caterer_id: number
    price: number
  }>
}

interface MenuItem {
  id: number
  item_name: string
  item_description: string | null
  food_type: "veg" | "non_veg"
  category: string
  image_url: string | null
  variants: MenuItemVariant[]
  tax_rate: number | null
  service_charge: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Category {
  id: number
  name: string
  slug: string
  is_active: boolean
}

interface Caterer {
  id: number
  caterer_name: string
  caterer_number: string
  caterer_email: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
}

interface CaterersResponse {
  caterers: Caterer[]
  total: number
}

// API Response types
interface MenuItemsResponse {
  menu_items: MenuItem[]
  total: number
  page?: number
  limit: number
}

interface CategoriesResponse {
  categories: Category[]
  total: number
}

// Variant schema with caterer prices
const variantSchema = z.object({
  portion_size: z.string().min(1, "Portion size is required"),
  price: z.number().positive("Price must be greater than 0"),
  caterer_prices: z.array(z.object({
    caterer_id: z.number().int().positive(),
    price: z.number().positive("Price must be greater than 0"),
  })).optional(),
})

// Form schema for menu items
const menuItemSchema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  item_description: z.string().optional(),
  food_type: z.enum(["veg", "non_veg"]),
  category: z.string().optional(),
  image_url: z.string().optional(),
  price: z.number().positive("Price must be greater than 0").optional(), // Legacy support
  variants: z.array(variantSchema).optional(), // New: variants with caterer prices
  tax_rate: z.number().min(0).max(100).optional(),
  service_charge: z.number().min(0).optional(),
  is_active: z.boolean(),
})

type MenuItemFormValues = z.infer<typeof menuItemSchema>

function MenuItemsContent() {
  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([])
  const [selectedItems, setSelectedItems] = React.useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [foodTypeFilter, setFoodTypeFilter] = React.useState<"all" | "veg" | "non_veg">("all")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Pagination state
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(50)
  const [total, setTotal] = React.useState(0)
  const [sortBy, setSortBy] = React.useState<string>("created_at")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")
  const [isActiveFilter, setIsActiveFilter] = React.useState<boolean | "all">("all")
  
  // Categories for dropdown
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(false)
  
  // Caterers for price management
  const [caterers, setCaterers] = React.useState<Caterer[]>([])
  const [isLoadingCaterers, setIsLoadingCaterers] = React.useState(false)
  
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<MenuItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [itemToDelete, setItemToDelete] = React.useState<MenuItem | null>(null)
  const [viewDrawerOpen, setViewDrawerOpen] = React.useState(false)
  const [viewingItem, setViewingItem] = React.useState<MenuItem | null>(null)
  const [importDialogOpen, setImportDialogOpen] = React.useState(false)
  const [importPreview, setImportPreview] = React.useState<(Partial<MenuItem> & { price?: number })[]>([])
  const [importErrors, setImportErrors] = React.useState<string[]>([])
  const [isImporting, setIsImporting] = React.useState(false)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const imageInputRef = React.useRef<HTMLInputElement>(null)

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema) as any,
    defaultValues: {
      item_name: "",
      item_description: "",
      food_type: "veg",
      category: "",
      image_url: "",
      price: undefined,
      variants: [],
      tax_rate: undefined,
      service_charge: undefined,
      is_active: true,
    },
  })

  // Field array for variants
  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: "variants",
  })


  // Fetch caterers for price management
  const fetchCaterers = React.useCallback(async () => {
    setIsLoadingCaterers(true)
    try {
      const data: CaterersResponse = await apiCallJson<CaterersResponse>(`/caterers?limit=1000`)
      setCaterers(data.caterers || [])
    } catch (err) {
      console.warn("Error fetching caterers:", err)
    } finally {
      setIsLoadingCaterers(false)
    }
  }, [])

  // Fetch categories for dropdown
  const fetchCategories = React.useCallback(async () => {
    setIsLoadingCategories(true)
    try {
      const data: CategoriesResponse = await apiCallJson<CategoriesResponse>(`/categories?is_active=true&limit=1000`)
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

  React.useEffect(() => {
    fetchCategories()
    fetchCaterers()
  }, [fetchCategories, fetchCaterers])

  // Prepare category options for combobox
  const categoryOptions = React.useMemo(() => {
    return categories.map((cat) => ({
      value: cat.slug,
      label: cat.name,
    }))
  }, [categories])

  // Fetch menu items from API
  const fetchMenuItems = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim())
      }
      if (categoryFilter !== "all") {
        params.append("category", categoryFilter)
      }
      if (foodTypeFilter !== "all") {
        params.append("food_type", foodTypeFilter)
      }
      if (isActiveFilter !== "all") {
        params.append("is_active", isActiveFilter.toString())
      }
      params.append("sortBy", sortBy)
      params.append("sortOrder", sortOrder)
      params.append("page", page.toString())
      params.append("limit", limit.toString())

      const data: MenuItemsResponse = await apiCallJson<MenuItemsResponse>(`/menu-items?${params.toString()}`)
      setMenuItems(data.menu_items || [])
      setTotal(data.total || 0)
    } catch (err) {
      // Handle network errors gracefully - these are expected in some scenarios (offline, CORS, etc.)
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        // Network error - log as warn instead of error since it's not necessarily a problem
        // This can happen if backend is not running, CORS issues, or network problems
        console.warn(`Network error fetching menu items from ${API_BASE_URL}/menu-items - this may be expected if backend is not running`)
        // Don't set error state for network errors - just show empty state
        setMenuItems([])
        setTotal(0)
      } else {
        // Other unexpected errors
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch menu items"
        setError(errorMessage)
        console.error("Unexpected error fetching menu items:", err)
        toast.error("Error loading menu items", {
          description: errorMessage,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, categoryFilter, foodTypeFilter, isActiveFilter, sortBy, sortOrder, page, limit])

  // Fetch menu items on mount and when dependencies change
  React.useEffect(() => {
    fetchMenuItems()
  }, [fetchMenuItems])

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to first page on search
      fetchMenuItems()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const allSelected = menuItems.length > 0 && selectedItems.size === menuItems.length
  const someSelected = selectedItems.size > 0 && selectedItems.size < menuItems.length
  const totalPages = Math.ceil(total / limit)

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(menuItems.map((i) => i.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  // Handle individual selection
  const handleSelect = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedItems(newSelected)
  }

  // Handle add
  const handleAdd = () => {
    setEditingItem(null)
    setImagePreview(null)
    form.reset({
      item_name: "",
      item_description: "",
      food_type: "veg",
      category: "",
      image_url: "",
      price: undefined,
      variants: [],
      tax_rate: undefined,
      service_charge: undefined,
      is_active: true,
    })
    setDrawerOpen(true)
  }

  // Handle edit
  const handleEdit = async (item: MenuItem) => {
    try {
      const response = await fetch(`${API_BASE_URL}/menu-items/${item.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch menu item details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const fullItem: MenuItem = await response.json()
      setEditingItem(fullItem)
      setImagePreview(fullItem.image_url || null)
      
      // Extract price from first variant if variants exist, otherwise use undefined (for backward compatibility)
      const price = fullItem.variants && fullItem.variants.length > 0 
        ? fullItem.variants[0].price 
        : undefined

      // Map variants to form format, including caterer_prices
      const variants = fullItem.variants?.map(v => ({
        portion_size: v.portion_size,
        price: v.price,
        caterer_prices: v.caterer_prices || [],
      })) || []

      form.reset({
        item_name: fullItem.item_name,
        item_description: fullItem.item_description || "",
        food_type: fullItem.food_type,
        category: fullItem.category || "",
        image_url: fullItem.image_url || "",
        price: price, // Legacy support
        variants: variants, // New: variants with caterer prices
        tax_rate: fullItem.tax_rate || undefined,
        service_charge: fullItem.service_charge || undefined,
        is_active: fullItem.is_active,
      })
      setDrawerOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch menu item details"
      toast.error("Error loading menu item", {
        description: errorMessage,
      })
    }
  }

  // Handle save
  const handleSave = async (values: MenuItemFormValues) => {
    try {
      const url = editingItem
        ? `${API_BASE_URL}/menu-items/${editingItem.id}`
        : `${API_BASE_URL}/menu-items`

      const method = editingItem ? "PUT" : "POST"

      const body: any = {
        item_name: values.item_name,
        food_type: values.food_type,
        is_active: values.is_active,
      }

      if (values.category && values.category.trim()) {
        body.category = values.category
      }
      // Send variants if provided, otherwise fall back to legacy price field
      if (values.variants && values.variants.length > 0) {
        body.variants = values.variants.map(v => ({
          portion_size: v.portion_size,
          price: v.price,
          caterer_prices: v.caterer_prices || [],
        }))
      } else if (values.price !== undefined) {
        // Legacy support: if no variants, use single price
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

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save menu item" }))
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`
        
        toast.error("Error saving menu item", {
          description: errorMessage,
        })
        throw new Error(errorMessage)
      }

      const data: MenuItem = await response.json()
      
      toast.success(editingItem ? "Menu item updated" : "Menu item created", {
        description: `${data.item_name} has been ${editingItem ? "updated" : "created"} successfully.`,
      })

      setDrawerOpen(false)
      setEditingItem(null)
      setImagePreview(null)
      form.reset()
      fetchMenuItems()
    } catch (err) {
      // Error already handled in toast above
      console.error("Error saving menu item:", err)
    }
  }

  // Handle view
  const handleView = async (item: MenuItem) => {
    try {
      const response = await fetch(`${API_BASE_URL}/menu-items/${item.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch menu item details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: MenuItem = await response.json()
      setViewingItem(data)
      setViewDrawerOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch menu item details"
      toast.error("Error loading menu item details", {
        description: errorMessage,
      })
    }
  }

  // Handle delete
  const handleDelete = (item: MenuItem) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/menu-items/${itemToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete menu item" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast.success("Menu item deleted", {
        description: `${itemToDelete.item_name} has been deleted successfully.`,
      })

      setDeleteDialogOpen(false)
      setItemToDelete(null)
      setSelectedItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(itemToDelete.id)
        return newSet
      })
      fetchMenuItems()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete menu item"
      toast.error("Error deleting menu item", {
        description: errorMessage,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/menu-items`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: Array.from(selectedItems),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete menu items" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      toast.success("Menu items deleted", {
        description: `${data.deleted || selectedItems.size} menu item(s) have been deleted successfully.`,
      })

      setSelectedItems(new Set())
      fetchMenuItems()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete menu items"
      toast.error("Error deleting menu items", {
        description: errorMessage,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: "Please select an image file.",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Image size must be less than 5MB.",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setImagePreview(result)
      form.setValue("image_url", result)
    }
    reader.readAsDataURL(file)
  }

  // Export to CSV
  const handleExport = () => {
    const headers = [
      "Item Name",
      "Description",
      "Food Type",
      "Category",
      "Price",
      "Tax Rate (%)",
      "Service Charge",
      "Status",
    ]
    const rows = menuItems.map((item) => [
      item.item_name,
      item.item_description || "",
      item.food_type === "veg" ? "Vegetarian" : "Non-Vegetarian",
      categories.find((c) => c.slug === item.category)?.name || item.category,
      item.variants && item.variants.length > 0 ? `$${Number(item.variants[0].price).toFixed(2)}` : "",
      item.tax_rate?.toString() || "0",
      item.service_charge?.toString() || "0",
      item.is_active ? "Active" : "Inactive",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `menu_items_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle file import
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) return

        const workbook = XLSX.read(data, { type: "binary" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        const headers = jsonData[0] || []
        const rows = jsonData.slice(1)

        const parsedItems: (Partial<MenuItem> & { price?: number })[] = []
        const errors: string[] = []

        rows.forEach((row, rowIndex) => {
          if (!row || row.every((cell) => !cell || String(cell).trim() === "")) {
            return
          }

          const itemName = row[0]?.toString().trim() || ""
          if (!itemName) {
            errors.push(`Row ${rowIndex + 2}: Missing required field (Item Name)`)
            return
          }

          const priceStr = row[4]?.toString().trim() || ""
          const price = priceStr ? parseFloat(priceStr.replace("$", "").trim()) : undefined

          const item: Partial<MenuItem> & { price?: number } = {
            id: `import_${Date.now()}_${rowIndex}` as any,
            item_name: itemName,
            item_description: row[1]?.toString().trim() || null,
            food_type: row[2]?.toString().toLowerCase().includes("non") ? "non_veg" : "veg",
            category: row[3]?.toString().trim() || "main_course",
            price: price,
            tax_rate: row[5]?.toString().trim() ? parseFloat(row[5].toString().trim()) : null,
            service_charge: row[6]?.toString().trim() ? parseFloat(row[6].toString().trim()) : null,
            is_active: row[7]?.toString().toLowerCase() !== "inactive",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            variants: [],
            image_url: null,
          }

          parsedItems.push(item)
        })

        setImportPreview(parsedItems)
        setImportErrors(errors)
        setImportDialogOpen(true)
      } catch (error) {
        console.error("Error parsing Excel file:", error)
        alert("Error parsing Excel file. Please ensure it's a valid Excel file.")
      }
    }

    reader.readAsBinaryString(file)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle import confirmation
  const handleImportConfirm = React.useCallback(async () => {
    if (importPreview.length === 0) return

    setIsImporting(true)
    const errors: string[] = []
    let successCount = 0

    for (const item of importPreview) {
      try {
        const body: any = {
          item_name: item.item_name || "",
          food_type: item.food_type || "veg",
          category: item.category || "",
          is_active: item.is_active !== undefined ? item.is_active : true,
        }
        
        if ((item as any).price !== undefined) {
          body.price = typeof (item as any).price === "number" ? (item as any).price : parseFloat((item as any).price || "0")
        }

        if (item.item_description) {
          body.item_description = item.item_description
        }
        if (item.image_url) {
          body.image_url = item.image_url
        }
        if (item.tax_rate !== undefined) {
          body.tax_rate = typeof item.tax_rate === "number" ? item.tax_rate : parseFloat(item.tax_rate || "0")
        }
        if (item.service_charge !== undefined) {
          body.service_charge = typeof item.service_charge === "number" ? item.service_charge : parseFloat(item.service_charge || "0")
        }

        const response = await fetch(`${API_BASE_URL}/menu-items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Failed to import menu item" }))
          errors.push(`${item.item_name || "Unknown"}: ${errorData.error || `HTTP error! status: ${response.status}`}`)
        } else {
          successCount++
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to import menu item"
        errors.push(`${item.item_name || "Unknown"}: ${errorMessage}`)
      }
    }

    if (errors.length > 0) {
      setImportErrors(errors)
      toast.error("Import completed with errors", {
        description: `${successCount} item(s) imported successfully, ${errors.length} error(s) occurred.`,
      })
    } else {
      toast.success("Import completed", {
        description: `${successCount} menu item(s) imported successfully.`,
      })
      setImportDialogOpen(false)
      setImportPreview([])
      setImportErrors([])
      fetchMenuItems()
    }

    setIsImporting(false)
  }, [importPreview, fetchMenuItems])

  // Handle import cancel
  const handleImportCancel = () => {
    setImportDialogOpen(false)
    setImportPreview([])
    setImportErrors([])
  }

  // Get food type badge
  const getFoodTypeBadge = (foodType: "veg" | "non_veg") => {
    return foodType === "veg" ? (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/20" variant="outline">
        <Leaf className="h-3 w-3 mr-1" />
        Vegetarian
      </Badge>
    ) : (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20" variant="outline">
        <Circle className="h-3 w-3 mr-1 fill-current" />
        Non-Vegetarian
      </Badge>
    )
  }


  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <HeaderNav title="Menu Items" />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
            {/* Header Card */}
            <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Menu Items Management
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Manage menu items, variants, categories, and pricing
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedItems.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="gap-2 shadow-md hover:shadow-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Selected ({selectedItems.size})
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-import"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      <Download className="h-4 w-4" />
                      Import
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      className="gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      <Upload className="h-4 w-4" />
                      Export
                    </Button>
                    <Button
                      onClick={handleAdd}
                      className="gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Create Item
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
                      placeholder="Search items by name, description, or category..."
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
                  {/* Category Filter */}
                  {isLoadingCategories ? (
                    <Skeleton className="w-full md:w-[180px] h-10" />
                  ) : (
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full md:w-[180px] h-10">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {/* Food Type Filter */}
                  <Select value={foodTypeFilter} onValueChange={(value) => setFoodTypeFilter(value as "all" | "veg" | "non_veg")}>
                    <SelectTrigger className="w-full md:w-[150px] h-10">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="veg">Vegetarian</SelectItem>
                      <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

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
                          <div className="flex items-center gap-2">
                            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                            Item Name
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Leaf className="h-4 w-4 text-muted-foreground" />
                            Food Type
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">Category</TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            Price
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            Tax & Charges
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
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
                              <Skeleton className="h-4 w-[200px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[150px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[100px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[120px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[150px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[100px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[80px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[40px]" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : menuItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <UtensilsCrossed className="h-8 w-8 opacity-50" />
                              <p className="text-sm font-medium">No menu items found</p>
                              <p className="text-xs">
                                {searchQuery || categoryFilter !== "all" || foodTypeFilter !== "all"
                                  ? "Try adjusting your search or filters"
                                  : "Get started by creating your first menu item"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        menuItems.map((item) => (
                          <TableRow
                            key={item.id}
                            className="group hover:bg-muted/30 transition-colors border-b border-border/30"
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={(checked) =>
                                  handleSelect(item.id, checked as boolean)
                                }
                                aria-label={`Select ${item.item_name}`}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px]">
                              <div className="flex items-center gap-2">
                                {item.image_url && (
                                  <img
                                    src={item.image_url}
                                    alt={item.item_name}
                                    className="h-8 w-8 rounded object-cover"
                                  />
                                )}
                                <div className="truncate" title={item.item_name}>
                                  {item.item_name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[150px]">
                              <div className="truncate text-sm text-muted-foreground" title={item.item_description || undefined}>
                                {item.item_description || "—"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getFoodTypeBadge(item.food_type)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {categories.find((c) => c.slug === item.category)?.name || item.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {item.variants && item.variants.length > 0 ? (
                                <span className="text-sm font-medium">${Number(item.variants[0].price).toFixed(2)}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[120px]">
                              <div className="flex flex-col gap-1 text-xs">
                                {typeof item.tax_rate === "number" && (
                                  <div>
                                    <span className="text-muted-foreground">Tax:</span> {item.tax_rate}%
                                  </div>
                                )}
                                {typeof item.service_charge === "number" && (
                                  <div>
                                    <span className="text-muted-foreground">Service:</span> ${item.service_charge.toFixed(2)}
                                  </div>
                                )}
                                {typeof item.tax_rate !== "number" && typeof item.service_charge !== "number" && "—"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={item.is_active ? "default" : "secondary"}
                                className={item.is_active ? "" : "opacity-50"}
                              >
                                {item.is_active ? "Active" : "Inactive"}
                              </Badge>
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
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleView(item)}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(item)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(item)}
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
                      Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} menu items
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

            {/* Create/Edit Drawer */}
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerContent>
                <div className="flex flex-col h-full">
                  <DrawerHeader className="flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-lg" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
                          <UtensilsCrossed className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <DrawerTitle>
                          {editingItem ? "Edit Menu Item" : "Create New Menu Item"}
                        </DrawerTitle>
                        <DrawerDescription>
                          {editingItem
                            ? "Update the menu item information below"
                            : "Fill in the details to create a new menu item"}
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                    <Form {...form}>
                      <form id="menu-item-form" className="space-y-6 py-6">
                        {/* Image Upload */}
                        <div className="space-y-2">
                          <Label>Item Image</Label>
                          <div className="flex items-center gap-4">
                            {imagePreview ? (
                              <div className="relative">
                                <img
                                  src={imagePreview}
                                  alt="Preview"
                                  className="h-32 w-32 object-cover rounded-lg border"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                  onClick={() => {
                                    setImagePreview(null)
                                    form.setValue("image_url", "")
                                    if (imageInputRef.current) {
                                      imageInputRef.current.value = ""
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="h-32 w-32 border-2 border-dashed rounded-lg flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                                id="image-upload"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => imageInputRef.current?.click()}
                                className="gap-2"
                              >
                                <ImageIcon className="h-4 w-4" />
                                {imagePreview ? "Change Image" : "Upload Image"}
                              </Button>
                              <p className="text-xs text-muted-foreground mt-1">
                                Max size: 5MB. Supported formats: JPG, PNG, GIF
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Basic Information */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="item_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Item Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter item name..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="food_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Food Type *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select food type..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="veg">
                                      <div className="flex items-center gap-2">
                                        <Leaf className="h-4 w-4 text-green-600" />
                                        Vegetarian
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="non_veg">
                                      <div className="flex items-center gap-2">
                                        <Circle className="h-4 w-4 text-red-600 fill-current" />
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

                        <FormField
                          control={form.control}
                          name="item_description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter item description..."
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <FormControl>
                                  {isLoadingCategories ? (
                                    <Skeleton className="h-10 w-full" />
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
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Active Status</FormLabel>
                                  <div className="text-sm text-muted-foreground">
                                    Item will be visible in menu
                                  </div>
                                </div>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Variants with Caterer Prices */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Variants & Prices</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => appendVariant({ portion_size: "", price: 0, caterer_prices: [] })}
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add Variant
                            </Button>
                          </div>
                          
                          {variantFields.length === 0 && (
                            <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                              No variants added. Click "Add Variant" to add portion sizes with prices.
                            </div>
                          )}

                          {variantFields.map((field, index) => (
                            <Card key={field.id} className="p-4 space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 grid gap-4 md:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name={`variants.${index}.portion_size`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Portion Size *</FormLabel>
                                        <FormControl>
                                          <Input placeholder="e.g., Small, Medium, Large" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`variants.${index}.price`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Base Price ($) *</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            {...field}
                                            value={field.value || ""}
                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeVariant(index)}
                                  className="ml-2 text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              {/* Caterer Prices Section */}
                              <div className="space-y-3 pt-3 border-t">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium">Caterer-Specific Prices (Optional)</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const currentCatererPrices = form.getValues(`variants.${index}.caterer_prices`) || []
                                      form.setValue(`variants.${index}.caterer_prices`, [
                                        ...currentCatererPrices,
                                        { caterer_id: 0, price: 0 }
                                      ])
                                    }}
                                    className="gap-1 h-7 text-xs"
                                    disabled={isLoadingCaterers || caterers.length === 0}
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add Caterer Price
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Set custom prices for specific caterers. If not set, base price will be used.
                                </p>
                                
                                {form.watch(`variants.${index}.caterer_prices`)?.map((cp: any, cpIndex: number) => (
                                  <div key={cpIndex} className="flex gap-2 items-end p-2 border rounded-lg bg-muted/30">
                                    <FormField
                                      control={form.control}
                                      name={`variants.${index}.caterer_prices.${cpIndex}.caterer_id`}
                                      render={({ field }) => (
                                        <FormItem className="flex-1">
                                          <FormLabel className="text-xs">Caterer</FormLabel>
                                          <Select
                                            onValueChange={(value) => field.onChange(parseInt(value))}
                                            value={field.value?.toString() || ""}
                                          >
                                            <FormControl>
                                              <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select caterer..." />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {caterers.map((caterer) => (
                                                <SelectItem key={caterer.id} value={caterer.id.toString()}>
                                                  {caterer.caterer_name}
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
                                      name={`variants.${index}.caterer_prices.${cpIndex}.price`}
                                      render={({ field }) => (
                                        <FormItem className="w-32">
                                          <FormLabel className="text-xs">Price ($)</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              placeholder="0.00"
                                              className="h-9"
                                              {...field}
                                              value={field.value || ""}
                                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const currentCatererPrices = form.getValues(`variants.${index}.caterer_prices`) || []
                                        const updated = currentCatererPrices.filter((_: any, i: number) => i !== cpIndex)
                                        form.setValue(`variants.${index}.caterer_prices`, updated)
                                      }}
                                      className="h-9 w-9 p-0 text-destructive"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                
                                {(!form.watch(`variants.${index}.caterer_prices`) || form.watch(`variants.${index}.caterer_prices`)?.length === 0) && (
                                  <p className="text-xs text-muted-foreground italic">
                                    No caterer-specific prices set. Base price will be used for all caterers.
                                  </p>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>

                        {/* Legacy Price Field (for backward compatibility) */}
                        {variantFields.length === 0 && (
                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price (Legacy)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  />
                                </FormControl>
                                <FormMessage />
                                <p className="text-xs text-muted-foreground">
                                  Note: Use variants above for better price management with caterer-specific pricing.
                                </p>
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Tax and Charges */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="tax_rate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tax Rate (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                                <FormLabel>Service Charge ($)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </form>
                    </Form>
                  </div>
                  <DrawerFooter className="border-t border-border/50 pt-4 flex-shrink-0 bg-background sticky bottom-0">
                    <div className="flex gap-2 w-full">
                      <DrawerClose asChild>
                        <Button variant="outline" className="flex-1">
                          Cancel
                        </Button>
                      </DrawerClose>
                      <Button
                        onClick={form.handleSubmit(handleSave)}
                        className="flex-1 gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {editingItem ? "Update Item" : "Create Item"}
                      </Button>
                    </div>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>

            {/* View Details Drawer */}
            <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
              <DrawerContent>
                <div className="flex flex-col h-full">
                  <DrawerHeader className="flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-lg" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
                          <UtensilsCrossed className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <DrawerTitle>
                          {viewingItem?.item_name}
                        </DrawerTitle>
                        <DrawerDescription>
                          Complete menu item information
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  {viewingItem && (
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                      <div className="space-y-4">
                        {/* Item Image */}
                        {viewingItem.image_url && (
                          <div>
                            <img
                              src={viewingItem.image_url}
                              alt={viewingItem.item_name}
                              className="h-48 w-full object-cover rounded-lg border"
                            />
                          </div>
                        )}

                        {/* Basic Information */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Item Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Food Type
                                </Label>
                                {getFoodTypeBadge(viewingItem.food_type)}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Category
                                </Label>
                                <Badge variant="outline">
                                  {categories.find((c) => c.slug === viewingItem.category)?.name || viewingItem.category}
                                </Badge>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Status
                                </Label>
                                <Badge variant={viewingItem.is_active ? "default" : "secondary"}>
                                  {viewingItem.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </div>
                            {viewingItem.item_description && (
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Description
                                </Label>
                                <p className="text-sm font-medium break-words">
                                  {viewingItem.item_description}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Price */}
                        {viewingItem.variants && viewingItem.variants.length > 0 && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">Price</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-semibold">
                                ${Number(viewingItem.variants[0].price).toFixed(2)}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Tax and Charges */}
                        {(typeof viewingItem.tax_rate === "number" || typeof viewingItem.service_charge === "number") && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">Tax & Charges</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {typeof viewingItem.tax_rate === "number" && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Tax Rate</span>
                                  <span className="text-sm font-medium">{viewingItem.tax_rate}%</span>
                                </div>
                              )}
                              {typeof viewingItem.service_charge === "number" && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Service Charge</span>
                                  <span className="text-sm font-medium">${viewingItem.service_charge.toFixed(2)}</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  )}
                  <DrawerFooter className="border-t border-border/50 pt-4 flex-shrink-0 bg-background sticky bottom-0">
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (viewingItem) {
                            handleEdit(viewingItem)
                            setViewDrawerOpen(false)
                          }
                        }}
                        className="flex-1 gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <DrawerClose asChild>
                        <Button className="flex-1">Close</Button>
                      </DrawerClose>
                    </div>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>

            {/* Import Preview Dialog */}
            <Dialog open={importDialogOpen} onOpenChange={handleImportCancel}>
              <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                    Import Preview
                  </DialogTitle>
                  <DialogDescription>
                    Review the menu items to be imported. {importPreview.length} item(s) will be added.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-4">
                  <div className="space-y-4">
                    {importErrors.length > 0 && (
                      <Card className="border-destructive/50 bg-destructive/10">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-destructive flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Import Errors ({importErrors.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                            {importErrors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    {importPreview.length > 0 && (
                      <Card className="border-border/50">
                        <CardHeader>
                          <CardTitle className="text-lg">Preview ({importPreview.length} items)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto scrollbar-hide">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Item Name</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Food Type</TableHead>
                                  <TableHead>Category</TableHead>
                                  <TableHead>Price</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importPreview.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{item.item_name}</TableCell>
                                    <TableCell>{item.item_description || "—"}</TableCell>
                                    <TableCell>
                                      {item.food_type === "veg" ? "Vegetarian" : "Non-Vegetarian"}
                                    </TableCell>
                                    <TableCell>
                                      {categories.find((c) => c.slug === item.category)?.name || item.category}
                                    </TableCell>
                                    <TableCell>
                                      {item.variants && item.variants.length > 0 
                                        ? `$${Number(item.variants[0].price).toFixed(2)}` 
                                        : (item as any).price !== undefined 
                                          ? `$${Number((item as any).price).toFixed(2)}` 
                                          : "—"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
                <DialogFooter className="px-6 py-4 border-t border-border/50 flex-shrink-0 bg-background">
                  <Button
                    variant="outline"
                    onClick={handleImportCancel}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImportConfirm}
                    disabled={importPreview.length === 0 || isImporting}
                    className="gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Import {importPreview.length} Item(s)
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Delete Menu Item
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-foreground">
                      {itemToDelete?.item_name}
                    </span>
                    ? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false)
                      setItemToDelete(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={confirmDelete} className="gap-2">
                    <Trash2 className="h-4 w-4" />
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

export default function MenuItemsPage() {
  return <MenuItemsContent />
}


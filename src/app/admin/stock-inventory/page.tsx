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
  Package,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Warehouse,
  FileSpreadsheet,
} from "lucide-react"
import * as XLSX from "xlsx"
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
import { ChevronLeft, ChevronRight, ArrowUpDown, Loader2, AlertCircle } from "lucide-react"
import { API_BASE_URL } from "@/lib/api-config"

// Inventory item data structure matching API response
interface InventoryItem {
  id: string
  item_name: string
  category: string
  current_stock: number
  min_stock_level: number
  max_stock_level: number
  unit: string
  unit_price: number | null
  supplier: string | null
  location: string | null
  notes: string | null
  status: "in_stock" | "low_stock" | "out_of_stock"
  last_updated: string
  created_at: string
  updated_at: string
}

// API Response types
interface InventoryResponse {
  inventory_items: InventoryItem[]
  total: number
  page?: number
  limit: number
}

// Form schema
const inventorySchema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  category: z.string().min(1, "Category is required"),
  current_stock: z.number().min(0, "Current stock must be >= 0"),
  min_stock_level: z.number().min(0, "Min stock level must be >= 0"),
  max_stock_level: z.number().min(0, "Max stock level must be >= 0"),
  unit: z.string().min(1, "Unit is required"),
  unit_price: z.number().min(0).optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

type InventoryFormValues = z.infer<typeof inventorySchema>

// Categories
const categories = [
  { value: "ingredients", label: "Ingredients" },
  { value: "beverages", label: "Beverages" },
  { value: "packaging", label: "Packaging" },
  { value: "utensils", label: "Utensils" },
  { value: "cleaning", label: "Cleaning Supplies" },
  { value: "other", label: "Other" },
]

// Units
const units = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "l", label: "Liter (l)" },
  { value: "ml", label: "Milliliter (ml)" },
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
]

function StockInventoryContent() {
  const [inventory, setInventory] = React.useState<InventoryItem[]>([])
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Pagination state
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(50)
  const [total, setTotal] = React.useState(0)
  const [sortBy, setSortBy] = React.useState<string>("last_updated")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")
  
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [itemToDelete, setItemToDelete] = React.useState<InventoryItem | null>(null)
  const [viewDrawerOpen, setViewDrawerOpen] = React.useState(false)
  const [viewingItem, setViewingItem] = React.useState<InventoryItem | null>(null)
  const [importDialogOpen, setImportDialogOpen] = React.useState(false)
  const [importPreview, setImportPreview] = React.useState<Partial<InventoryItem>[]>([])
  const [importErrors, setImportErrors] = React.useState<string[]>([])
  const [isImporting, setIsImporting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      item_name: "",
      category: "",
      current_stock: 0,
      min_stock_level: 0,
      max_stock_level: 0,
      unit: "",
      unit_price: undefined,
      supplier: "",
      location: "",
      notes: "",
    },
  })

  // Fetch inventory items from API
  const fetchInventory = React.useCallback(async () => {
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
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      params.append("sortBy", sortBy)
      params.append("sortOrder", sortOrder)
      params.append("page", page.toString())
      params.append("limit", limit.toString())

      const response = await fetch(`${API_BASE_URL}/inventory?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch inventory items" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: InventoryResponse = await response.json()
      setInventory(data.inventory_items)
      setTotal(data.total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch inventory items"
      setError(errorMessage)
      toast.error("Error loading inventory", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, categoryFilter, statusFilter, sortBy, sortOrder, page, limit])

  // Fetch inventory on mount and when dependencies change
  React.useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to first page on search
      fetchInventory()
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

  const allSelected = inventory.length > 0 && selectedItems.size === inventory.length
  const someSelected = selectedItems.size > 0 && selectedItems.size < inventory.length
  const totalPages = Math.ceil(total / limit)

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(inventory.map((i) => i.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  // Handle individual selection
  const handleSelect = (id: string, checked: boolean) => {
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
    form.reset({
      item_name: "",
      category: "",
      current_stock: 0,
      min_stock_level: 0,
      max_stock_level: 0,
      unit: "",
      unit_price: undefined,
      supplier: "",
      location: "",
      notes: "",
    })
    setDrawerOpen(true)
  }

  // Handle edit
  const handleEdit = async (item: InventoryItem) => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/${item.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch inventory item details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const fullItem: InventoryItem = await response.json()
      setEditingItem(fullItem)
      
      form.reset({
        item_name: fullItem.item_name,
        category: fullItem.category,
        current_stock: fullItem.current_stock,
        min_stock_level: fullItem.min_stock_level,
        max_stock_level: fullItem.max_stock_level,
        unit: fullItem.unit,
        unit_price: fullItem.unit_price || undefined,
        supplier: fullItem.supplier || "",
        location: fullItem.location || "",
        notes: fullItem.notes || "",
      })
      setDrawerOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch inventory item details"
      toast.error("Error loading inventory item", {
        description: errorMessage,
      })
    }
  }

  // Handle save
  const handleSave = async (values: InventoryFormValues) => {
    try {
      const url = editingItem
        ? `${API_BASE_URL}/inventory/${editingItem.id}`
        : `${API_BASE_URL}/inventory`

      const method = editingItem ? "PUT" : "POST"

      const body: any = {
        item_name: values.item_name,
        category: values.category,
        current_stock: values.current_stock,
        min_stock_level: values.min_stock_level,
        max_stock_level: values.max_stock_level,
        unit: values.unit,
      }

      if (values.unit_price !== undefined) {
        body.unit_price = values.unit_price
      }
      if (values.supplier) {
        body.supplier = values.supplier
      }
      if (values.location) {
        body.location = values.location
      }
      if (values.notes) {
        body.notes = values.notes
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save inventory item" }))
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`
        
        toast.error("Error saving inventory item", {
          description: errorMessage,
        })
        throw new Error(errorMessage)
      }

      const data: InventoryItem = await response.json()
      
      toast.success(editingItem ? "Inventory item updated" : "Inventory item created", {
        description: `${data.item_name} has been ${editingItem ? "updated" : "created"} successfully.`,
      })

      setDrawerOpen(false)
      setEditingItem(null)
      form.reset()
      fetchInventory()
    } catch (err) {
      // Error already handled in toast above
      console.error("Error saving inventory item:", err)
    }
  }

  // Handle view
  const handleView = async (item: InventoryItem) => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/${item.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch inventory item details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: InventoryItem = await response.json()
      setViewingItem(data)
      setViewDrawerOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch inventory item details"
      toast.error("Error loading inventory item details", {
        description: errorMessage,
      })
    }
  }

  // Handle delete
  const handleDelete = (item: InventoryItem) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/${itemToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete inventory item" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast.success("Inventory item deleted", {
        description: `${itemToDelete.item_name} has been deleted successfully.`,
      })

      setDeleteDialogOpen(false)
      setItemToDelete(null)
      setSelectedItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(itemToDelete.id)
        return newSet
      })
      fetchInventory()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete inventory item"
      toast.error("Error deleting inventory item", {
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
      const response = await fetch(`${API_BASE_URL}/inventory`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: Array.from(selectedItems),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete inventory items" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      toast.success("Inventory items deleted", {
        description: `${data.deleted || selectedItems.size} inventory item(s) have been deleted successfully.`,
      })

      setSelectedItems(new Set())
      fetchInventory()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete inventory items"
      toast.error("Error deleting inventory items", {
        description: errorMessage,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Calculate status based on stock levels
  const calculateStatus = (current: number, min: number): InventoryItem["status"] => {
    if (current === 0) return "out_of_stock"
    if (current <= min) return "low_stock"
    return "in_stock"
  }

  // Get status badge
  const getStatusBadge = (status: InventoryItem["status"], current: number, min: number) => {
    switch (status) {
      case "out_of_stock":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20" variant="outline">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Out of Stock
          </Badge>
        )
      case "low_stock":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20" variant="outline">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Low Stock
          </Badge>
        )
      default:
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20" variant="outline">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            In Stock
          </Badge>
        )
    }
  }

  // Export to CSV
  const handleExport = () => {
    const headers = [
      "Item Name",
      "Category",
      "Current Stock",
      "Min Stock Level",
      "Max Stock Level",
      "Unit",
      "Unit Price",
      "Supplier",
      "Location",
      "Status",
    ]
    const rows = inventory.map((item) => [
      item.item_name,
      categories.find((c) => c.value === item.category)?.label || item.category,
      item.current_stock,
      item.min_stock_level,
      item.max_stock_level,
      units.find((u) => u.value === item.unit)?.label || item.unit,
      item.unit_price?.toString() || "",
      item.supplier || "",
      item.location || "",
      item.status === "in_stock" ? "In Stock" : item.status === "low_stock" ? "Low Stock" : "Out of Stock",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `inventory_${new Date().toISOString().split("T")[0]}.csv`)
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

        const parsedItems: Partial<InventoryItem>[] = []
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

          const currentStock = parseFloat(row[2]?.toString().trim() || "0")
          const minStock = parseFloat(row[3]?.toString().trim() || "0")
          const status = calculateStatus(currentStock, minStock)

          const item: Partial<InventoryItem> = {
            item_name: itemName,
            category: row[1]?.toString().trim() || "other",
            current_stock: currentStock,
            min_stock_level: minStock,
            max_stock_level: parseFloat(row[4]?.toString().trim() || "0"),
            unit: row[5]?.toString().trim() || "pcs",
            unit_price: row[6]?.toString().trim() ? parseFloat(row[6].toString().trim()) : null,
            supplier: row[7]?.toString().trim() || null,
            location: row[8]?.toString().trim() || null,
            status,
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

  // Handle import confirmation - save to backend API
  const handleImportConfirm = React.useCallback(async () => {
    if (importPreview.length === 0) return

    setIsImporting(true)
    
    try {
      const results = await Promise.allSettled(
        importPreview.map((item) =>
          fetch(`${API_BASE_URL}/inventory`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              item_name: item.item_name,
              category: item.category,
              current_stock: item.current_stock,
              min_stock_level: item.min_stock_level,
              max_stock_level: item.max_stock_level,
              unit: item.unit,
              unit_price: item.unit_price || undefined,
              supplier: item.supplier || undefined,
              location: item.location || undefined,
              notes: item.notes || undefined,
            }),
          })
        )
      )

      const succeeded = results.filter((r) => r.status === "fulfilled" && r.value.ok).length
      const failed = results.length - succeeded

      if (succeeded > 0) {
        toast.success(`${succeeded} item(s) imported successfully`)
      }
      if (failed > 0) {
        toast.error(`Failed to import ${failed} item(s)`)
      }

      setImportDialogOpen(false)
      setImportPreview([])
      setImportErrors([])
      fetchInventory()
    } catch (err) {
      toast.error("Error importing items", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setIsImporting(false)
    }
  }, [importPreview, fetchInventory])

  // Handle import cancel
  const handleImportCancel = () => {
    setImportDialogOpen(false)
    setImportPreview([])
    setImportErrors([])
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get stock level indicator
  const getStockLevelIndicator = (current: number, min: number, max: number) => {
    const percentage = ((current - min) / (max - min)) * 100
    if (current === 0) return { color: "bg-red-500", percentage: 0 }
    if (current <= min) return { color: "bg-yellow-500", percentage: Math.max(0, percentage) }
    if (percentage >= 80) return { color: "bg-green-500", percentage: Math.min(100, percentage) }
    return { color: "bg-blue-500", percentage: Math.max(0, Math.min(100, percentage)) }
  }

  // Calculate summary stats
  const stats = React.useMemo(() => {
    const totalItems = total
    const inStock = inventory.filter((i) => i.status === "in_stock").length
    const lowStock = inventory.filter((i) => i.status === "low_stock").length
    const outOfStock = inventory.filter((i) => i.status === "out_of_stock").length
    return { totalItems, inStock, lowStock, outOfStock }
  }, [inventory, total])

  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <HeaderNav title="Stock & Inventory" />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                  <Warehouse className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalItems}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Stock</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.inStock}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
                </CardContent>
              </Card>
            </div>

            {/* Header Card */}
            <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Inventory Management
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Track stock levels, manage inventory, and monitor low stock alerts
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedItems.size > 0 && (
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
                      Add Item
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
                      placeholder="Search items by name, supplier, location..."
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
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[180px] h-10">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                    <SelectTrigger className="w-full md:w-[150px] h-10">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
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
                            <Package className="h-4 w-4 text-muted-foreground" />
                            Item Name
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">Category</TableHead>
                        <TableHead className="font-semibold">Current Stock</TableHead>
                        <TableHead className="font-semibold">Stock Levels</TableHead>
                        <TableHead className="font-semibold">Unit</TableHead>
                        <TableHead className="font-semibold">Unit Price</TableHead>
                        <TableHead className="font-semibold">Supplier</TableHead>
                        <TableHead className="font-semibold">Location</TableHead>
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
                              <Skeleton className="h-4 w-[100px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[100px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[120px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[80px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[80px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[120px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[100px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[100px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[40px]" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : inventory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <Warehouse className="h-8 w-8 opacity-50" />
                              <p className="text-sm font-medium">No inventory items found</p>
                              <p className="text-xs">
                                {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                                  ? "Try adjusting your search or filters"
                                  : "Get started by adding your first inventory item"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        inventory.map((item) => {
                          const stockIndicator = getStockLevelIndicator(item.current_stock, item.min_stock_level, item.max_stock_level)
                          return (
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
                                <div className="truncate" title={item.item_name}>
                                  {item.item_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {categories.find((c) => c.value === item.category)?.label || item.category}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{item.current_stock}</span>
                                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${stockIndicator.color}`}
                                      style={{ width: `${Math.min(100, Math.max(0, stockIndicator.percentage))}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[150px]">
                                <div className="flex flex-col gap-0.5 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Min:</span>{" "}
                                    <span className="font-medium">{item.min_stock_level}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Max:</span>{" "}
                                    <span className="font-medium">{item.max_stock_level}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{units.find((u) => u.value === item.unit)?.label || item.unit}</span>
                              </TableCell>
                              <TableCell>
                                {item.unit_price !== null ? (
                                  <span className="text-sm font-medium">${item.unit_price.toFixed(2)}</span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[150px]">
                                <div className="truncate text-sm" title={item.supplier || undefined}>
                                  {item.supplier || "—"}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[120px]">
                                <div className="truncate text-sm" title={item.location || undefined}>
                                  {item.location || "—"}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(item.status, item.current_stock, item.min_stock_level)}
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
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border/50 px-4 py-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} inventory items
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
            
            {/* Error State */}
            {error && !isLoading && (
              <Card className="border-destructive/50 bg-destructive/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <p className="font-medium">Error loading inventory</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchInventory}
                    className="mt-4"
                  >
                    <Loader2 className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Create/Edit Drawer */}
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerContent>
                <div className="flex flex-col h-full">
                  <DrawerHeader className="flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-orange-500/20 rounded-xl blur-lg" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
                          <Package className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <DrawerTitle>
                          {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
                        </DrawerTitle>
                        <DrawerDescription>
                          {editingItem
                            ? "Update the inventory item information below"
                            : "Fill in the details to add a new inventory item"}
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                    <Form {...form}>
                      <form id="inventory-form" className="space-y-6 py-6">
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
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select category..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {categories.map((cat) => (
                                      <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <FormField
                            control={form.control}
                            name="current_stock"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Stock *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0"
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="min_stock_level"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Min Stock Level *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0"
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="max_stock_level"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Stock Level *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0"
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                            name="unit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select unit..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {units.map((unit) => (
                                      <SelectItem key={unit.value} value={unit.value}>
                                        {unit.label}
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
                            name="unit_price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit Price</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                            name="supplier"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Supplier</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter supplier name..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter storage location..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter any additional notes..."
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                        {editingItem ? "Update Item" : "Add Item"}
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
                        <div className="absolute inset-0 bg-orange-500/20 rounded-xl blur-lg" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
                          <Package className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <DrawerTitle>
                          {viewingItem?.item_name}
                        </DrawerTitle>
                        <DrawerDescription>
                          Complete inventory item information
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  {viewingItem && (
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                      <div className="space-y-4">
                        {/* Item Information */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Item Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Category
                                </Label>
                                <Badge variant="outline">
                                  {categories.find((c) => c.value === viewingItem.category)?.label || viewingItem.category}
                                </Badge>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Status
                                </Label>
                                {getStatusBadge(viewingItem.status, viewingItem.current_stock, viewingItem.min_stock_level)}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Unit
                                </Label>
                                <p className="text-sm font-medium">
                                  {units.find((u) => u.value === viewingItem.unit)?.label || viewingItem.unit}
                                </p>
                              </div>
                              {viewingItem.unit_price && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Unit Price
                                  </Label>
                                  <p className="text-sm font-medium">${viewingItem.unit_price}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Stock Information */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Stock Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <Label className="text-sm font-medium">Current Stock</Label>
                                <span className="text-2xl font-bold">{viewingItem.current_stock}</span>
                              </div>
                              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                                {(() => {
                                  const indicator = getStockLevelIndicator(
                                    viewingItem.current_stock,
                                    viewingItem.min_stock_level,
                                    viewingItem.max_stock_level
                                  )
                                  return (
                                    <div
                                      className={`h-full ${indicator.color}`}
                                      style={{ width: `${Math.min(100, Math.max(0, indicator.percentage))}%` }}
                                    />
                                  )
                                })()}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Min Stock Level
                                </Label>
                                <p className="text-sm font-medium">{viewingItem.min_stock_level}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Max Stock Level
                                </Label>
                                <p className="text-sm font-medium">{viewingItem.max_stock_level}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Additional Information */}
                        {(viewingItem.supplier || viewingItem.location || viewingItem.notes) && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">Additional Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {viewingItem.supplier && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Supplier
                                  </Label>
                                  <p className="text-sm font-medium">{viewingItem.supplier}</p>
                                </div>
                              )}
                              {viewingItem.location && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Location
                                  </Label>
                                  <p className="text-sm font-medium">{viewingItem.location}</p>
                                </div>
                              )}
                              {viewingItem.notes && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Notes
                                  </Label>
                                  <p className="text-sm font-medium break-words">{viewingItem.notes}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Last Updated */}
                        <div className="text-xs text-muted-foreground">
                          Last updated: {formatDate(viewingItem.last_updated)}
                        </div>
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
                    Review the inventory items to be imported. {importPreview.length} item(s) will be added.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-4">
                  <div className="space-y-4">
                    {importErrors.length > 0 && (
                      <Card className="border-destructive/50 bg-destructive/10">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
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
                                  <TableHead>Category</TableHead>
                                  <TableHead>Current Stock</TableHead>
                                  <TableHead>Min Level</TableHead>
                                  <TableHead>Max Level</TableHead>
                                  <TableHead>Unit</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importPreview.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{item.item_name}</TableCell>
                                    <TableCell>
                                      {categories.find((c) => c.value === item.category)?.label || item.category}
                                    </TableCell>
                                    <TableCell>{item.current_stock}</TableCell>
                                    <TableCell>{item.min_stock_level}</TableCell>
                                    <TableCell>{item.max_stock_level}</TableCell>
                                    <TableCell>{item.unit}</TableCell>
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
                    <AlertTriangle className="h-5 w-5" />
                    Delete Inventory Item
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

export default function StockInventoryPage() {
  return <StockInventoryContent />
}


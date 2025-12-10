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
  MoreHorizontal,
  Search,
  X,
  Eye,
  Percent,
  DollarSign,
  Receipt,
  AlertCircle,
  CheckCircle2,
  MapPin,
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
import { ChevronLeft, ChevronRight, ArrowUpDown, Loader2 } from "lucide-react"
import { API_BASE_URL } from "@/lib/api-config"

// Tax and charge data structure matching API response
interface TaxCharge {
  id: string
  name: string
  type: "tax" | "service_charge" | "delivery_fee" | "other"
  rate: number
  is_percentage: boolean
  applies_to: "all" | "category" | "location" | "item"
  category: string | null
  location: string | null
  min_amount: number | null
  max_amount: number | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// API Response types
interface TaxChargesResponse {
  tax_charges: TaxCharge[]
  total: number
  page?: number
  limit: number
}

// Form schema
const taxChargeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["tax", "service_charge", "delivery_fee", "other"]),
  rate: z.coerce.number().min(0, "Rate must be >= 0"),
  is_percentage: z.boolean().default(true),
  applies_to: z.enum(["all", "category", "location", "item"]),
  category: z.string().optional(),
  location: z.string().optional(),
  min_amount: z.union([z.coerce.number().min(0), z.literal("")]).transform((val) => val === "" ? undefined : val).optional(),
  max_amount: z.union([z.coerce.number().min(0), z.literal("")]).transform((val) => val === "" ? undefined : val).optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})

type TaxChargeFormValues = z.infer<typeof taxChargeSchema>

// Categories (will be fetched from API if needed)
const categories = [
  { value: "appetizers", label: "Appetizers" },
  { value: "main_course", label: "Main Course" },
  { value: "desserts", label: "Desserts" },
  { value: "beverages", label: "Beverages" },
]

// Locations (will be fetched from airports API if needed)
const locations = [
  { value: "jfk", label: "JFK International Airport" },
  { value: "lax", label: "LAX International Airport" },
  { value: "ord", label: "O'Hare International Airport" },
]

function TaxChargesContent() {
  const [taxCharges, setTaxCharges] = React.useState<TaxCharge[]>([])
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<"all" | TaxCharge["type"]>("all")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Pagination state
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(50)
  const [total, setTotal] = React.useState(0)
  const [sortBy, setSortBy] = React.useState<string>("created_at")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")
  const [appliesToFilter, setAppliesToFilter] = React.useState<"all" | TaxCharge["applies_to"]>("all")
  const [isActiveFilter, setIsActiveFilter] = React.useState<boolean | "all">("all")
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<TaxCharge | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [itemToDelete, setItemToDelete] = React.useState<TaxCharge | null>(null)
  const [viewDrawerOpen, setViewDrawerOpen] = React.useState(false)
  const [viewingItem, setViewingItem] = React.useState<TaxCharge | null>(null)

  const form = useForm<TaxChargeFormValues>({
    resolver: zodResolver(taxChargeSchema) as any,
    defaultValues: {
      name: "",
      type: "tax",
      rate: 0,
      is_percentage: true,
      applies_to: "all",
      category: "",
      location: "",
      min_amount: undefined,
      max_amount: undefined,
      description: "",
      is_active: true,
    },
  })

  // Watch appliesTo to show/hide relevant fields
  const appliesTo = form.watch("applies_to")
  const type = form.watch("type")

  // Fetch tax charges from API
  const fetchTaxCharges = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim())
      }
      if (typeFilter !== "all") {
        params.append("type", typeFilter)
      }
      if (appliesToFilter !== "all") {
        params.append("applies_to", appliesToFilter)
      }
      if (isActiveFilter !== "all") {
        params.append("is_active", isActiveFilter.toString())
      }
      params.append("sortBy", sortBy)
      params.append("sortOrder", sortOrder)
      params.append("page", page.toString())
      params.append("limit", limit.toString())

      const response = await fetch(`${API_BASE_URL}/tax-charges?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch tax charges" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: TaxChargesResponse = await response.json()
      setTaxCharges(data.tax_charges)
      setTotal(data.total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch tax charges"
      setError(errorMessage)
      toast.error("Error loading tax charges", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, typeFilter, appliesToFilter, isActiveFilter, sortBy, sortOrder, page, limit])

  // Fetch tax charges on mount and when dependencies change
  React.useEffect(() => {
    fetchTaxCharges()
  }, [fetchTaxCharges])

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to first page on search
      fetchTaxCharges()
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

  const allSelected = taxCharges.length > 0 && selectedItems.size === taxCharges.length
  const someSelected = selectedItems.size > 0 && selectedItems.size < taxCharges.length
  const totalPages = Math.ceil(total / limit)

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(taxCharges.map((i) => i.id)))
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
      name: "",
      type: "tax",
      rate: 0,
      is_percentage: true,
      applies_to: "all",
      category: "",
      location: "",
      min_amount: undefined,
      max_amount: undefined,
      description: "",
      is_active: true,
    })
    setDrawerOpen(true)
  }

  // Handle edit
  const handleEdit = async (item: TaxCharge) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tax-charges/${item.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch tax charge details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const fullItem: TaxCharge = await response.json()
      setEditingItem(fullItem)
      
      form.reset({
        name: fullItem.name,
        type: fullItem.type,
        rate: fullItem.rate,
        is_percentage: fullItem.is_percentage,
        applies_to: fullItem.applies_to,
        category: fullItem.category || "",
        location: fullItem.location || "",
        min_amount: fullItem.min_amount || undefined,
        max_amount: fullItem.max_amount || undefined,
        description: fullItem.description || "",
        is_active: fullItem.is_active,
      })
      setDrawerOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch tax charge details"
      toast.error("Error loading tax charge", {
        description: errorMessage,
      })
    }
  }

  // Handle save
  const handleSave = async (values: TaxChargeFormValues) => {
    try {
      const url = editingItem
        ? `${API_BASE_URL}/tax-charges/${editingItem.id}`
        : `${API_BASE_URL}/tax-charges`

      const method = editingItem ? "PUT" : "POST"

      const body: any = {
        name: values.name,
        type: values.type,
        rate: values.rate,
        is_percentage: values.is_percentage,
        applies_to: values.applies_to,
        is_active: values.is_active,
      }

      if (values.applies_to === "category" && values.category) {
        body.category = values.category
      }
      if (values.applies_to === "location" && values.location) {
        body.location = values.location
      }
      if (values.min_amount !== undefined) {
        body.min_amount = values.min_amount
      }
      if (values.max_amount !== undefined) {
        body.max_amount = values.max_amount
      }
      if (values.description) {
        body.description = values.description
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save tax charge" }))
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`
        
        toast.error("Error saving tax charge", {
          description: errorMessage,
        })
        throw new Error(errorMessage)
      }

      const data: TaxCharge = await response.json()
      
      toast.success(editingItem ? "Tax charge updated" : "Tax charge created", {
        description: `${data.name} has been ${editingItem ? "updated" : "created"} successfully.`,
      })

      setDrawerOpen(false)
      setEditingItem(null)
      form.reset()
      fetchTaxCharges()
    } catch (err) {
      // Error already handled in toast above
      console.error("Error saving tax charge:", err)
    }
  }

  // Handle view
  const handleView = async (item: TaxCharge) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tax-charges/${item.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch tax charge details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: TaxCharge = await response.json()
      setViewingItem(data)
      setViewDrawerOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch tax charge details"
      toast.error("Error loading tax charge details", {
        description: errorMessage,
      })
    }
  }

  // Handle delete
  const handleDelete = (item: TaxCharge) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/tax-charges/${itemToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete tax charge" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast.success("Tax charge deleted", {
        description: `${itemToDelete.name} has been deleted successfully.`,
      })

      setDeleteDialogOpen(false)
      setItemToDelete(null)
      setSelectedItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(itemToDelete.id)
        return newSet
      })
      fetchTaxCharges()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete tax charge"
      toast.error("Error deleting tax charge", {
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
      const response = await fetch(`${API_BASE_URL}/tax-charges`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: Array.from(selectedItems),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete tax charges" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      toast.success("Tax charges deleted", {
        description: `${data.deleted || selectedItems.size} tax charge(s) have been deleted successfully.`,
      })

      setSelectedItems(new Set())
      fetchTaxCharges()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete tax charges"
      toast.error("Error deleting tax charges", {
        description: errorMessage,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Get type badge
  const getTypeBadge = (type: TaxCharge["type"]) => {
    const badges = {
      tax: { label: "Tax", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      service_charge: { label: "Service Charge", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      delivery_fee: { label: "Delivery Fee", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
      other: { label: "Other", color: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
    }
    const badge = badges[type]
    return (
      <Badge className={badge.color} variant="outline">
        {badge.label}
      </Badge>
    )
  }

  // Format rate display
  const formatRate = (rate: string | number, isPercentage: boolean) => {
    const numRate = typeof rate === "string" ? parseFloat(rate) : rate
    if (isPercentage) {
      return `${numRate}%`
    }
    return `$${numRate.toFixed(2)}`
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


  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <HeaderNav title="Tax & Charges" />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
            {/* Header Card */}
            <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Tax & Charges Management
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Manage tax rates, service charges, and delivery fees
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
                    <Button
                      onClick={handleAdd}
                      className="gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Add Tax/Charge
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
                      placeholder="Search by name or description..."
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
                  {/* Type Filter */}
                  <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
                    <SelectTrigger className="w-full md:w-[180px] h-10">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="tax">Tax</SelectItem>
                      <SelectItem value="service_charge">Service Charge</SelectItem>
                      <SelectItem value="delivery_fee">Delivery Fee</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            Name
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            Rate
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">Applies To</TableHead>
                        <TableHead className="font-semibold">Conditions</TableHead>
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
                              <Skeleton className="h-4 w-[150px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[120px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[80px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[40px]" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : taxCharges.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <Receipt className="h-8 w-8 opacity-50" />
                              <p className="text-sm font-medium">No tax or charges found</p>
                              <p className="text-xs">
                                {searchQuery || typeFilter !== "all"
                                  ? "Try adjusting your search or filter"
                                  : "Get started by adding your first tax or charge"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        taxCharges.map((item) => (
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
                                aria-label={`Select ${item.name}`}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px]">
                              <div className="truncate" title={item.name}>
                                {item.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getTypeBadge(item.type)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {item.is_percentage ? (
                                  <Percent className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className="font-semibold">{formatRate(item.rate, item.is_percentage)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[150px]">
                              <div className="flex flex-col gap-0.5">
                                <Badge variant="outline" className="w-fit text-xs">
                                  {item.applies_to === "all"
                                    ? "All Orders"
                                    : item.applies_to === "category"
                                    ? `Category: ${categories.find((c) => c.value === item.category)?.label || item.category}`
                                    : item.applies_to === "location"
                                    ? `Location: ${locations.find((l) => l.value === item.location)?.label || item.location}`
                                    : "Specific Items"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[150px]">
                              <div className="flex flex-col gap-0.5 text-xs">
                                {item.min_amount !== null && (
                                  <div>
                                    <span className="text-muted-foreground">Min:</span>{" "}
                                    <span className="font-medium">${item.min_amount.toFixed(2)}</span>
                                  </div>
                                )}
                                {item.max_amount !== null && (
                                  <div>
                                    <span className="text-muted-foreground">Max:</span>{" "}
                                    <span className="font-medium">${item.max_amount.toFixed(2)}</span>
                                  </div>
                                )}
                                {item.min_amount === null && item.max_amount === null && (
                                  <span className="text-muted-foreground">—</span>
                                )}
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
                      Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} tax charges
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
                    <p className="font-medium">Error loading tax charges</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchTaxCharges}
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
                        <div className="absolute inset-0 bg-green-500/20 rounded-xl blur-lg" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/25">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <DrawerTitle>
                          {editingItem ? "Edit Tax/Charge" : "Add New Tax/Charge"}
                        </DrawerTitle>
                        <DrawerDescription>
                          {editingItem
                            ? "Update the tax or charge information below"
                            : "Fill in the details to add a new tax or charge"}
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                    <Form {...form}>
                      <form id="tax-charge-form" className="space-y-6 py-6">
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter name..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Type *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="tax">Tax</SelectItem>
                                    <SelectItem value="service_charge">Service Charge</SelectItem>
                                    <SelectItem value="delivery_fee">Delivery Fee</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="is_percentage"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Percentage Based</FormLabel>
                                  <div className="text-sm text-muted-foreground">
                                    {field.value ? "Rate is a percentage" : "Rate is a fixed amount"}
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
                          <FormField
                            control={form.control}
                            name="rate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Rate {form.watch("is_percentage") ? "(%)" : "($)"} *
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder={form.watch("is_percentage") ? "0.00" : "0.00"}
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
                          name="applies_to"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Applies To *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select applies to..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="all">All Orders</SelectItem>
                                  <SelectItem value="category">Specific Category</SelectItem>
                                  <SelectItem value="location">Specific Location</SelectItem>
                                  <SelectItem value="item">Specific Items</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {appliesTo === "category" && (
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
                        )}

                        {appliesTo === "location" && (
                          <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select location..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {locations.map((loc) => (
                                      <SelectItem key={loc.value} value={loc.value}>
                                        {loc.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="min_amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Minimum Amount ($)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="max_amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Maximum Amount ($)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
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
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter description..."
                                  rows={3}
                                  {...field}
                                />
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
                                  Tax/charge will be applied to orders
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
                        {editingItem ? "Update" : "Add Tax/Charge"}
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
                        <div className="absolute inset-0 bg-green-500/20 rounded-xl blur-lg" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/25">
                          <Receipt className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <DrawerTitle>
                          {viewingItem?.name}
                        </DrawerTitle>
                        <DrawerDescription>
                          Complete tax/charge information
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  {viewingItem && (
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                      <div className="space-y-4">
                        {/* Basic Information */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Basic Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Type
                                </Label>
                                {getTypeBadge(viewingItem.type)}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Status
                                </Label>
                                <Badge variant={viewingItem.is_active ? "default" : "secondary"}>
                                  {viewingItem.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Rate
                                </Label>
                                <p className="text-sm font-medium">
                                  {formatRate(viewingItem.rate, viewingItem.is_percentage)}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Calculation
                                </Label>
                                <p className="text-sm font-medium">
                                  {viewingItem.is_percentage ? "Percentage" : "Fixed Amount"}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Application Rules */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Application Rules</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block">
                                Applies To
                              </Label>
                              <Badge variant="outline">
                                {viewingItem.applies_to === "all"
                                  ? "All Orders"
                                  : viewingItem.applies_to === "category"
                                  ? `Category: ${categories.find((c) => c.value === viewingItem.category)?.label || viewingItem.category}`
                                  : viewingItem.applies_to === "location"
                                  ? `Location: ${locations.find((l) => l.value === viewingItem.location)?.label || viewingItem.location}`
                                  : "Specific Items"}
                              </Badge>
                            </div>
                            {(viewingItem.min_amount || viewingItem.max_amount) && (
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Amount Conditions
                                </Label>
                                <div className="space-y-1">
                                  {viewingItem.min_amount && (
                                    <p className="text-sm">
                                      <span className="text-muted-foreground">Minimum:</span>{" "}
                                      <span className="font-medium">${viewingItem.min_amount}</span>
                                    </p>
                                  )}
                                  {viewingItem.max_amount && (
                                    <p className="text-sm">
                                      <span className="text-muted-foreground">Maximum:</span>{" "}
                                      <span className="font-medium">${viewingItem.max_amount}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Description */}
                        {viewingItem.description && (
                          <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm font-medium break-words">{viewingItem.description}</p>
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Delete Tax/Charge
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-foreground">
                      {itemToDelete?.name}
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

export default function TaxChargesPage() {
  return <TaxChargesContent />
}


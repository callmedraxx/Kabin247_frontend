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
  Folder,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
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
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { API_BASE_URL } from "@/lib/api-config"

// Category data structure matching API response
interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  image_url: string | null
  icon: string | null
  display_order: number
  item_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// API Response types
interface CategoriesResponse {
  categories: Category[]
  total: number
  page?: number
  limit: number
}

// Form schema
const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().optional(), // Auto-generated if not provided
  description: z.string().optional(),
  image_url: z.string().optional(),
  icon: z.string().optional(),
  display_order: z.number().int().min(0, "Display order must be a non-negative integer"),
  is_active: z.boolean(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

function CategoriesContent() {
  const [categories, setCategories] = React.useState<Category[]>([])
  const [selectedItems, setSelectedItems] = React.useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Pagination state
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(100)
  const [total, setTotal] = React.useState(0)
  const [sortBy, setSortBy] = React.useState<string>("display_order")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")
  const [isActiveFilter, setIsActiveFilter] = React.useState<boolean | "all">("all")
  
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [categoryToDelete, setCategoryToDelete] = React.useState<Category | null>(null)
  const [viewDrawerOpen, setViewDrawerOpen] = React.useState(false)
  const [viewingCategory, setViewingCategory] = React.useState<Category | null>(null)
  const [importDialogOpen, setImportDialogOpen] = React.useState(false)
  const [importPreview, setImportPreview] = React.useState<Partial<Category>[]>([])
  const [importErrors, setImportErrors] = React.useState<string[]>([])
  const [isImporting, setIsImporting] = React.useState(false)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const imageInputRef = React.useRef<HTMLInputElement>(null)

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      image_url: "",
      icon: "",
      display_order: 0,
      is_active: true,
    },
  })

  // Fetch categories from API
  const fetchCategories = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim())
      }
      if (isActiveFilter !== "all") {
        params.append("is_active", isActiveFilter.toString())
      }
      params.append("sortBy", sortBy)
      params.append("sortOrder", sortOrder)
      params.append("page", page.toString())
      params.append("limit", limit.toString())

      const response = await fetch(`${API_BASE_URL}/categories?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch categories" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: CategoriesResponse = await response.json()
      setCategories(data.categories)
      setTotal(data.total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch categories"
      setError(errorMessage)
      toast.error("Error loading categories", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, isActiveFilter, sortBy, sortOrder, page, limit])

  // Fetch categories on mount and when dependencies change
  React.useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to first page on search
      fetchCategories()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Auto-generate slug from name (optional, API will generate if not provided)
  const watchName = form.watch("name")
  React.useEffect(() => {
    if (!editingCategory && watchName && !form.getValues("slug")) {
      const slug = watchName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      form.setValue("slug", slug, { shouldValidate: false })
    }
  }, [watchName, editingCategory, form])

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(categories.map((c) => c.id)))
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
    setEditingCategory(null)
    setImagePreview(null)
    form.reset({
      name: "",
      slug: "",
      description: "",
      image_url: "",
      icon: "",
      display_order: 0,
      is_active: true,
    })
    setDrawerOpen(true)
  }

  // Handle edit
  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setImagePreview(category.image_url || null)
    form.reset({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image_url: category.image_url || "",
      icon: category.icon || "",
      display_order: category.display_order,
      is_active: category.is_active,
    })
    setDrawerOpen(true)
  }

  // Handle save
  const handleSave = async (values: CategoryFormValues) => {
    try {
      const url = editingCategory
        ? `${API_BASE_URL}/categories/${editingCategory.id}`
        : `${API_BASE_URL}/categories`

      const method = editingCategory ? "PUT" : "POST"

      const body: any = {
        name: values.name,
        display_order: values.display_order,
        is_active: values.is_active,
      }

      if (values.slug) {
        body.slug = values.slug
      }
      if (values.description) {
        body.description = values.description
      }
      if (values.image_url) {
        body.image_url = values.image_url
      }
      if (values.icon) {
        body.icon = values.icon
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save category" }))
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`
        
        if (response.status === 400) {
          if (errorMessage.includes("slug")) {
            toast.error("Invalid slug", {
              description: "The slug must be unique and contain only lowercase letters, numbers, and hyphens.",
            })
          } else {
            toast.error("Validation error", {
              description: errorMessage,
            })
          }
        } else {
          toast.error("Error saving category", {
            description: errorMessage,
          })
        }
        throw new Error(errorMessage)
      }

      const data: Category = await response.json()
      
      toast.success(editingCategory ? "Category updated" : "Category created", {
        description: `${data.name} has been ${editingCategory ? "updated" : "created"} successfully.`,
      })

      setDrawerOpen(false)
      setEditingCategory(null)
      setImagePreview(null)
      form.reset()
      fetchCategories()
    } catch (err) {
      // Error already handled in toast above
      console.error("Error saving category:", err)
    }
  }

  // Handle view
  const handleView = async (category: Category) => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${category.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch category details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: Category = await response.json()
      setViewingCategory(data)
      setViewDrawerOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch category details"
      toast.error("Error loading category details", {
        description: errorMessage,
      })
    }
  }

  // Handle delete
  const handleDelete = (category: Category) => {
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!categoryToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${categoryToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete category" }))
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`
        
        if (response.status === 400) {
          if (errorMessage.includes("associated menu items")) {
            toast.error("Cannot delete category", {
              description: "This category has associated menu items. Please reassign or delete those items first.",
            })
          } else {
            toast.error("Error deleting category", {
              description: errorMessage,
            })
          }
        } else {
          toast.error("Error deleting category", {
            description: errorMessage,
          })
        }
        throw new Error(errorMessage)
      }

      toast.success("Category deleted", {
        description: `${categoryToDelete.name} has been deleted successfully.`,
      })

      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
      setSelectedItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(categoryToDelete.id)
        return newSet
      })
      fetchCategories()
    } catch (err) {
      // Error already handled in toast above
      console.error("Error deleting category:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: Array.from(selectedItems),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete categories" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      toast.success("Categories deleted", {
        description: `${data.deleted || selectedItems.size} category(ies) have been deleted successfully.`,
      })

      setSelectedItems(new Set())
      fetchCategories()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete categories"
      toast.error("Error deleting categories", {
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

  // Handle sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const allSelected = categories.length > 0 && selectedItems.size === categories.length
  const someSelected = selectedItems.size > 0 && selectedItems.size < categories.length
  const totalPages = Math.ceil(total / limit)

  // Export to CSV
  const handleExport = () => {
    const headers = [
      "Name",
      "Slug",
      "Description",
      "Display Order",
      "Item Count",
      "Status",
    ]
    const rows = categories.map((cat) => [
      cat.name,
      cat.slug,
      cat.description || "",
      cat.display_order,
      cat.item_count,
      cat.is_active ? "Active" : "Inactive",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `categories_${new Date().toISOString().split("T")[0]}.csv`)
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

        const parsedCategories: Category[] = []
        const errors: string[] = []

        rows.forEach((row, rowIndex) => {
          if (!row || row.every((cell) => !cell || String(cell).trim() === "")) {
            return
          }

          const name = row[0]?.toString().trim() || ""
          if (!name) {
            errors.push(`Row ${rowIndex + 2}: Missing required field (Name)`)
            return
          }

          const slug = row[1]?.toString().trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

          const category: Partial<Category> = {
            name,
            slug,
            description: row[2]?.toString().trim() || null,
            display_order: parseInt(row[3]?.toString().trim() || "0"),
            is_active: row[5]?.toString().toLowerCase() !== "inactive",
            image_url: null,
            icon: null,
            item_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          parsedCategories.push(category as Category)
        })

        setImportPreview(parsedCategories)
        setImportErrors(errors)
        setImportDialogOpen(true)
      } catch (error) {
        console.error("Error parsing Excel file:", error)
        toast.error("Error parsing Excel file", {
          description: "Please ensure it's a valid Excel file.",
        })
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

    try {
      // Import categories one by one (or you could create a bulk import endpoint)
      for (let i = 0; i < importPreview.length; i++) {
        const category = importPreview[i]
        try {
          const body: any = {
            name: category.name,
            display_order: category.display_order,
            is_active: category.is_active,
          }

          if (category.slug) {
            body.slug = category.slug
          }
          if (category.description) {
            body.description = category.description
          }
          if (category.image_url) {
            body.image_url = category.image_url
          }
          if (category.icon) {
            body.icon = category.icon
          }

          const response = await fetch(`${API_BASE_URL}/categories`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to import category" }))
            errors.push(`Row ${i + 2}: ${errorData.error || "Failed to import"}`)
          } else {
            successCount++
          }
        } catch (err) {
          errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Failed to import"}`)
        }
      }

      if (successCount > 0) {
        toast.success("Import completed", {
          description: `${successCount} category(ies) imported successfully${errors.length > 0 ? `, ${errors.length} error(s) occurred` : ""}.`,
        })
      }

      if (errors.length > 0) {
        setImportErrors(errors)
      } else {
        setImportDialogOpen(false)
        setImportPreview([])
        setImportErrors([])
        fetchCategories()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import categories"
      toast.error("Import error", {
        description: errorMessage,
      })
    } finally {
      setIsImporting(false)
    }
  }, [importPreview, fetchCategories])

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
    })
  }


  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <HeaderNav title="Categories" />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
            {/* Header Card */}
            <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Category Management
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Organize menu items into categories for better navigation
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
                      Create Category
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search categories by name, slug, or description..."
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
              </CardContent>
            </Card>

            {/* Error State */}
            {error && !isLoading && (
              <Card className="border-destructive/50 bg-destructive/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <p className="font-medium">Error loading categories</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchCategories}
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
                            onClick={() => handleSort("name")}
                          >
                            <div className="flex items-center gap-2">
                              <Folder className="h-4 w-4 text-muted-foreground" />
                              Category Name
                            </div>
                            {sortBy === "name" && (
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold">Slug</TableHead>
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="font-semibold">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 -ml-3 hover:bg-transparent"
                            onClick={() => handleSort("display_order")}
                          >
                            Display Order
                            {sortBy === "display_order" && (
                              sortOrder === "asc" ? (
                                <ArrowUp className="ml-2 h-3 w-3" />
                              ) : (
                                <ArrowDown className="ml-2 h-3 w-3" />
                              )
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold">Item Count</TableHead>
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
                              <Skeleton className="h-4 w-[200px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[100px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[80px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[80px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[40px]" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : categories.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <FolderOpen className="h-8 w-8 opacity-50" />
                              <p className="text-sm font-medium">No categories found</p>
                              <p className="text-xs">
                                {searchQuery
                                  ? "Try adjusting your search query"
                                  : "Get started by creating your first category"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        categories.map((category) => (
                          <TableRow
                            key={category.id}
                            className="group hover:bg-muted/30 transition-colors border-b border-border/30"
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.has(category.id)}
                                onCheckedChange={(checked) =>
                                  handleSelect(category.id, checked as boolean)
                                }
                                aria-label={`Select ${category.name}`}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px]">
                              <div className="flex items-center gap-2">
                                {category.image_url ? (
                                  <img
                                    src={category.image_url}
                                    alt={category.name}
                                    className="h-8 w-8 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                                    <Folder className="h-4 w-4 text-primary" />
                                  </div>
                                )}
                                <div className="truncate" title={category.name}>
                                  {category.name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[150px]">
                              <code className="text-xs bg-muted px-2 py-1 rounded truncate block" title={category.slug}>
                                {category.slug}
                              </code>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <div className="truncate text-sm text-muted-foreground" title={category.description || undefined}>
                                {category.description || "—"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{category.display_order}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">{category.item_count}</span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={category.is_active ? "default" : "secondary"}
                                className={category.is_active ? "" : "opacity-50"}
                              >
                                {category.is_active ? "Active" : "Inactive"}
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
                                    onClick={() => handleView(category)}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(category)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(category)}
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
                      Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} categories
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
                        <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-lg" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25">
                          <Folder className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <DrawerTitle>
                          {editingCategory ? "Edit Category" : "Create New Category"}
                        </DrawerTitle>
                        <DrawerDescription>
                          {editingCategory
                            ? "Update the category information below"
                            : "Fill in the details to create a new category"}
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                    <Form {...form}>
                      <form id="category-form" className="space-y-6 py-6">
                        {/* Image Upload */}
                        <div className="space-y-2">
                          <Label>Category Image</Label>
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

                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter category name..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Slug (Optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Auto-generated from name"
                                    {...field}
                                    className="font-mono"
                                  />
                                </FormControl>
                                <FormMessage />
                                <p className="text-xs text-muted-foreground">
                                  URL-friendly identifier (auto-generated if left empty)
                                </p>
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
                                  placeholder="Enter category description..."
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
                            name="display_order"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Display Order *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                                <p className="text-xs text-muted-foreground">
                                  Lower numbers appear first in menus
                                </p>
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
                                    Category will be visible in menus
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
                        {editingCategory ? "Update Category" : "Create Category"}
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
                        <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-lg" />
                        {viewingCategory?.image_url ? (
                          <img
                            src={viewingCategory.image_url}
                            alt={viewingCategory.name}
                            className="relative h-12 w-12 rounded-xl object-cover shadow-lg"
                          />
                        ) : (
                          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25">
                            <Folder className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <DrawerTitle>
                          {viewingCategory?.name}
                        </DrawerTitle>
                        <DrawerDescription>
                          Complete category information
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  {viewingCategory && (
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                      <div className="space-y-4">
                        {/* Category Information */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Category Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Slug
                                </Label>
                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                  {viewingCategory.slug}
                                </code>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Display Order
                                </Label>
                                <Badge variant="outline">{viewingCategory.display_order}</Badge>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Item Count
                                </Label>
                                <p className="text-sm font-medium">{viewingCategory.item_count} items</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Status
                                </Label>
                                <Badge variant={viewingCategory.is_active ? "default" : "secondary"}>
                                  {viewingCategory.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </div>
                            {viewingCategory.description && (
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Description
                                </Label>
                                <p className="text-sm font-medium break-words">
                                  {viewingCategory.description}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                  <DrawerFooter className="border-t border-border/50 pt-4 flex-shrink-0 bg-background sticky bottom-0">
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (viewingCategory) {
                            handleEdit(viewingCategory)
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
                    <Folder className="h-6 w-6 text-primary" />
                    Import Preview
                  </DialogTitle>
                  <DialogDescription>
                    Review the categories to be imported. {importPreview.length} category(ies) will be added.
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
                          <CardTitle className="text-lg">Preview ({importPreview.length} categories)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto scrollbar-hide">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Slug</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Display Order</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importPreview.map((category, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{category.name}</TableCell>
                                    <TableCell>
                                      <code className="text-xs bg-muted px-2 py-1 rounded">
                                        {category.slug}
                                      </code>
                                    </TableCell>
                                    <TableCell>{category.description || "—"}</TableCell>
                                    <TableCell>{category.display_order}</TableCell>
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
                        Import {importPreview.length} Category(ies)
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
                    Delete Category
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-foreground">
                      {categoryToDelete?.name}
                    </span>
                    ? This action cannot be undone.
                    {categoryToDelete && categoryToDelete.item_count > 0 && (
                      <span className="block mt-2 text-yellow-600">
                        Warning: This category has {categoryToDelete.item_count} item(s). Deleting it may affect menu organization.
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false)
                      setCategoryToDelete(null)
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

export default function CategoriesPage() {
  return <CategoriesContent />
}


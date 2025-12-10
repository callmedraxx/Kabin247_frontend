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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  MoreHorizontal,
  ChefHat,
  Phone,
  Mail,
  Code,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileSpreadsheet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Clock,
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
import { toast } from "sonner"

import { API_BASE_URL } from "@/lib/api-config"

// Caterer data structure matching API response
interface Caterer {
  id: number
  caterer_name: string
  caterer_number: string
  caterer_email: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
  time_zone: string | null
  created_at: string
  updated_at: string
}

// API Response types
interface CaterersResponse {
  caterers: Caterer[]
  total: number
  page?: number
  limit: number
  offset?: number
}

interface ImportResponse {
  message: string
  success: number
  errors: string[]
}

interface BulkDeleteResponse {
  message: string
  deleted: number
}

// Form schema
const catererSchema = z.object({
  caterer_name: z.string().min(1, "Caterer name is required"),
  caterer_number: z.string().min(1, "Caterer number is required"),
  caterer_email: z.string().email("Invalid email address").optional().or(z.literal("")),
  airport_code_iata: z.string().length(3, "IATA code must be exactly 3 characters").optional().or(z.literal("")),
  airport_code_icao: z.string().length(4, "ICAO code must be exactly 4 characters").optional().or(z.literal("")),
  time_zone: z.string().optional(),
})

type CatererFormValues = z.infer<typeof catererSchema>

function CaterersContent() {
  const [caterers, setCaterers] = React.useState<Caterer[]>([])
  const [selectedCaterers, setSelectedCaterers] = React.useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Pagination state
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(50)
  const [total, setTotal] = React.useState(0)
  const [sortBy, setSortBy] = React.useState<string>("id")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingCaterer, setEditingCaterer] = React.useState<Caterer | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [catererToDelete, setCatererToDelete] = React.useState<Caterer | null>(null)
  const [viewDrawerOpen, setViewDrawerOpen] = React.useState(false)
  const [viewingCaterer, setViewingCaterer] = React.useState<Caterer | null>(null)
  const [importDialogOpen, setImportDialogOpen] = React.useState(false)
  const [importErrors, setImportErrors] = React.useState<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const form = useForm<CatererFormValues>({
    resolver: zodResolver(catererSchema),
    defaultValues: {
      caterer_name: "",
      caterer_number: "",
      caterer_email: "",
      airport_code_iata: "",
      airport_code_icao: "",
      time_zone: "",
    },
  })

  // Fetch caterers from API
  const fetchCaterers = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim())
      }
      params.append("sortBy", sortBy)
      params.append("sortOrder", sortOrder)
      params.append("page", page.toString())
      params.append("limit", limit.toString())

      const response = await fetch(`${API_BASE_URL}/caterers?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch caterers" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: CaterersResponse = await response.json()
      setCaterers(data.caterers)
      setTotal(data.total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch caterers"
      setError(errorMessage)
      toast.error("Error loading caterers", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, sortBy, sortOrder, page, limit])

  // Fetch caterers on mount and when dependencies change
  React.useEffect(() => {
    fetchCaterers()
  }, [fetchCaterers])

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to first page on search
      fetchCaterers()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCaterers(new Set(caterers.map((c) => c.id)))
    } else {
      setSelectedCaterers(new Set())
    }
  }

  // Handle individual selection
  const handleSelect = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedCaterers)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedCaterers(newSelected)
  }

  // Open add dialog
  const handleAdd = () => {
    setEditingCaterer(null)
    form.reset({
      caterer_name: "",
      caterer_number: "",
      caterer_email: "",
      airport_code_iata: "",
      airport_code_icao: "",
      time_zone: "",
    })
    setDialogOpen(true)
  }

  // Open edit dialog
  const handleEdit = (caterer: Caterer) => {
    setEditingCaterer(caterer)
    form.reset({
      caterer_name: caterer.caterer_name,
      caterer_number: caterer.caterer_number,
      caterer_email: caterer.caterer_email || "",
      airport_code_iata: caterer.airport_code_iata || "",
      airport_code_icao: caterer.airport_code_icao || "",
      time_zone: caterer.time_zone || "",
    })
    setDialogOpen(true)
  }

  // Handle save (create or update)
  const handleSave = async (values: CatererFormValues) => {
    try {
      const url = editingCaterer
        ? `${API_BASE_URL}/caterers/${editingCaterer.id}`
        : `${API_BASE_URL}/caterers`

      const method = editingCaterer ? "PUT" : "POST"

      // Prepare body - only include non-empty optional fields
      const body: any = {
        caterer_name: values.caterer_name,
        caterer_number: values.caterer_number,
      }
      
      if (values.caterer_email && values.caterer_email.trim()) {
        body.caterer_email = values.caterer_email.trim()
      }
      if (values.airport_code_iata && values.airport_code_iata.trim()) {
        body.airport_code_iata = values.airport_code_iata.trim().toUpperCase()
      }
      if (values.airport_code_icao && values.airport_code_icao.trim()) {
        body.airport_code_icao = values.airport_code_icao.trim().toUpperCase()
      }
      if (values.time_zone && values.time_zone.trim()) {
        body.time_zone = values.time_zone.trim()
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save caterer" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: Caterer = await response.json()
      
      toast.success(editingCaterer ? "Caterer updated" : "Caterer created", {
        description: `${data.caterer_name} has been ${editingCaterer ? "updated" : "created"} successfully.`,
      })

      setDialogOpen(false)
      setEditingCaterer(null)
      form.reset()
      fetchCaterers()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save caterer"
      toast.error("Error", {
        description: errorMessage,
      })
    }
  }

  // Handle view details
  const handleView = async (caterer: Caterer) => {
    try {
      const response = await fetch(`${API_BASE_URL}/caterers/${caterer.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch caterer details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: Caterer = await response.json()
      setViewingCaterer(data)
      setViewDrawerOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch caterer details"
      toast.error("Error", {
        description: errorMessage,
      })
    }
  }

  // Handle delete
  const handleDelete = (caterer: Caterer) => {
    setCatererToDelete(caterer)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!catererToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/caterers/${catererToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete caterer" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast.success("Caterer deleted", {
        description: `${catererToDelete.caterer_name} has been deleted successfully.`,
      })

      setDeleteDialogOpen(false)
      setCatererToDelete(null)
      setSelectedCaterers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(catererToDelete.id)
        return newSet
      })
      fetchCaterers()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete caterer"
      toast.error("Error", {
        description: errorMessage,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedCaterers.size === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/caterers`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: Array.from(selectedCaterers),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete caterers" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: BulkDeleteResponse = await response.json()
      
      toast.success("Caterers deleted", {
        description: `${data.deleted || selectedCaterers.size} caterer(s) have been deleted successfully.`,
      })

      setSelectedCaterers(new Set())
      fetchCaterers()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete caterers"
      toast.error("Error", {
        description: errorMessage,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle export
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/caterers/export`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to export caterers" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `caterers_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success("Export successful", {
        description: "Caterers have been exported to Excel file.",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export caterers"
      toast.error("Error", {
        description: errorMessage,
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Handle file import
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]
    const validExtensions = [".xlsx", ".xls"]

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
    const isValidType = validTypes.includes(file.type) || validExtensions.includes(fileExtension)

    if (!isValidType) {
      toast.error("Invalid file type", {
        description: "Please upload an Excel file (.xlsx, .xls).",
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", {
        description: "File size must be less than 10MB.",
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${API_BASE_URL}/caterers/import`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to import caterers" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: ImportResponse = await response.json()

      // Always refresh the table after import, even if there are errors
      // because some records may have been successfully imported
      fetchCaterers()

      if (data.errors && data.errors.length > 0) {
        setImportErrors(data.errors)
        setImportDialogOpen(true)
        toast.warning("Import completed with errors", {
          description: `${data.success} caterer(s) imported successfully, but ${data.errors.length} error(s) occurred.`,
          duration: 5000,
        })
      } else {
        toast.success("Import successful", {
          description: `${data.success} caterer(s) have been imported successfully.`,
        })
        setImportDialogOpen(false)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import caterers"
      toast.error("Error", {
        description: errorMessage,
      })
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Handle import cancel
  const handleImportCancel = () => {
    setImportDialogOpen(false)
    setImportErrors([])
    // Refresh table to show any successfully imported records
    fetchCaterers()
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

  const allSelected = caterers.length > 0 && selectedCaterers.size === caterers.length
  const someSelected = selectedCaterers.size > 0 && selectedCaterers.size < caterers.length
  const totalPages = Math.ceil(total / limit)

  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <HeaderNav title="Caterers" />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
            {/* Header Card */}
            <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Caterer Management
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Manage caterers, contact information, and airport codes
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCaterers.size > 0 && (
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
                        Delete Selected ({selectedCaterers.size})
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-import"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                      className="gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      {isImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Import
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      disabled={isExporting}
                      className="gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Export
                    </Button>
                    <Button
                      onClick={handleAdd}
                      className="gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Add Caterer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search caterers, emails, or codes..."
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
                    <p className="font-medium">Error loading caterers</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchCaterers}
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
                            onClick={() => handleSort("caterer_name")}
                          >
                            <div className="flex items-center gap-2">
                              <ChefHat className="h-4 w-4 text-muted-foreground" />
                              Caterer Name
                            </div>
                            {sortBy === "caterer_name" && (
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 -ml-3 hover:bg-transparent"
                            onClick={() => handleSort("caterer_number")}
                          >
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              Caterer Number
                            </div>
                            {sortBy === "caterer_number" && (
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            Caterer Email
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Code className="h-4 w-4 text-muted-foreground" />
                            IATA
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Code className="h-4 w-4 text-muted-foreground" />
                            ICAO
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            Time Zone
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
                              <Skeleton className="h-4 w-[200px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[150px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[200px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[60px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[60px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[150px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[40px]" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : caterers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <ChefHat className="h-8 w-8 opacity-50" />
                              <p className="text-sm font-medium">No caterers found</p>
                              <p className="text-xs">
                                {searchQuery ? "Try adjusting your search query" : "Get started by adding your first caterer"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        caterers.map((caterer) => (
                          <TableRow
                            key={caterer.id}
                            className="group hover:bg-muted/30 transition-colors border-b border-border/30"
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedCaterers.has(caterer.id)}
                                onCheckedChange={(checked) =>
                                  handleSelect(caterer.id, checked as boolean)
                                }
                                aria-label={`Select ${caterer.caterer_name}`}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px]">
                              <div className="truncate" title={caterer.caterer_name}>
                                {caterer.caterer_name}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[150px]">
                              {caterer.caterer_number ? (
                                <a
                                  href={`tel:${caterer.caterer_number}`}
                                  className="text-primary hover:underline transition-colors truncate block"
                                  title={caterer.caterer_number}
                                >
                                  {caterer.caterer_number}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {caterer.caterer_email ? (
                                <a
                                  href={`mailto:${caterer.caterer_email}`}
                                  className="text-primary hover:underline transition-colors truncate block"
                                  title={caterer.caterer_email}
                                >
                                  {caterer.caterer_email}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {caterer.airport_code_iata ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                  {caterer.airport_code_iata}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {caterer.airport_code_icao ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary/50 text-foreground text-xs font-medium">
                                  {caterer.airport_code_icao}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[180px]">
                              <div className="truncate" title={caterer.time_zone || ""}>
                                {caterer.time_zone || <span className="text-muted-foreground">—</span>}
                              </div>
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
                                    onClick={() => handleView(caterer)}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(caterer)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(caterer)}
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
                      Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} caterers
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

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                      <DialogTitle className="text-xl font-bold">
                        {editingCaterer ? "Edit Caterer" : "Add New Caterer"}
                      </DialogTitle>
                      <DialogDescription className="text-sm">
                        {editingCaterer
                          ? "Update the caterer information below"
                          : "Enter the caterer information to add to the system"}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSave)} className="relative space-y-5 py-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/10 text-violet-400">1</span>
                        Basic Information
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="caterer_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">
                                Caterer Name *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter caterer name..."
                                  {...field}
                                  className="h-11 bg-muted/30 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="caterer_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">
                                Caterer Number *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  placeholder="Enter phone number..."
                                  {...field}
                                  className="h-11 bg-muted/30 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="caterer_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">
                              Caterer Email
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Enter email address..."
                                {...field}
                                className="h-11 bg-muted/30 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20 sm:max-w-md"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/10 text-violet-400">2</span>
                        Airport Codes
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="airport_code_iata"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">
                                Airport Code IATA
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., JFK"
                                  maxLength={3}
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e.target.value.toUpperCase())
                                  }}
                                  className="h-11 bg-muted/30 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20 font-mono uppercase"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="airport_code_icao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">
                                Airport Code ICAO
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., KJFK"
                                  maxLength={4}
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e.target.value.toUpperCase())
                                  }}
                                  className="h-11 bg-muted/30 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20 font-mono uppercase"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="time_zone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">
                              Time Zone
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., America/New_York"
                                {...field}
                                className="h-11 bg-muted/30 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20 sm:max-w-md"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter className="relative pt-4 border-t border-border/30 gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setDialogOpen(false)
                          setEditingCaterer(null)
                          form.reset()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/25 text-white px-6"
                      >
                        {editingCaterer ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Update Caterer
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Caterer
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
                        <div className="absolute inset-0 bg-violet-500/20 rounded-xl blur-lg" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25">
                          <ChefHat className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <DrawerTitle>
                          {viewingCaterer?.caterer_name}
                        </DrawerTitle>
                        <DrawerDescription>
                          Complete caterer information and details
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  {viewingCaterer && (
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                      <div className="space-y-4">
                        {/* Caterer Information Card */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <ChefHat className="h-5 w-5 text-primary" />
                              Caterer Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Caterer Name
                                </Label>
                                <p className="text-sm font-medium break-words">
                                  {viewingCaterer.caterer_name}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Caterer Number
                                </Label>
                                <p className="text-sm font-medium break-words">
                                  {viewingCaterer.caterer_number || "Not provided"}
                                </p>
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                  <Code className="h-3 w-3" />
                                  IATA Code
                                </Label>
                                {viewingCaterer.airport_code_iata ? (
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium">
                                    {viewingCaterer.airport_code_iata}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Not provided</span>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                  <Code className="h-3 w-3" />
                                  ICAO Code
                                </Label>
                                {viewingCaterer.airport_code_icao ? (
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-secondary/50 text-foreground text-sm font-medium">
                                    {viewingCaterer.airport_code_icao}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Not provided</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Time Zone
                              </Label>
                              <p className="text-sm font-medium break-words">
                                {viewingCaterer.time_zone || "Not provided"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Contact Information Card */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Phone className="h-5 w-5 text-primary" />
                              Contact Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                Phone Number
                              </Label>
                              {viewingCaterer.caterer_number ? (
                                <a
                                  href={`tel:${viewingCaterer.caterer_number}`}
                                  className="text-sm font-medium text-primary hover:underline break-all"
                                >
                                  {viewingCaterer.caterer_number}
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">Not provided</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                Email Address
                              </Label>
                              {viewingCaterer.caterer_email ? (
                                <a
                                  href={`mailto:${viewingCaterer.caterer_email}`}
                                  className="text-sm font-medium text-primary hover:underline break-all"
                                >
                                  {viewingCaterer.caterer_email}
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">Not provided</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                  <DrawerFooter className="border-t border-border/50 pt-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (viewingCaterer) {
                            handleEdit(viewingCaterer)
                            setViewDrawerOpen(false)
                          }
                        }}
                        className="flex-1 gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Caterer
                      </Button>
                      <DrawerClose asChild>
                        <Button className="flex-1">Close</Button>
                      </DrawerClose>
                    </div>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>

            {/* Import Errors Dialog */}
            {importErrors.length > 0 && (
              <Dialog open={importDialogOpen} onOpenChange={handleImportCancel}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                      <FileSpreadsheet className="h-6 w-6 text-primary" />
                      Import Errors
                    </DialogTitle>
                    <DialogDescription>
                      The following errors occurred during import:
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
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
                  </div>
                  <DialogFooter>
                    <Button onClick={handleImportCancel}>Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Delete Caterer
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-foreground">
                      {catererToDelete?.caterer_name}
                    </span>
                    ? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false)
                      setCatererToDelete(null)
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

export default function CaterersPage() {
  return <CaterersContent />
}

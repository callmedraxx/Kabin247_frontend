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
  Building2,
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
  Plane,
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

// FBO data structure matching API response
interface FBO {
  id: number
  fbo_name: string
  fbo_email: string | null
  fbo_phone: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
  airport_name: string | null
  created_at: string
  updated_at: string
}

// API Response types
interface FBOsResponse {
  fbos: FBO[]
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
const fboSchema = z.object({
  fbo_name: z.string().min(1, "FBO name is required"),
  fbo_email: z.string().email("Invalid email address").optional().or(z.literal("")),
  fbo_phone: z.string().optional(),
})

type FBOFormValues = z.infer<typeof fboSchema>

function FBOsContent() {
  const [fbos, setFBOs] = React.useState<FBO[]>([])
  const [selectedFBOs, setSelectedFBOs] = React.useState<Set<number>>(new Set())
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
  const [editingFBO, setEditingFBO] = React.useState<FBO | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [fboToDelete, setFboToDelete] = React.useState<FBO | null>(null)
  const [viewDrawerOpen, setViewDrawerOpen] = React.useState(false)
  const [viewingFBO, setViewingFBO] = React.useState<FBO | null>(null)
  const [importDialogOpen, setImportDialogOpen] = React.useState(false)
  const [importErrors, setImportErrors] = React.useState<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const form = useForm<FBOFormValues>({
    resolver: zodResolver(fboSchema),
    defaultValues: {
      fbo_name: "",
      fbo_email: "",
      fbo_phone: "",
    },
  })

  // Fetch FBOs from API
  const fetchFBOs = React.useCallback(async () => {
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

      const response = await fetch(`${API_BASE_URL}/fbos?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch FBOs" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: FBOsResponse = await response.json()
      setFBOs(data.fbos)
      setTotal(data.total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch FBOs"
      setError(errorMessage)
      toast.error("Error loading FBOs", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, sortBy, sortOrder, page, limit])

  // Fetch FBOs on mount and when dependencies change
  React.useEffect(() => {
    fetchFBOs()
  }, [fetchFBOs])

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to first page on search
      fetchFBOs()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFBOs(new Set(fbos.map((f) => f.id)))
    } else {
      setSelectedFBOs(new Set())
    }
  }

  // Handle individual selection
  const handleSelect = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedFBOs)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedFBOs(newSelected)
  }

  // Open add dialog
  const handleAdd = () => {
    setEditingFBO(null)
    form.reset({
      fbo_name: "",
      fbo_email: "",
      fbo_phone: "",
    })
    setDialogOpen(true)
  }

  // Open edit dialog
  const handleEdit = (fbo: FBO) => {
    setEditingFBO(fbo)
    form.reset({
      fbo_name: fbo.fbo_name,
      fbo_email: fbo.fbo_email || "",
      fbo_phone: fbo.fbo_phone || "",
    })
    setDialogOpen(true)
  }

  // Handle save (create or update)
  const handleSave = async (values: FBOFormValues) => {
    try {
      const url = editingFBO
        ? `${API_BASE_URL}/fbos/${editingFBO.id}`
        : `${API_BASE_URL}/fbos`

      const method = editingFBO ? "PUT" : "POST"

      // Prepare body - only include the required fields
      const body: any = {
        fbo_name: values.fbo_name,
      }
      
      if (values.fbo_email && values.fbo_email.trim()) {
        body.fbo_email = values.fbo_email.trim()
      }
      if (values.fbo_phone && values.fbo_phone.trim()) {
        body.fbo_phone = values.fbo_phone.trim()
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save FBO" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: FBO = await response.json()
      
      toast.success(editingFBO ? "FBO updated" : "FBO created", {
        description: `${data.fbo_name} has been ${editingFBO ? "updated" : "created"} successfully.`,
      })

      setDialogOpen(false)
      setEditingFBO(null)
      form.reset()
      fetchFBOs()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save FBO"
      toast.error("Error", {
        description: errorMessage,
      })
    }
  }

  // Handle view details
  const handleView = async (fbo: FBO) => {
    try {
      const response = await fetch(`${API_BASE_URL}/fbos/${fbo.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch FBO details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: FBO = await response.json()
      setViewingFBO(data)
      setViewDrawerOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch FBO details"
      toast.error("Error", {
        description: errorMessage,
      })
    }
  }

  // Handle delete
  const handleDelete = (fbo: FBO) => {
    setFboToDelete(fbo)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!fboToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/fbos/${fboToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete FBO" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast.success("FBO deleted", {
        description: `${fboToDelete.fbo_name} has been deleted successfully.`,
      })

      setDeleteDialogOpen(false)
      setFboToDelete(null)
      setSelectedFBOs((prev) => {
        const newSet = new Set(prev)
        newSet.delete(fboToDelete.id)
        return newSet
      })
      fetchFBOs()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete FBO"
      toast.error("Error", {
        description: errorMessage,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedFBOs.size === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/fbos`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: Array.from(selectedFBOs),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete FBOs" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      toast.success("FBOs deleted", {
        description: `${data.deleted || selectedFBOs.size} FBO(s) have been deleted successfully.`,
      })

      setSelectedFBOs(new Set())
      fetchFBOs()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete FBOs"
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
      const response = await fetch(`${API_BASE_URL}/fbos/export`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to export FBOs" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `fbos_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success("Export successful", {
        description: "FBOs have been exported to Excel file.",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export FBOs"
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
      "text/csv",
    ]
    const validExtensions = [".xlsx", ".xls", ".csv"]

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
    const isValidType = validTypes.includes(file.type) || validExtensions.includes(fileExtension)

    if (!isValidType) {
      toast.error("Invalid file type", {
        description: "Please upload an Excel file (.xlsx, .xls) or CSV file.",
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

      const response = await fetch(`${API_BASE_URL}/fbos/import`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to import FBOs" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: ImportResponse = await response.json()

      if (data.errors && data.errors.length > 0) {
        setImportErrors(data.errors)
        toast.warning("Import completed with errors", {
          description: `${data.success} FBO(s) imported successfully, but ${data.errors.length} error(s) occurred.`,
          duration: 5000,
        })
      } else {
        toast.success("Import successful", {
          description: `${data.success} FBO(s) have been imported successfully.`,
        })
        setImportDialogOpen(false)
        fetchFBOs()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import FBOs"
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

  const allSelected = fbos.length > 0 && selectedFBOs.size === fbos.length
  const someSelected = selectedFBOs.size > 0 && selectedFBOs.size < fbos.length
  const totalPages = Math.ceil(total / limit)

  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <HeaderNav title="FBOs" />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
            {/* Header Card */}
            <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      FBO Management
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Manage FBOs, contact information, and airport codes
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedFBOs.size > 0 && (
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
                        Delete Selected ({selectedFBOs.size})
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
                      Add FBO
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search FBOs, emails, or codes..."
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
                    <p className="font-medium">Error loading FBOs</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchFBOs}
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
                            onClick={() => handleSort("fbo_name")}
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              FBO Name
                            </div>
                            {sortBy === "fbo_name" && (
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            Email
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            Phone
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
                              <Skeleton className="h-4 w-[200px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[150px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[40px]" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : fbos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <Building2 className="h-8 w-8 opacity-50" />
                              <p className="text-sm font-medium">No FBOs found</p>
                              <p className="text-xs">
                                {searchQuery ? "Try adjusting your search query" : "Get started by adding your first FBO"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        fbos.map((fbo) => (
                          <TableRow
                            key={fbo.id}
                            className="group hover:bg-muted/30 transition-colors border-b border-border/30"
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedFBOs.has(fbo.id)}
                                onCheckedChange={(checked) =>
                                  handleSelect(fbo.id, checked as boolean)
                                }
                                aria-label={`Select ${fbo.fbo_name}`}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px]">
                              <div className="truncate" title={fbo.fbo_name}>
                                {fbo.fbo_name}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {fbo.fbo_email ? (
                                <a
                                  href={`mailto:${fbo.fbo_email}`}
                                  className="text-primary hover:underline transition-colors truncate block"
                                  title={fbo.fbo_email}
                                >
                                  {fbo.fbo_email}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[150px]">
                              {fbo.fbo_phone ? (
                                <a
                                  href={`tel:${fbo.fbo_phone}`}
                                  className="text-primary hover:underline transition-colors truncate block"
                                  title={fbo.fbo_phone}
                                >
                                  {fbo.fbo_phone}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
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
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleView(fbo)}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(fbo)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(fbo)}
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
                      Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} FBOs
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
                      <DialogTitle className="text-xl font-bold">
                        {editingFBO ? "Edit FBO" : "Add New FBO"}
                      </DialogTitle>
                      <DialogDescription className="text-sm">
                        {editingFBO
                          ? "Update the FBO information below"
                          : "Enter the FBO information to add to the system"}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSave)} className="relative space-y-5 py-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10 text-blue-400">1</span>
                        FBO Information
                      </div>
                      <FormField
                        control={form.control}
                        name="fbo_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">
                              FBO Name *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter FBO name..."
                                {...field}
                                className="h-11 bg-muted/30 border-border/40 focus:border-blue-500/50 focus:ring-blue-500/20"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10 text-blue-400">2</span>
                        Contact Information
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="fbo_email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">
                                Email
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="Enter FBO email..."
                                  {...field}
                                  className="h-11 bg-muted/30 border-border/40 focus:border-blue-500/50 focus:ring-blue-500/20"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fbo_phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">
                                Phone
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  placeholder="Enter FBO phone..."
                                  {...field}
                                  className="h-11 bg-muted/30 border-border/40 focus:border-blue-500/50 focus:ring-blue-500/20"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <DialogFooter className="relative pt-4 border-t border-border/30 gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setDialogOpen(false)
                          setEditingFBO(null)
                          form.reset()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/25 text-white px-6"
                      >
                        {editingFBO ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Update FBO
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Add FBO
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
                        <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-lg" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <DrawerTitle>
                          {viewingFBO?.fbo_name}
                        </DrawerTitle>
                        <DrawerDescription>
                          Complete FBO information and details
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  {viewingFBO && (
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                      <div className="space-y-4">
                        {/* FBO Information Card */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Building2 className="h-5 w-5 text-primary" />
                              FBO Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block">
                                FBO Name
                              </Label>
                              <p className="text-sm font-medium break-words">
                                {viewingFBO.fbo_name}
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Contact Information Card */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Building2 className="h-5 w-5 text-primary" />
                              Contact Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                Email Address
                              </Label>
                              {viewingFBO.fbo_email ? (
                                <a
                                  href={`mailto:${viewingFBO.fbo_email}`}
                                  className="text-sm font-medium text-primary hover:underline break-all"
                                >
                                  {viewingFBO.fbo_email}
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">Not provided</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                Phone Number
                              </Label>
                              {viewingFBO.fbo_phone ? (
                                <a
                                  href={`tel:${viewingFBO.fbo_phone}`}
                                  className="text-sm font-medium text-primary hover:underline break-all"
                                >
                                  {viewingFBO.fbo_phone}
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
                          if (viewingFBO) {
                            handleEdit(viewingFBO)
                            setViewDrawerOpen(false)
                          }
                        }}
                        className="flex-1 gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit FBO
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
                    Delete FBO
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-foreground">
                      {fboToDelete?.fbo_name}
                    </span>
                    ? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false)
                      setFboToDelete(null)
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

export default function FBOsPage() {
  return <FBOsContent />
}

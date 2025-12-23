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
import { Textarea } from "@/components/ui/textarea"
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
import {
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  MoreHorizontal,
  User,
  Mail,
  Phone,
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
import { toast } from "sonner"

import { API_BASE_URL } from "@/lib/api-config"

// Client data structure matching API response
interface Client {
  id: number
  full_name: string
  full_address: string
  email: string | null
  contact_number: string | null
  created_at: string
  updated_at: string
}

// API Response types
interface ClientsResponse {
  clients: Client[]
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

// Form schema
const clientSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  full_address: z.string().min(1, "Full address is required"),
  email: z.string().email("Email is required"),
  contact_number: z.string().optional(),
})

type ClientFormValues = z.infer<typeof clientSchema>

function ClientsContent() {
  const [clients, setClients] = React.useState<Client[]>([])
  const [selectedClients, setSelectedClients] = React.useState<Set<number>>(new Set())
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
  const [editingClient, setEditingClient] = React.useState<Client | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null)
  const [viewDrawerOpen, setViewDrawerOpen] = React.useState(false)
  const [viewingClient, setViewingClient] = React.useState<Client | null>(null)
  const [importDialogOpen, setImportDialogOpen] = React.useState(false)
  const [importErrors, setImportErrors] = React.useState<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)


  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      full_name: "",
      full_address: "",
      email: "",
      contact_number: "",
    },
  })

  // Fetch clients from API
  const fetchClients = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Ensure page and limit are valid numbers (not NaN)
      const safePage = isNaN(page) || page < 1 ? 1 : page
      const safeLimit = isNaN(limit) || limit < 1 ? 50 : limit
      
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim())
      }
      params.append("sortBy", sortBy)
      params.append("sortOrder", sortOrder)
      params.append("page", safePage.toString())
      params.append("limit", safeLimit.toString())

      const response = await fetch(`${API_BASE_URL}/clients?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch clients" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: ClientsResponse = await response.json()
      setClients(data.clients)
      setTotal(data.total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch clients"
      setError(errorMessage)
      toast.error("Error loading clients", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, sortBy, sortOrder, page, limit])

  // Scroll to top on mount
  React.useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Fetch clients on mount and when dependencies change
  React.useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to first page on search
      fetchClients()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(new Set(clients.map((c) => c.id)))
    } else {
      setSelectedClients(new Set())
    }
  }

  // Handle individual selection
  const handleSelect = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedClients)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedClients(newSelected)
  }

  // Open add dialog
  const handleAdd = () => {
    setEditingClient(null)
    form.reset({
      full_name: "",
      full_address: "",
      email: "",
      contact_number: "",
    })
    setDialogOpen(true)
  }

  // Open edit dialog
  const handleEdit = (client: Client) => {
    setEditingClient(client)
    form.reset({
      full_name: client.full_name,
      full_address: client.full_address,
      email: client.email || "",
      contact_number: client.contact_number || "",
    })
    setDialogOpen(true)
  }

  // Handle save (create or update)
  const handleSave = async (values: ClientFormValues) => {
    try {
      const url = editingClient
        ? `${API_BASE_URL}/clients/${editingClient.id}`
        : `${API_BASE_URL}/clients`

      const method = editingClient ? "PUT" : "POST"

      const body: any = {
        full_name: values.full_name,
        full_address: values.full_address,
        email: values.email,
        contact_number: values.contact_number,
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save client" }))
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`
        
        // Provide more specific error messages
        if (response.status === 400) {
          if (errorMessage.includes("Duplicate client found")) {
            toast.error("Duplicate client", {
              description: "A client with these exact details already exists. Please check all fields.",
            })
          } else {
            toast.error("Validation error", {
              description: errorMessage,
            })
          }
        } else {
          toast.error("Error saving client", {
            description: errorMessage,
          })
        }
        throw new Error(errorMessage)
      }

      const data: Client = await response.json()
      
      toast.success(editingClient ? "Client updated" : "Client created", {
        description: `${data.full_name} has been ${editingClient ? "updated" : "created"} successfully.`,
      })

      setDialogOpen(false)
      setEditingClient(null)
      form.reset()
      fetchClients()
    } catch (err) {
      // Error already handled in toast above
      console.error("Error saving client:", err)
    }
  }

  // Handle view details
  const handleView = async (client: Client) => {
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${client.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch client details" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: Client = await response.json()
      setViewingClient(data)
      setViewDrawerOpen(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch client details"
      toast.error("Error loading client details", {
        description: errorMessage,
      })
    }
  }

  // Handle delete
  const handleDelete = (client: Client) => {
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!clientToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${clientToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete client" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      toast.success("Client deleted", {
        description: `${clientToDelete.full_name} has been deleted successfully.`,
      })

      setDeleteDialogOpen(false)
      setClientToDelete(null)
      setSelectedClients((prev) => {
        const newSet = new Set(prev)
        newSet.delete(clientToDelete.id)
        return newSet
      })
      fetchClients()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete client"
      toast.error("Error deleting client", {
        description: errorMessage,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedClients.size === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/clients`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: Array.from(selectedClients),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete clients" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      toast.success("Clients deleted", {
        description: `${data.deleted || selectedClients.size} client(s) have been deleted successfully.`,
      })

      setSelectedClients(new Set())
      fetchClients()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete clients"
      toast.error("Error deleting clients", {
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
      // Export endpoint expects no query parameters
      const response = await fetch(`${API_BASE_URL}/clients/export`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to export clients" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `clients_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success("Export successful", {
        description: "Clients have been exported to Excel file.",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export clients"
      toast.error("Error exporting clients", {
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

      const response = await fetch(`${API_BASE_URL}/clients/import`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to import clients" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: ImportResponse = await response.json()

      if (data.errors && data.errors.length > 0) {
        setImportErrors(data.errors)
        setImportDialogOpen(true)
        toast.warning("Import completed with errors", {
          description: `${data.success} client(s) imported successfully, but ${data.errors.length} error(s) occurred.`,
          duration: 5000,
        })
      } else {
        toast.success("Import successful", {
          description: `${data.success} client(s) have been imported successfully.`,
        })
        setImportDialogOpen(false)
        fetchClients()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import clients"
      toast.error("Error importing clients", {
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

  const allSelected = clients.length > 0 && selectedClients.size === clients.length
  const someSelected = selectedClients.size > 0 && selectedClients.size < clients.length
  const totalPages = Math.ceil(total / limit)

  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <HeaderNav title="Clients" />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
            {/* Header Card */}
            <Card className="border-border/50 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Client Management
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Manage clients, their contact information, and airport associations
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedClients.size > 0 && (
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
                        Delete Selected ({selectedClients.size})
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
                      Add Client
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search clients, addresses, emails, or airport codes..."
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
                    <p className="font-medium">Error loading clients</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchClients}
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
                            onClick={() => handleSort("full_name")}
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              Full Name
                            </div>
                            {sortBy === "full_name" && (
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            Full Address
                          </div>
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
                            Contact Number
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
                              <Skeleton className="h-4 w-[180px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[200px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[160px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[140px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[40px]" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : clients.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <User className="h-8 w-8 opacity-50" />
                              <p className="text-sm font-medium">No clients found</p>
                              <p className="text-xs">
                                {searchQuery ? "Try adjusting your search query" : "Get started by adding your first client"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        clients.map((client) => (
                          <TableRow
                            key={client.id}
                            className="group hover:bg-muted/30 transition-colors border-b border-border/30"
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedClients.has(client.id)}
                                onCheckedChange={(checked) =>
                                  handleSelect(client.id, checked as boolean)
                                }
                                aria-label={`Select ${client.full_name}`}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px]">
                              <div className="truncate" title={client.full_name}>
                                {client.full_name}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[250px]">
                              <div className="truncate" title={client.full_address}>
                                {client.full_address}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[180px]">
                              {client.email ? (
                                <a
                                  href={`mailto:${client.email}`}
                                  className="text-primary hover:underline transition-colors truncate block"
                                  title={client.email}
                                >
                                  {client.email}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[150px]">
                              {client.contact_number ? (
                                <a
                                  href={`tel:${client.contact_number}`}
                                  className="text-primary hover:underline transition-colors truncate block"
                                  title={client.contact_number}
                                >
                                  {client.contact_number}
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
                                    onClick={() => handleView(client)}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(client)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(client)}
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
                      Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} clients
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
                        <User className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold">
                        {editingClient ? "Edit Client" : "Add New Client"}
                      </DialogTitle>
                      <DialogDescription className="text-sm">
                        {editingClient
                          ? "Update the client information below"
                          : "Enter the client information to add to the system"}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSave)} className="relative space-y-5 py-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10 text-blue-400">1</span>
                        Basic Information
                      </div>
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">
                              Full Name *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter full name..."
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
                        name="full_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">
                              Full Address *
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter full address..."
                                {...field}
                                rows={3}
                                className="resize-none bg-muted/30 border-border/40 focus:border-blue-500/50 focus:ring-blue-500/20"
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
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">
                                Email
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="Enter email address..."
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
                          name="contact_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-muted-foreground">
                                Contact Number
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  placeholder="Enter contact number..."
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
                          setEditingClient(null)
                          form.reset()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/25 text-white px-6"
                      >
                        {editingClient ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Update Client
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Client
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
                          <User className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <DrawerTitle>
                          {viewingClient?.full_name}
                        </DrawerTitle>
                        <DrawerDescription>
                          Complete client information and details
                        </DrawerDescription>
                      </div>
                    </div>
                  </DrawerHeader>
                  {viewingClient && (
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
                      <div className="space-y-4">
                        {/* Client Information Card */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <User className="h-5 w-5 text-primary" />
                              Client Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block">
                                Full Name
                              </Label>
                              <p className="text-sm font-medium break-words">
                                {viewingClient.full_name}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Full Address
                              </Label>
                              <p className="text-sm font-medium break-words">
                                {viewingClient.full_address}
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Contact Information Card */}
                        <Card className="rounded-xl border border-border/30 bg-muted/20 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Mail className="h-5 w-5 text-primary" />
                              Contact Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                Email Address
                              </Label>
                              {viewingClient.email ? (
                                <a
                                  href={`mailto:${viewingClient.email}`}
                                  className="text-sm font-medium text-primary hover:underline break-all"
                                >
                                  {viewingClient.email}
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">Not provided</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                Contact Number
                              </Label>
                              {viewingClient.contact_number ? (
                                <a
                                  href={`tel:${viewingClient.contact_number}`}
                                  className="text-sm font-medium text-primary hover:underline break-all"
                                >
                                  {viewingClient.contact_number}
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">Not provided</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>


                        {/* Metadata Card */}
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
                                  {new Date(viewingClient.created_at).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                  Updated At
                                </Label>
                                <p className="text-sm font-medium">
                                  {new Date(viewingClient.updated_at).toLocaleString()}
                                </p>
                              </div>
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
                          if (viewingClient) {
                            handleEdit(viewingClient)
                            setViewDrawerOpen(false)
                          }
                        }}
                        className="flex-1 gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Client
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
                    Delete Client
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-foreground">
                      {clientToDelete?.full_name}
                    </span>
                    ? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false)
                      setClientToDelete(null)
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

export default function ClientsPage() {
  return <ClientsContent />
}

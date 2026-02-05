"use client"

import * as React from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SidebarCategoryProvider } from "@/contexts/sidebar-context"
import { HeaderNav } from "@/components/dashboard/header-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Loader2,
  DollarSign,
  Plane,
  UtensilsCrossed,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { apiCallJson } from "@/lib/api-client"

interface Caterer {
  id: number
  caterer_name: string
}

interface Airport {
  id: number
  airport_name: string
  airport_code_iata?: string
  airport_code_icao?: string
}

interface CatererAirportFee {
  id: number
  caterer_id: number
  airport_id: number
  delivery_fee: number
  caterer_name?: string
  airport_name?: string
}

function DeliveryFeesContent() {
  const [fees, setFees] = React.useState<CatererAirportFee[]>([])
  const [caterers, setCaterers] = React.useState<Caterer[]>([])
  const [airports, setAirports] = React.useState<Airport[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingFee, setEditingFee] = React.useState<CatererAirportFee | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [feeToDelete, setFeeToDelete] = React.useState<CatererAirportFee | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Form state
  const [selectedCaterer, setSelectedCaterer] = React.useState<string>("")
  const [selectedAirport, setSelectedAirport] = React.useState<string>("")
  const [deliveryFeeAmount, setDeliveryFeeAmount] = React.useState("")

  const fetchFees = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiCallJson<{ fees: CatererAirportFee[] }>("/caterer-airport-fees")
      setFees(data.fees || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch delivery fees"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCaterers = async () => {
    try {
      const data = await apiCallJson<{ caterers: Caterer[] }>("/caterers?limit=1000")
      setCaterers(data.caterers || [])
    } catch (err) {
      console.error("Failed to fetch caterers:", err)
    }
  }

  const fetchAirports = async () => {
    try {
      const data = await apiCallJson<{ airports: Airport[] }>("/airports?limit=1000")
      setAirports(data.airports || [])
    } catch (err) {
      console.error("Failed to fetch airports:", err)
    }
  }

  React.useEffect(() => {
    fetchFees()
    fetchCaterers()
    fetchAirports()
  }, [])

  const filteredFees = React.useMemo(() => {
    if (!searchQuery) return fees
    const query = searchQuery.toLowerCase()
    return fees.filter(
      (fee) =>
        fee.caterer_name?.toLowerCase().includes(query) ||
        fee.airport_name?.toLowerCase().includes(query)
    )
  }, [fees, searchQuery])

  const handleAdd = () => {
    setEditingFee(null)
    setSelectedCaterer("")
    setSelectedAirport("")
    setDeliveryFeeAmount("")
    setDialogOpen(true)
  }

  const handleEdit = (fee: CatererAirportFee) => {
    setEditingFee(fee)
    setSelectedCaterer(fee.caterer_id.toString())
    setSelectedAirport(fee.airport_id.toString())
    setDeliveryFeeAmount(fee.delivery_fee.toString())
    setDialogOpen(true)
  }

  const handleDelete = (fee: CatererAirportFee) => {
    setFeeToDelete(fee)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!feeToDelete) return
    setIsDeleting(true)
    try {
      await apiCallJson(`/caterer-airport-fees/${feeToDelete.id}`, {
        method: "DELETE",
      })
      toast.success("Delivery fee deleted", {
        description: `Fee for ${feeToDelete.caterer_name} - ${feeToDelete.airport_name} has been deleted.`,
      })
      setDeleteDialogOpen(false)
      setFeeToDelete(null)
      fetchFees()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete fee"
      toast.error("Error deleting fee", { description: errorMessage })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!selectedCaterer || !selectedAirport || !deliveryFeeAmount) {
      toast.error("Please fill all fields")
      return
    }

    const feeValue = parseFloat(deliveryFeeAmount)
    if (isNaN(feeValue) || feeValue < 0) {
      toast.error("Please enter a valid delivery fee")
      return
    }

    setIsSaving(true)
    try {
      if (editingFee) {
        // Update existing fee
        await apiCallJson(`/caterer-airport-fees/${editingFee.id}`, {
          method: "PUT",
          body: JSON.stringify({ delivery_fee: feeValue }),
        })
        toast.success("Delivery fee updated")
      } else {
        // Create new fee (upsert)
        await apiCallJson("/caterer-airport-fees/upsert", {
          method: "PUT",
          body: JSON.stringify({
            caterer_id: parseInt(selectedCaterer),
            airport_id: parseInt(selectedAirport),
            delivery_fee: feeValue,
          }),
        })
        toast.success("Delivery fee saved")
      }
      setDialogOpen(false)
      fetchFees()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save fee"
      toast.error("Error saving fee", { description: errorMessage })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <HeaderNav title="Delivery Fees" />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {/* Header Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <DollarSign className="h-6 w-6 text-primary" />
                      Caterer-Airport Delivery Fees
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Manage delivery fees for specific caterer and airport combinations
                    </CardDescription>
                  </div>
                  <Button onClick={handleAdd} className="gap-2 shadow-md">
                    <Plus className="h-4 w-4" />
                    Add Fee
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by caterer or airport..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9 h-10 bg-background/50"
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
                    <p className="font-medium">Error loading delivery fees</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchFees} className="mt-4">
                    <Loader2 className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Table Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
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
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            Delivery Fee
                          </div>
                        </TableHead>
                        <TableHead className="w-24 text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                          </TableRow>
                        ))
                      ) : filteredFees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <DollarSign className="h-8 w-8 opacity-50" />
                              <p className="text-sm font-medium">No delivery fees found</p>
                              <p className="text-xs">
                                {searchQuery
                                  ? "Try adjusting your search"
                                  : "Add a fee to get started"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredFees.map((fee) => (
                          <TableRow key={fee.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium">{fee.caterer_name || `Caterer #${fee.caterer_id}`}</TableCell>
                            <TableCell>{fee.airport_name || `Airport #${fee.airport_id}`}</TableCell>
                            <TableCell className="font-mono">${fee.delivery_fee.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(fee)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(fee)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingFee ? "Edit Delivery Fee" : "Add Delivery Fee"}</DialogTitle>
                  <DialogDescription>
                    Set the delivery fee for a specific caterer and airport combination.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="caterer">Caterer</Label>
                    <Select
                      value={selectedCaterer}
                      onValueChange={setSelectedCaterer}
                      disabled={!!editingFee}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a caterer" />
                      </SelectTrigger>
                      <SelectContent>
                        {caterers.map((caterer) => (
                          <SelectItem key={caterer.id} value={caterer.id.toString()}>
                            {caterer.caterer_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="airport">Airport</Label>
                    <Select
                      value={selectedAirport}
                      onValueChange={setSelectedAirport}
                      disabled={!!editingFee}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an airport" />
                      </SelectTrigger>
                      <SelectContent>
                        {airports.map((airport) => (
                          <SelectItem key={airport.id} value={airport.id.toString()}>
                            {airport.airport_name}
                            {airport.airport_code_icao && ` (${airport.airport_code_icao})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fee">Delivery Fee ($)</Label>
                    <Input
                      id="fee"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={deliveryFeeAmount}
                      onChange={(e) => setDeliveryFeeAmount(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingFee ? "Update" : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete Delivery Fee</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete the delivery fee for{" "}
                    <strong>{feeToDelete?.caterer_name}</strong> -{" "}
                    <strong>{feeToDelete?.airport_name}</strong>? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                    {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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

export default function DeliveryFeesPage() {
  return <DeliveryFeesContent />
}

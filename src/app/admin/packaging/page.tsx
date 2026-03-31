"use client"

import * as React from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SidebarCategoryProvider } from "@/contexts/sidebar-context"
import { HeaderNav } from "@/components/dashboard/header-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, Trash2, Edit, Loader2, Package } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

interface PackagingOption {
  id: number
  name: string
  is_active: boolean
  created_at: string
}

function PackagingContent() {
  const [options, setOptions] = React.useState<PackagingOption[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [editingOption, setEditingOption] = React.useState<PackagingOption | null>(null)
  const [editName, setEditName] = React.useState("")
  const [deleteTarget, setDeleteTarget] = React.useState<PackagingOption | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const fetchOptions = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/packaging-options?is_active=false`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setOptions(data.packaging_options || [])
    } catch {
      toast.error("Failed to load packaging options")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => { fetchOptions() }, [fetchOptions])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/packaging-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create")
      }
      setNewName("")
      toast.success("Packaging option added")
      fetchOptions()
    } catch (err: any) {
      toast.error(err.message || "Failed to add packaging option")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editingOption || !editName.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/packaging-options/${editingOption.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update")
      }
      setEditingOption(null)
      toast.success("Packaging option updated")
      fetchOptions()
    } catch (err: any) {
      toast.error(err.message || "Failed to update packaging option")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (option: PackagingOption) => {
    try {
      const res = await fetch(`${API_BASE_URL}/packaging-options/${option.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !option.is_active }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast.success(`Packaging option ${option.is_active ? "deactivated" : "activated"}`)
      fetchOptions()
    } catch {
      toast.error("Failed to update packaging option")
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`${API_BASE_URL}/packaging-options/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      setDeleteTarget(null)
      toast.success("Packaging option deleted")
      fetchOptions()
    } catch {
      toast.error("Failed to delete packaging option")
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Packaging Options</h1>
          <p className="text-sm text-muted-foreground">Manage reusable packaging preferences for order items</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add new packaging option</CardTitle>
          <CardDescription>These will appear as autocomplete suggestions on order line items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="e.g. Chafing Dish, Foil Tray, Insulated Box..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
              className="max-w-sm"
            />
            <Button onClick={handleAdd} disabled={isSaving || !newName.trim()} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : options.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No packaging options yet. Add one above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {options.map((opt) => (
                  <TableRow key={opt.id}>
                    <TableCell className="font-medium">{opt.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={opt.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleToggleActive(opt)}
                      >
                        {opt.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setEditingOption(opt); setEditName(opt.name) }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(opt)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editingOption} onOpenChange={(open) => { if (!open) setEditingOption(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit packaging option</DialogTitle>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleEdit() }}
            placeholder="Packaging name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOption(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSaving || !editName.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete packaging option?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted. This won&apos;t affect existing orders.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PackagingPage() {
  return (
    <SidebarCategoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <HeaderNav title="Packaging Options" />
          <PackagingContent />
        </SidebarInset>
      </SidebarProvider>
    </SidebarCategoryProvider>
  )
}

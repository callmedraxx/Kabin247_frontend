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
  MoreHorizontal,
  Mail,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit,
  UserCog,
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
import { apiCallJson } from "@/lib/api-client"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

// Employee data structure matching API response
interface Employee {
  id: number
  email: string
  role: "ADMIN" | "CSR"
  is_active: boolean
  permissions: {
    "orders.read"?: boolean
    "orders.update_status"?: boolean
    [key: string]: boolean | undefined
  } | null
  created_at: string
  updated_at: string
}

// API Response types
interface EmployeesResponse {
  employees: Employee[]
}

// Form schema for inviting employee
const inviteEmployeeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  permissions: z.object({
    "orders.read": z.boolean(),
    "orders.update_status": z.boolean(),
  }),
})

type InviteEmployeeFormValues = z.infer<typeof inviteEmployeeSchema>

// Form schema for updating permissions
const updatePermissionsSchema = z.object({
  permissions: z.object({
    "orders.read": z.boolean(),
    "orders.update_status": z.boolean(),
  }),
})

type UpdatePermissionsFormValues = z.infer<typeof updatePermissionsSchema>

function EmployeesContent() {
  const router = useRouter()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = React.useState(false)
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null)
  const [isInviting, setIsInviting] = React.useState(false)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [isDeactivating, setIsDeactivating] = React.useState(false)

  const inviteForm = useForm<InviteEmployeeFormValues>({
    resolver: zodResolver(inviteEmployeeSchema),
    defaultValues: {
      email: "",
      permissions: {
        "orders.read": false,
        "orders.update_status": false,
      },
    },
  })

  const permissionsForm = useForm<UpdatePermissionsFormValues>({
    resolver: zodResolver(updatePermissionsSchema),
    defaultValues: {
      permissions: {
        "orders.read": false,
        "orders.update_status": false,
      },
    },
  })

  // Redirect if not admin
  React.useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access denied", {
        description: "Only administrators can access this page.",
      })
      router.push("/admin/dashboard")
    }
  }, [isAdmin, authLoading, router])

  // Fetch employees from API
  const fetchEmployees = React.useCallback(async () => {
    if (!isAdmin) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await apiCallJson<EmployeesResponse>("/employees")
      setEmployees(data.employees)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch employees"
      setError(errorMessage)
      toast.error("Error", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }, [isAdmin])

  React.useEffect(() => {
    if (isAdmin) {
      fetchEmployees()
    }
  }, [fetchEmployees, isAdmin])

  // Handle invite employee
  const handleInvite = async (data: InviteEmployeeFormValues) => {
    setIsInviting(true)
    try {
      await apiCallJson("/employees/invite", {
        method: "POST",
        body: JSON.stringify(data),
      })

      toast.success("Invitation sent", {
        description: `An invitation email has been sent to ${data.email}`,
      })

      setInviteDialogOpen(false)
      inviteForm.reset()
      fetchEmployees()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send invitation"
      toast.error("Error", {
        description: errorMessage,
      })
    } finally {
      setIsInviting(false)
    }
  }

  // Handle update permissions
  const handleUpdatePermissions = async (data: UpdatePermissionsFormValues) => {
    if (!editingEmployee) return

    setIsUpdating(true)
    try {
      await apiCallJson(`/employees/${editingEmployee.id}/permissions`, {
        method: "PATCH",
        body: JSON.stringify(data),
      })

      toast.success("Permissions updated", {
        description: `Permissions for ${editingEmployee.email} have been updated.`,
      })

      setPermissionsDialogOpen(false)
      setEditingEmployee(null)
      permissionsForm.reset()
      fetchEmployees()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update permissions"
      toast.error("Error", {
        description: errorMessage,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle deactivate/reactivate
  const handleToggleActive = async (employee: Employee) => {
    const isActivating = !employee.is_active
    setIsDeactivating(true)

    try {
      const endpoint = isActivating
        ? `/employees/${employee.id}/reactivate`
        : `/employees/${employee.id}/deactivate`

      await apiCallJson(endpoint, {
        method: "POST",
      })

      toast.success(isActivating ? "Employee reactivated" : "Employee deactivated", {
        description: `${employee.email} has been ${isActivating ? "reactivated" : "deactivated"}.`,
      })

      fetchEmployees()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update employee status"
      toast.error("Error", {
        description: errorMessage,
      })
    } finally {
      setIsDeactivating(false)
    }
  }

  // Open permissions dialog
  const openPermissionsDialog = (employee: Employee) => {
    setEditingEmployee(employee)
    permissionsForm.reset({
      permissions: {
        "orders.read": employee.permissions?.["orders.read"] ?? false,
        "orders.update_status": employee.permissions?.["orders.update_status"] ?? false,
      },
    })
    setPermissionsDialogOpen(true)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return null // Will redirect in useEffect
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <HeaderNav title="Employees" />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Employee Management</h1>
              <p className="text-muted-foreground">
                Manage employee accounts and permissions
              </p>
            </div>
            <Button onClick={() => setInviteDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite Employee
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>
                List of all CSR employees and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No employees found. Invite your first employee to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {employee.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                            {employee.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          {employee.is_active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <XCircle className="h-4 w-4" />
                              Inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {employee.permissions?.["orders.read"] && (
                              <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">
                                Read Orders
                              </span>
                            )}
                            {employee.permissions?.["orders.update_status"] && (
                              <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                                Update Status
                              </span>
                            )}
                            {!employee.permissions ||
                              (Object.values(employee.permissions).every((v) => !v) && (
                                <span className="text-xs text-muted-foreground">No permissions</span>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openPermissionsDialog(employee)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Permissions
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(employee)}
                                disabled={isDeactivating}
                              >
                                {employee.is_active ? (
                                  <>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Reactivate
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {/* Invite Employee Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Employee</DialogTitle>
            <DialogDescription>
              Send an invitation email to a new employee. They will receive a link to create their account.
            </DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(handleInvite)} className="space-y-4">
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="employee@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <FormLabel>Permissions</FormLabel>
                <FormField
                  control={inviteForm.control}
                  name="permissions.orders.read"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">Read Orders</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Allow employee to view orders
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={inviteForm.control}
                  name="permissions.orders.update_status"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">Update Order Status</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Allow employee to update order status (except "paid")
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteDialogOpen(false)}
                  disabled={isInviting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isInviting}>
                  {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Update Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Permissions</DialogTitle>
            <DialogDescription>
              Update permissions for {editingEmployee?.email}
            </DialogDescription>
          </DialogHeader>
          <Form {...permissionsForm}>
            <form
              onSubmit={permissionsForm.handleSubmit(handleUpdatePermissions)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <FormLabel>Permissions</FormLabel>
                <FormField
                  control={permissionsForm.control}
                  name="permissions.orders.read"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">Read Orders</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Allow employee to view orders
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={permissionsForm.control}
                  name="permissions.orders.update_status"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">Update Order Status</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Allow employee to update order status (except "paid")
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPermissionsDialogOpen(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Permissions
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

export default function EmployeesPage() {
  return (
    <SidebarCategoryProvider>
      <EmployeesContent />
    </SidebarCategoryProvider>
  )
}


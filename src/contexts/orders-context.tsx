"use client"

import * as React from "react"
import { useOffline } from "./offline-context"
import { apiCallJson, apiCall } from "@/lib/api-client"
import {
  getAllOrders,
  saveOrders,
  getOrderByLocalId,
  getOrderByServerId,
} from "@/lib/pwa/db"
import {
  createOfflineOrder,
  updateOfflineOrder,
  deleteOfflineOrder,
  cacheOrdersFromServer,
  cachedOrderToOrder,
} from "@/lib/pwa/sync-queue"
import type {
  Order,
  CachedOrder,
  SyncStatus,
  OrderItem,
} from "@/lib/pwa/types"

// Extended order type with sync information
export interface OrderWithSync extends Order {
  _syncStatus?: SyncStatus
  _localId?: string
  _isPending?: boolean
}

interface OrdersResponse {
  orders: Order[]
  total: number
  page?: number
  limit: number
}

interface OrdersContextType {
  orders: OrderWithSync[]
  isLoading: boolean
  error: string | null
  totalOrders: number
  fetchOrders: (params?: FetchOrdersParams) => Promise<void>
  getOrder: (idOrLocalId: number | string) => Promise<OrderWithSync | null>
  createOrder: (
    orderData: CreateOrderData
  ) => Promise<OrderWithSync | null>
  updateOrder: (
    idOrLocalId: number | string,
    updates: Partial<Order>
  ) => Promise<OrderWithSync | null>
  deleteOrder: (idOrLocalId: number | string) => Promise<boolean>
  refreshFromCache: () => Promise<void>
}

interface FetchOrdersParams {
  page?: number
  limit?: number
  status?: string
  search?: string
  clientId?: number
  fromDate?: string
  toDate?: string
  isArchived?: boolean
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

interface CreateOrderData {
  client_id: number
  caterer_id: number
  airport_id: number
  fbo_id?: number | null
  aircraft_tail_number?: string | null
  delivery_date: string
  delivery_time: string
  status?: string
  order_priority?: string
  order_type?: string | null
  payment_method?: string
  description?: string | null
  notes?: string | null
  reheating_instructions?: string | null
  packaging_instructions?: string | null
  dietary_restrictions?: string | null
  service_charge?: string | number
  delivery_fee?: string | number | null
  coordination_fee?: string | number | null
  airport_fee?: string | number | null
  fbo_fee?: string | number | null
  shopping_fee?: string | number | null
  restaurant_pickup_fee?: string | number | null
  airport_pickup_fee?: string | number | null
  items?: OrderItem[]
}

const OrdersContext = React.createContext<OrdersContextType | undefined>(
  undefined
)

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { isOnline, isOfflineCapable, triggerSync } = useOffline()
  const [orders, setOrders] = React.useState<OrderWithSync[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [totalOrders, setTotalOrders] = React.useState(0)

  // Convert CachedOrder to OrderWithSync
  const cachedToOrderWithSync = (cached: CachedOrder): OrderWithSync => {
    const order = cachedOrderToOrder(cached)
    return {
      ...order,
      _syncStatus: cached._syncStatus,
      _localId: cached._localId,
      _isPending:
        cached._syncStatus === "pending_create" ||
        cached._syncStatus === "pending_update" ||
        cached._syncStatus === "pending_delete",
    }
  }

  // Fetch orders from API or cache
  const fetchOrders = React.useCallback(
    async (params: FetchOrdersParams = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        if (isOnline) {
          // Try to fetch from server
          const queryParams = new URLSearchParams()
          if (params.page) queryParams.append("page", params.page.toString())
          if (params.limit) queryParams.append("limit", params.limit.toString())
          if (params.status) queryParams.append("status", params.status)
          if (params.search) queryParams.append("search", params.search)
          if (params.clientId)
            queryParams.append("client_id", params.clientId.toString())
          if (params.fromDate) queryParams.append("from_date", params.fromDate)
          if (params.toDate) queryParams.append("to_date", params.toDate)
          if (params.isArchived !== undefined)
            queryParams.append("is_archived", params.isArchived.toString())
          if (params.sortBy) queryParams.append("sortBy", params.sortBy)
          if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder)

          const response = await apiCallJson<OrdersResponse>(
            `/orders?${queryParams.toString()}`
          )

          // Cache orders to IndexedDB
          if (isOfflineCapable && response.orders) {
            await cacheOrdersFromServer(response.orders)
          }

          // Get any local-only orders (pending_create) and merge
          let mergedOrders: OrderWithSync[] = response.orders.map((order) => ({
            ...order,
            _syncStatus: "synced" as SyncStatus,
          }))

          if (isOfflineCapable) {
            const cachedOrders = await getAllOrders()
            const pendingOrders = cachedOrders.filter(
              (o) => o._syncStatus === "pending_create"
            )

            // Add pending orders that aren't on server yet
            mergedOrders = [
              ...pendingOrders.map(cachedToOrderWithSync),
              ...mergedOrders,
            ]
          }

          setOrders(mergedOrders)
          setTotalOrders(response.total + (mergedOrders.length - response.orders.length))
        } else if (isOfflineCapable) {
          // Offline: fetch from IndexedDB
          const cachedOrders = await getAllOrders()

          // Apply filters locally
          let filtered = cachedOrders

          if (params.status) {
            filtered = filtered.filter((o) => o.status === params.status)
          }
          if (params.search) {
            const searchLower = params.search.toLowerCase()
            filtered = filtered.filter(
              (o) =>
                o.order_number.toLowerCase().includes(searchLower) ||
                o.client?.full_name?.toLowerCase().includes(searchLower) ||
                o.caterer_details?.caterer_name
                  ?.toLowerCase()
                  .includes(searchLower)
            )
          }
          if (params.clientId) {
            filtered = filtered.filter((o) => o.client_id === params.clientId)
          }
          if (params.fromDate) {
            filtered = filtered.filter((o) => o.delivery_date >= params.fromDate!)
          }
          if (params.toDate) {
            filtered = filtered.filter((o) => o.delivery_date <= params.toDate!)
          }
          if (params.isArchived !== undefined) {
            filtered = filtered.filter(
              (o) => (o.is_archived || false) === params.isArchived
            )
          }

          // Sort by specified field or default to delivery_date descending
          const sortBy = params.sortBy || "delivery_date"
          const sortOrder = params.sortOrder || "desc"
          
          filtered.sort((a, b) => {
            let aValue: any
            let bValue: any
            
            // Get the values to compare based on sortBy field
            switch (sortBy) {
              case "order_number":
                aValue = a.order_number || ""
                bValue = b.order_number || ""
                break
              case "client_name":
                aValue = a.client?.full_name || ""
                bValue = b.client?.full_name || ""
                break
              case "delivery_date":
                aValue = new Date(a.delivery_date || "").getTime()
                bValue = new Date(b.delivery_date || "").getTime()
                break
              case "created_at":
                aValue = new Date(a.created_at || "").getTime()
                bValue = new Date(b.created_at || "").getTime()
                break
              default:
                // Default to delivery_date
                aValue = new Date(a.delivery_date || "").getTime()
                bValue = new Date(b.delivery_date || "").getTime()
            }
            
            // Compare values based on sort order
            if (sortOrder === "asc") {
              return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
            } else {
              return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
            }
          })

          // Apply pagination
          const page = params.page || 1
          const limit = params.limit || 20
          const start = (page - 1) * limit
          const paginated = filtered.slice(start, start + limit)

          setOrders(paginated.map(cachedToOrderWithSync))
          setTotalOrders(filtered.length)
        } else {
          setError("Offline mode not available")
        }
      } catch (err) {
        console.error("Error fetching orders:", err)

        // Fall back to cache if online request fails
        if (isOfflineCapable) {
          const cachedOrders = await getAllOrders()
          setOrders(cachedOrders.map(cachedToOrderWithSync))
          setTotalOrders(cachedOrders.length)
          setError("Using cached data (server unavailable)")
        } else {
          setError(err instanceof Error ? err.message : "Failed to fetch orders")
        }
      } finally {
        setIsLoading(false)
      }
    },
    [isOnline, isOfflineCapable]
  )

  // Get single order
  const getOrder = React.useCallback(
    async (idOrLocalId: number | string): Promise<OrderWithSync | null> => {
      try {
        // First check local cache
        if (isOfflineCapable) {
          let cached: CachedOrder | undefined

          if (typeof idOrLocalId === "string") {
            cached = await getOrderByLocalId(idOrLocalId)
          } else {
            cached = await getOrderByServerId(idOrLocalId)
          }

          // If offline or order is pending, return cached version
          if (cached && (!isOnline || cached._syncStatus !== "synced")) {
            return cachedToOrderWithSync(cached)
          }
        }

        // Fetch from server if online
        if (isOnline && typeof idOrLocalId === "number") {
          const response = await apiCallJson<{ order: Order }>(
            `/orders/${idOrLocalId}`
          )
          if (response.order) {
            // Update cache
            if (isOfflineCapable) {
              await cacheOrdersFromServer([response.order])
            }
            return {
              ...response.order,
              _syncStatus: "synced",
            }
          }
        }

        return null
      } catch (err) {
        console.error("Error getting order:", err)
        return null
      }
    },
    [isOnline, isOfflineCapable]
  )

  // Create order (online or offline)
  const createOrder = React.useCallback(
    async (orderData: CreateOrderData): Promise<OrderWithSync | null> => {
      try {
        if (isOnline) {
          // Create on server
          const response = await apiCallJson<{ order: Order }>("/orders", {
            method: "POST",
            body: JSON.stringify(orderData),
          })

          if (response.order) {
            // Cache the new order
            if (isOfflineCapable) {
              await cacheOrdersFromServer([response.order])
            }
            return {
              ...response.order,
              _syncStatus: "synced",
            }
          }
        } else if (isOfflineCapable) {
          // Create offline
          const cached = await createOfflineOrder({
            ...orderData,
            status: orderData.status || "new",
            order_priority: orderData.order_priority || "normal",
            payment_method: orderData.payment_method || "card",
            service_charge: orderData.service_charge || 0,
            subtotal: 0, // Will be calculated
            total: 0, // Will be calculated
          } as Omit<Order, "id" | "order_number" | "created_at" | "updated_at">)

          return cachedToOrderWithSync(cached)
        }

        return null
      } catch (err) {
        console.error("Error creating order:", err)
        throw err
      }
    },
    [isOnline, isOfflineCapable]
  )

  // Update order (online or offline)
  const updateOrder = React.useCallback(
    async (
      idOrLocalId: number | string,
      updates: Partial<Order>
    ): Promise<OrderWithSync | null> => {
      try {
        // Get the current order from cache
        let cached: CachedOrder | undefined

        if (isOfflineCapable) {
          if (typeof idOrLocalId === "string") {
            cached = await getOrderByLocalId(idOrLocalId)
          } else {
            cached = await getOrderByServerId(idOrLocalId)
          }
        }

        if (isOnline && cached && cached._syncStatus === "synced") {
          // Update on server
          const response = await apiCallJson<{ order: Order }>(
            `/orders/${cached.id}`,
            {
              method: "PUT",
              body: JSON.stringify(updates),
            }
          )

          if (response.order) {
            // Update cache
            if (isOfflineCapable) {
              await cacheOrdersFromServer([response.order])
            }
            return {
              ...response.order,
              _syncStatus: "synced",
            }
          }
        } else if (isOfflineCapable && cached) {
          // Update offline
          const updated = await updateOfflineOrder(cached._localId, updates)
          if (updated) {
            return cachedToOrderWithSync(updated)
          }
        }

        return null
      } catch (err) {
        console.error("Error updating order:", err)

        // If online update fails, try offline update
        if (isOfflineCapable) {
          let cached: CachedOrder | undefined
          if (typeof idOrLocalId === "string") {
            cached = await getOrderByLocalId(idOrLocalId)
          } else {
            cached = await getOrderByServerId(idOrLocalId)
          }

          if (cached) {
            const updated = await updateOfflineOrder(cached._localId, updates)
            if (updated) {
              return cachedToOrderWithSync(updated)
            }
          }
        }

        throw err
      }
    },
    [isOnline, isOfflineCapable]
  )

  // Delete order (online or offline)
  const deleteOrder = React.useCallback(
    async (idOrLocalId: number | string): Promise<boolean> => {
      try {
        let cached: CachedOrder | undefined

        if (isOfflineCapable) {
          if (typeof idOrLocalId === "string") {
            cached = await getOrderByLocalId(idOrLocalId)
          } else {
            cached = await getOrderByServerId(idOrLocalId)
          }
        }

        if (isOnline && cached && cached._syncStatus === "synced") {
          // Delete on server
          await apiCall(`/orders/${cached.id}`, { method: "DELETE" })

          // Remove from cache
          if (isOfflineCapable && cached) {
            await deleteOfflineOrder(cached._localId)
          }
          return true
        } else if (isOfflineCapable && cached) {
          // Delete offline (or mark for deletion)
          return deleteOfflineOrder(cached._localId)
        }

        return false
      } catch (err) {
        console.error("Error deleting order:", err)
        throw err
      }
    },
    [isOnline, isOfflineCapable]
  )

  // Refresh orders from cache (useful after sync)
  const refreshFromCache = React.useCallback(async () => {
    if (!isOfflineCapable) return

    const cachedOrders = await getAllOrders()
    setOrders(cachedOrders.map(cachedToOrderWithSync))
    setTotalOrders(cachedOrders.length)
  }, [isOfflineCapable])

  // Listen for sync events to refresh data
  React.useEffect(() => {
    function handleSyncEvent(event: CustomEvent) {
      const { type } = event.detail
      if (
        type === "sync:completed" ||
        type === "order:created" ||
        type === "order:updated"
      ) {
        refreshFromCache()
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("pwa:sync", handleSyncEvent as EventListener)
      return () => {
        window.removeEventListener("pwa:sync", handleSyncEvent as EventListener)
      }
    }
  }, [refreshFromCache])

  return (
    <OrdersContext.Provider
      value={{
        orders,
        isLoading,
        error,
        totalOrders,
        fetchOrders,
        getOrder,
        createOrder,
        updateOrder,
        deleteOrder,
        refreshFromCache,
      }}
    >
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const context = React.useContext(OrdersContext)
  if (!context) {
    throw new Error("useOrders must be used within OrdersProvider")
  }
  return context
}

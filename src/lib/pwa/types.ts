// PWA-specific type definitions

// Sync status for offline-capable entities
export type SyncStatus =
  | "synced"
  | "pending_create"
  | "pending_update"
  | "pending_delete"
  | "conflict"

// Order item structure
export interface OrderItem {
  id?: number
  order_id?: number
  menu_item_id?: number
  item_name: string
  item_description?: string | null
  portion_size: string
  price: string | number
  sort_order?: number
  created_at?: string
}

// Client embedded in order
export interface OrderClient {
  id: number
  full_name: string
  full_address: string
  email: string
  contact_number: string
  additional_emails?: string[]
}

// Caterer embedded in order
export interface OrderCaterer {
  id: number
  caterer_name: string
  caterer_number: string
  caterer_email: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
  additional_emails?: string[]
}

// Airport embedded in order
export interface OrderAirport {
  id: number
  airport_name: string
  fbo_name: string
  fbo_email: string | null
  fbo_phone: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
}

// Order status type
export type OrderStatus =
  | "new"
  | "in_progress"
  | "menu_selection"
  | "quote_pending"
  | "quote_approved"
  | "caterer_confirmed"
  | "ready_for_pickup"
  | "delivered"
  | "completed"
  | "cancelled"

// Order priority type
export type OrderPriority = "low" | "normal" | "high" | "urgent"

// Order type
export type OrderType = "inflight" | "qe_serv_hub" | "restaurant_pickup"

// Payment method type
export type PaymentMethod = "card" | "ACH"

// Base order structure (from API)
export interface Order {
  id: number
  order_number: string
  client_id: number
  caterer_id: number
  airport_id: number
  fbo_id?: number | null
  aircraft_tail_number: string | null
  delivery_date: string
  delivery_time: string
  status: OrderStatus
  order_priority: string
  order_type: string | null
  payment_method: string
  description: string | null
  notes: string | null
  reheating_instructions: string | null
  packaging_instructions: string | null
  dietary_restrictions: string | null
  service_charge: string | number
  delivery_fee: string | number | null
  coordination_fee?: string | number | null
  airport_fee?: string | number | null
  fbo_fee?: string | number | null
  shopping_fee?: string | number | null
  restaurant_pickup_fee?: string | number | null
  airport_pickup_fee?: string | number | null
  subtotal: string | number
  total: string | number
  items?: OrderItem[]
  client?: OrderClient
  caterer_details?: OrderCaterer
  airport_details?: OrderAirport
  is_archived?: boolean
  created_at: string
  updated_at: string
  completed_at?: string | null
}

// Cached order with sync metadata
export interface CachedOrder extends Order {
  _syncStatus: SyncStatus
  _localId: string // UUID for offline-created orders
  _version: number // For conflict detection
  _lastSyncedAt?: string
  _pendingChanges?: Partial<Order> // Store pending changes for conflict resolution
  _serverVersion?: Order // Store server version for conflict resolution
}

// Sync queue operation
export interface SyncQueueItem {
  id: string // UUID
  type: "create" | "update" | "delete"
  entityType: "order" | "client" | "caterer" | "airport" | "fbo" | "menuItem"
  entityId: string // Local ID for creates, server ID for updates/deletes
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  lastAttemptAt?: string
  error?: string
}

// Client for caching
export interface Client {
  id: number
  full_name: string
  full_address: string
  email: string | null
  contact_number: string | null
  airport_code: string | null
  fbo_name: string | null
  additional_emails?: string[]
}

// Caterer for caching
export interface Caterer {
  id: number
  caterer_name: string
  caterer_number: string
  caterer_email: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
  additional_emails?: string[]
}

// Airport for caching
export interface Airport {
  id: number
  airport_name: string
  fbo_name: string
  airport_code_iata: string | null
  airport_code_icao: string | null
}

// FBO for caching
export interface FBO {
  id: number
  fbo_name: string
  fbo_email: string | null
  fbo_phone: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
  airport_name: string | null
}

// Menu item variant
export interface MenuItemVariant {
  id: number
  menu_item_id?: number
  portion_size: string
  price: number
  sort_order?: number
  caterer_prices?: Array<{
    caterer_id: number
    price: number
  }>
}

// Menu item for caching
export interface MenuItem {
  id: number
  item_name: string
  item_description: string | null
  category: string
  variants: MenuItemVariant[]
}

// Cache metadata
export interface CacheMetadata {
  key: string
  lastUpdated: string
  expiresAt: string
}

// Cache duration constants (in milliseconds)
export const CACHE_DURATIONS = {
  clients: 24 * 60 * 60 * 1000, // 24 hours
  caterers: 24 * 60 * 60 * 1000, // 24 hours
  airports: 7 * 24 * 60 * 60 * 1000, // 7 days
  fbos: 24 * 60 * 60 * 1000, // 24 hours
  menuItems: 12 * 60 * 60 * 1000, // 12 hours
  orders: 60 * 60 * 1000, // 1 hour (but we always try network first)
} as const

// Conflict resolution choice
export type ConflictResolution = "local" | "server" | "merge"

// Conflict details for UI
export interface ConflictDetails {
  localOrder: CachedOrder
  serverOrder: Order
  conflictingFields: string[]
}

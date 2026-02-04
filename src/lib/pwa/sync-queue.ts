import { v4 as uuidv4 } from "uuid"
import {
  addToSyncQueue,
  getAllSyncQueueItems,
  getSyncQueueItem,
  removeSyncQueueItem,
  updateSyncQueueItem,
  getOrderByLocalId,
  getOrderByServerId,
  saveOrder,
  deleteOrder as deleteOrderFromDB,
  getSyncQueueCount,
  getAllOrders,
  getClient,
  saveClients,
  getAllClients,
  getCaterer,
  saveCaterers,
  getAllCaterers,
  getAirport,
  saveAirports,
  getAllAirports,
  getFBO,
  saveFBOs,
  getAllFBOs,
  getMenuItem,
  saveMenuItems,
  getAllMenuItems,
} from "./db"
import type {
  SyncQueueItem,
  CachedOrder,
  Order,
  ConflictDetails,
  ConflictResolution,
  Client,
  Caterer,
  Airport,
  FBO,
  MenuItem,
} from "./types"
import { apiCallJson, apiCall } from "@/lib/api-client"

// Maximum retry attempts before giving up
const MAX_RETRY_ATTEMPTS = 3

// Base delay for exponential backoff (in ms)
const BASE_RETRY_DELAY = 1000

// Entity types that can be synced
export type SyncEntityType = "order" | "client" | "caterer" | "airport" | "fbo" | "menuItem"

// Sync event types
export type SyncEventType =
  | "sync:started"
  | "sync:completed"
  | "sync:failed"
  | "sync:progress"
  | "sync:conflict"
  | "order:synced"
  | "order:created"
  | "order:updated"
  | "entity:created"
  | "entity:updated"

// Sync event detail
export interface SyncEventDetail {
  type: SyncEventType
  data?: {
    total?: number
    processed?: number
    failed?: number
    orderId?: string
    orderNumber?: string
    entityType?: SyncEntityType
    entityId?: string
    error?: string
    conflict?: ConflictDetails
  }
}

// Dispatch custom sync event
function dispatchSyncEvent(detail: SyncEventDetail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pwa:sync", { detail }))
  }
}

// Generate a temporary ID for offline-created entities
export function generateTempId(): string {
  return `temp_${uuidv4()}`
}

// Check if an ID is a temporary offline ID
export function isTempId(id: string | number): boolean {
  return typeof id === "string" && id.startsWith("temp_")
}

// Generate a temporary order number for offline-created orders
export function generateTempOrderNumber(): string {
  const uuid = uuidv4()
  const suffix = uuid.substring(0, 8).toUpperCase()
  return `PENDING-${suffix}`
}

// Map to track temp ID to real ID mappings after sync
const tempIdMappings: Map<string, { entityType: SyncEntityType; realId: number }> = new Map()

// Get real ID for a temp ID (used when syncing dependent entities)
export function getRealIdForTemp(tempId: string): number | undefined {
  return tempIdMappings.get(tempId)?.realId
}

// =============================================================================
// CLIENT OFFLINE OPERATIONS
// =============================================================================

export interface CachedClient extends Client {
  _localId: string
  _syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete"
  _version: number
}

export async function createOfflineClient(
  clientData: Omit<Client, "id" | "created_at" | "updated_at">
): Promise<CachedClient> {
  const localId = generateTempId()

  const now = new Date().toISOString()
  const cachedClient: CachedClient = {
    ...clientData,
    id: 0, // Will be assigned by server
    created_at: now,
    updated_at: now,
    _localId: localId,
    _syncStatus: "pending_create",
    _version: 1,
  }

  // Save to IndexedDB using localId as a marker
  const allClients = await getAllClients()
  // Store with negative ID to avoid conflicts, we'll use _localId to track
  const tempClient = { ...cachedClient, id: -Date.now() } as Client
  await saveClients([...allClients.filter(c => c.id !== tempClient.id), tempClient])

  // Add to sync queue
  const syncItem: SyncQueueItem = {
    id: uuidv4(),
    type: "create",
    entityType: "client",
    entityId: localId,
    payload: { ...clientData, _localId: localId },
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await addToSyncQueue(syncItem)

  return cachedClient
}

export async function updateOfflineClient(
  id: number,
  updates: Partial<Client>
): Promise<Client | null> {
  const client = await getClient(id)
  if (!client) return null

  const updatedClient = { ...client, ...updates }
  const allClients = await getAllClients()
  await saveClients(allClients.map(c => c.id === id ? updatedClient : c))

  // Add to sync queue
  const syncItem: SyncQueueItem = {
    id: uuidv4(),
    type: "update",
    entityType: "client",
    entityId: id.toString(),
    payload: updates,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await addToSyncQueue(syncItem)

  return updatedClient
}

// =============================================================================
// CATERER OFFLINE OPERATIONS
// =============================================================================

export interface CachedCaterer extends Caterer {
  _localId: string
  _syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete"
  _version: number
}

export async function createOfflineCaterer(
  catererData: Omit<Caterer, "id" | "created_at" | "updated_at">
): Promise<CachedCaterer> {
  const localId = generateTempId()
  const now = new Date().toISOString()

  const cachedCaterer: CachedCaterer = {
    ...catererData,
    id: 0,
    created_at: now,
    updated_at: now,
    _localId: localId,
    _syncStatus: "pending_create",
    _version: 1,
  }

  const allCaterers = await getAllCaterers()
  const tempCaterer = { ...cachedCaterer, id: -Date.now() } as Caterer
  await saveCaterers([...allCaterers.filter(c => c.id !== tempCaterer.id), tempCaterer])

  const syncItem: SyncQueueItem = {
    id: uuidv4(),
    type: "create",
    entityType: "caterer",
    entityId: localId,
    payload: { ...catererData, _localId: localId },
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await addToSyncQueue(syncItem)

  return cachedCaterer
}

export async function updateOfflineCaterer(
  id: number,
  updates: Partial<Caterer>
): Promise<Caterer | null> {
  const caterer = await getCaterer(id)
  if (!caterer) return null

  const updatedCaterer = { ...caterer, ...updates }
  const allCaterers = await getAllCaterers()
  await saveCaterers(allCaterers.map(c => c.id === id ? updatedCaterer : c))

  const syncItem: SyncQueueItem = {
    id: uuidv4(),
    type: "update",
    entityType: "caterer",
    entityId: id.toString(),
    payload: updates,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await addToSyncQueue(syncItem)

  return updatedCaterer
}

// =============================================================================
// AIRPORT OFFLINE OPERATIONS
// =============================================================================

export interface CachedAirport extends Airport {
  _localId: string
  _syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete"
  _version: number
}

export async function createOfflineAirport(
  airportData: Omit<Airport, "id">
): Promise<CachedAirport> {
  const localId = generateTempId()

  const cachedAirport: CachedAirport = {
    ...airportData,
    id: 0,
    _localId: localId,
    _syncStatus: "pending_create",
    _version: 1,
  }

  const allAirports = await getAllAirports()
  const tempAirport = { ...cachedAirport, id: -Date.now() } as Airport
  await saveAirports([...allAirports.filter(a => a.id !== tempAirport.id), tempAirport])

  const syncItem: SyncQueueItem = {
    id: uuidv4(),
    type: "create",
    entityType: "airport",
    entityId: localId,
    payload: { ...airportData, _localId: localId },
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await addToSyncQueue(syncItem)

  return cachedAirport
}

export async function updateOfflineAirport(
  id: number,
  updates: Partial<Airport>
): Promise<Airport | null> {
  const airport = await getAirport(id)
  if (!airport) return null

  const updatedAirport = { ...airport, ...updates }
  const allAirports = await getAllAirports()
  await saveAirports(allAirports.map(a => a.id === id ? updatedAirport : a))

  const syncItem: SyncQueueItem = {
    id: uuidv4(),
    type: "update",
    entityType: "airport",
    entityId: id.toString(),
    payload: updates,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await addToSyncQueue(syncItem)

  return updatedAirport
}

// =============================================================================
// FBO OFFLINE OPERATIONS
// =============================================================================

export interface CachedFBO extends FBO {
  _localId: string
  _syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete"
  _version: number
}

export async function createOfflineFBO(
  fboData: Omit<FBO, "id">
): Promise<CachedFBO> {
  const localId = generateTempId()

  const cachedFBO: CachedFBO = {
    ...fboData,
    id: 0,
    _localId: localId,
    _syncStatus: "pending_create",
    _version: 1,
  }

  const allFBOs = await getAllFBOs()
  const tempFBO = { ...cachedFBO, id: -Date.now() } as FBO
  await saveFBOs([...allFBOs.filter(f => f.id !== tempFBO.id), tempFBO])

  const syncItem: SyncQueueItem = {
    id: uuidv4(),
    type: "create",
    entityType: "fbo",
    entityId: localId,
    payload: { ...fboData, _localId: localId },
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await addToSyncQueue(syncItem)

  return cachedFBO
}

export async function updateOfflineFBO(
  id: number,
  updates: Partial<FBO>
): Promise<FBO | null> {
  const fbo = await getFBO(id)
  if (!fbo) return null

  const updatedFBO = { ...fbo, ...updates }
  const allFBOs = await getAllFBOs()
  await saveFBOs(allFBOs.map(f => f.id === id ? updatedFBO : f))

  const syncItem: SyncQueueItem = {
    id: uuidv4(),
    type: "update",
    entityType: "fbo",
    entityId: id.toString(),
    payload: updates,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await addToSyncQueue(syncItem)

  return updatedFBO
}

// =============================================================================
// MENU ITEM OFFLINE OPERATIONS
// =============================================================================

export interface CachedMenuItem extends MenuItem {
  _localId: string
  _syncStatus: "synced" | "pending_create" | "pending_update" | "pending_delete"
  _version: number
}

export async function createOfflineMenuItem(
  menuItemData: Omit<MenuItem, "id">
): Promise<CachedMenuItem> {
  const localId = generateTempId()

  const cachedMenuItem: CachedMenuItem = {
    ...menuItemData,
    id: 0,
    _localId: localId,
    _syncStatus: "pending_create",
    _version: 1,
  }

  const allMenuItems = await getAllMenuItems()
  const tempMenuItem = { ...cachedMenuItem, id: -Date.now() } as MenuItem
  await saveMenuItems([...allMenuItems.filter(m => m.id !== tempMenuItem.id), tempMenuItem])

  const syncItem: SyncQueueItem = {
    id: uuidv4(),
    type: "create",
    entityType: "menuItem",
    entityId: localId,
    payload: { ...menuItemData, _localId: localId },
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await addToSyncQueue(syncItem)

  return cachedMenuItem
}

export async function updateOfflineMenuItem(
  id: number,
  updates: Partial<MenuItem>
): Promise<MenuItem | null> {
  const menuItem = await getMenuItem(id)
  if (!menuItem) return null

  const updatedMenuItem = { ...menuItem, ...updates }
  const allMenuItems = await getAllMenuItems()
  await saveMenuItems(allMenuItems.map(m => m.id === id ? updatedMenuItem : m))

  const syncItem: SyncQueueItem = {
    id: uuidv4(),
    type: "update",
    entityType: "menuItem",
    entityId: id.toString(),
    payload: updates,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await addToSyncQueue(syncItem)

  return updatedMenuItem
}

// =============================================================================
// ORDER OFFLINE OPERATIONS
// =============================================================================

// Create a new offline order
export async function createOfflineOrder(
  orderData: Omit<Order, "id" | "order_number" | "created_at" | "updated_at">
): Promise<CachedOrder> {
  const localId = uuidv4()
  const now = new Date().toISOString()

  const cachedOrder: CachedOrder = {
    ...orderData,
    id: 0, // Will be assigned by server
    order_number: generateTempOrderNumber(),
    created_at: now,
    updated_at: now,
    _syncStatus: "pending_create",
    _localId: localId,
    _version: 1,
  }

  // Save to IndexedDB
  await saveOrder(cachedOrder)

  // Add to sync queue
  const syncItem: SyncQueueItem = {
    id: uuidv4(),
    type: "create",
    entityType: "order",
    entityId: localId,
    payload: orderData as unknown as Record<string, unknown>,
    createdAt: now,
    attempts: 0,
  }
  await addToSyncQueue(syncItem)

  return cachedOrder
}

// Update an existing order (online or offline)
export async function updateOfflineOrder(
  localId: string,
  updates: Partial<Order>
): Promise<CachedOrder | null> {
  const existingOrder = await getOrderByLocalId(localId)
  if (!existingOrder) {
    return null
  }

  const now = new Date().toISOString()

  // Determine new sync status
  let newSyncStatus = existingOrder._syncStatus
  if (existingOrder._syncStatus === "synced") {
    newSyncStatus = "pending_update"
  } else if (existingOrder._syncStatus === "conflict") {
    newSyncStatus = "pending_update"
  }

  const updatedOrder: CachedOrder = {
    ...existingOrder,
    ...updates,
    updated_at: now,
    _syncStatus: newSyncStatus,
    _version: existingOrder._version + 1,
    _pendingChanges: updates,
  }

  // Save to IndexedDB
  await saveOrder(updatedOrder)

  // Only add to sync queue if this is a new pending update
  if (existingOrder._syncStatus === "synced" || existingOrder._syncStatus === "conflict") {
    const syncItem: SyncQueueItem = {
      id: uuidv4(),
      type: "update",
      entityType: "order",
      entityId: localId,
      payload: updates as unknown as Record<string, unknown>,
      createdAt: now,
      attempts: 0,
    }
    await addToSyncQueue(syncItem)
  }

  return updatedOrder
}

// Mark an order for deletion
export async function deleteOfflineOrder(localId: string): Promise<boolean> {
  const existingOrder = await getOrderByLocalId(localId)
  if (!existingOrder) {
    return false
  }

  const now = new Date().toISOString()

  // If order was never synced, just delete it locally
  if (existingOrder._syncStatus === "pending_create") {
    await deleteOrderFromDB(localId)
    return true
  }

  // Mark for deletion
  const updatedOrder: CachedOrder = {
    ...existingOrder,
    _syncStatus: "pending_delete",
    _version: existingOrder._version + 1,
  }
  await saveOrder(updatedOrder)

  // Add to sync queue
  const syncItem: SyncQueueItem = {
    id: uuidv4(),
    type: "delete",
    entityType: "order",
    entityId: localId,
    payload: { id: existingOrder.id },
    createdAt: now,
    attempts: 0,
  }
  await addToSyncQueue(syncItem)

  return true
}

// =============================================================================
// SYNC PROCESSING
// =============================================================================

// Process a single sync queue item
async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  try {
    switch (item.entityType) {
      case "client":
        return await processClientSync(item)
      case "caterer":
        return await processCatererSync(item)
      case "airport":
        return await processAirportSync(item)
      case "fbo":
        return await processFBOSync(item)
      case "menuItem":
        return await processMenuItemSync(item)
      case "order":
        return await processOrderSync(item)
      default:
        console.warn(`Unknown entity type: ${item.entityType}`)
        return false
    }
  } catch (error) {
    console.error(`Sync item ${item.id} failed:`, error)

    // Update retry count
    const updatedItem: SyncQueueItem = {
      ...item,
      attempts: item.attempts + 1,
      lastAttemptAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    }
    await updateSyncQueueItem(updatedItem)

    // If max retries reached, give up
    if (updatedItem.attempts >= MAX_RETRY_ATTEMPTS) {
      console.error(`Sync item ${item.id} reached max retries, removing from queue`)
      await removeSyncQueueItem(item.id)
    }

    return false
  }
}

async function processClientSync(item: SyncQueueItem): Promise<boolean> {
  const payload = item.payload as Record<string, unknown>

  if (item.type === "create") {
    const { _localId, ...clientData } = payload
    const response = await apiCallJson<{ client: Client }>("/clients", {
      method: "POST",
      body: JSON.stringify(clientData),
    })

    if (response.client) {
      // Store mapping for dependent entities (orders)
      tempIdMappings.set(_localId as string, { entityType: "client", realId: response.client.id })

      // Update local cache with real ID
      const allClients = await getAllClients()
      const updatedClients = allClients
        .filter(c => c.id >= 0) // Remove temp entries
        .concat([response.client])
      await saveClients(updatedClients)

      // Update any pending orders that reference this temp client ID
      await updateOrdersWithRealId("client_id", _localId as string, response.client.id)

      dispatchSyncEvent({
        type: "entity:created",
        data: { entityType: "client", entityId: response.client.id.toString() },
      })
    }
  } else if (item.type === "update") {
    const id = parseInt(item.entityId)
    await apiCallJson(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })

    dispatchSyncEvent({
      type: "entity:updated",
      data: { entityType: "client", entityId: id.toString() },
    })
  }

  await removeSyncQueueItem(item.id)
  return true
}

async function processCatererSync(item: SyncQueueItem): Promise<boolean> {
  const payload = item.payload as Record<string, unknown>

  if (item.type === "create") {
    const { _localId, ...catererData } = payload
    const response = await apiCallJson<{ caterer: Caterer }>("/caterers", {
      method: "POST",
      body: JSON.stringify(catererData),
    })

    if (response.caterer) {
      tempIdMappings.set(_localId as string, { entityType: "caterer", realId: response.caterer.id })

      const allCaterers = await getAllCaterers()
      const updatedCaterers = allCaterers
        .filter(c => c.id >= 0)
        .concat([response.caterer])
      await saveCaterers(updatedCaterers)

      await updateOrdersWithRealId("caterer_id", _localId as string, response.caterer.id)

      dispatchSyncEvent({
        type: "entity:created",
        data: { entityType: "caterer", entityId: response.caterer.id.toString() },
      })
    }
  } else if (item.type === "update") {
    const id = parseInt(item.entityId)
    await apiCallJson(`/caterers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })

    dispatchSyncEvent({
      type: "entity:updated",
      data: { entityType: "caterer", entityId: id.toString() },
    })
  }

  await removeSyncQueueItem(item.id)
  return true
}

async function processAirportSync(item: SyncQueueItem): Promise<boolean> {
  const payload = item.payload as Record<string, unknown>

  if (item.type === "create") {
    const { _localId, ...airportData } = payload
    const response = await apiCallJson<{ airport: Airport }>("/airports", {
      method: "POST",
      body: JSON.stringify(airportData),
    })

    if (response.airport) {
      tempIdMappings.set(_localId as string, { entityType: "airport", realId: response.airport.id })

      const allAirports = await getAllAirports()
      const updatedAirports = allAirports
        .filter(a => a.id >= 0)
        .concat([response.airport])
      await saveAirports(updatedAirports)

      await updateOrdersWithRealId("airport_id", _localId as string, response.airport.id)

      dispatchSyncEvent({
        type: "entity:created",
        data: { entityType: "airport", entityId: response.airport.id.toString() },
      })
    }
  } else if (item.type === "update") {
    const id = parseInt(item.entityId)
    await apiCallJson(`/airports/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })

    dispatchSyncEvent({
      type: "entity:updated",
      data: { entityType: "airport", entityId: id.toString() },
    })
  }

  await removeSyncQueueItem(item.id)
  return true
}

async function processFBOSync(item: SyncQueueItem): Promise<boolean> {
  const payload = item.payload as Record<string, unknown>

  if (item.type === "create") {
    const { _localId, ...fboData } = payload
    const response = await apiCallJson<{ fbo: FBO }>("/fbos", {
      method: "POST",
      body: JSON.stringify(fboData),
    })

    if (response.fbo) {
      tempIdMappings.set(_localId as string, { entityType: "fbo", realId: response.fbo.id })

      const allFBOs = await getAllFBOs()
      const updatedFBOs = allFBOs
        .filter(f => f.id >= 0)
        .concat([response.fbo])
      await saveFBOs(updatedFBOs)

      await updateOrdersWithRealId("fbo_id", _localId as string, response.fbo.id)

      dispatchSyncEvent({
        type: "entity:created",
        data: { entityType: "fbo", entityId: response.fbo.id.toString() },
      })
    }
  } else if (item.type === "update") {
    const id = parseInt(item.entityId)
    await apiCallJson(`/fbos/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })

    dispatchSyncEvent({
      type: "entity:updated",
      data: { entityType: "fbo", entityId: id.toString() },
    })
  }

  await removeSyncQueueItem(item.id)
  return true
}

async function processMenuItemSync(item: SyncQueueItem): Promise<boolean> {
  const payload = item.payload as Record<string, unknown>

  if (item.type === "create") {
    const { _localId, ...menuItemData } = payload
    const response = await apiCallJson<{ menu_item: MenuItem }>("/menu-items", {
      method: "POST",
      body: JSON.stringify(menuItemData),
    })

    if (response.menu_item) {
      tempIdMappings.set(_localId as string, { entityType: "menuItem", realId: response.menu_item.id })

      const allMenuItems = await getAllMenuItems()
      const updatedMenuItems = allMenuItems
        .filter(m => m.id >= 0)
        .concat([response.menu_item])
      await saveMenuItems(updatedMenuItems)

      dispatchSyncEvent({
        type: "entity:created",
        data: { entityType: "menuItem", entityId: response.menu_item.id.toString() },
      })
    }
  } else if (item.type === "update") {
    const id = parseInt(item.entityId)
    await apiCallJson(`/menu-items/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })

    dispatchSyncEvent({
      type: "entity:updated",
      data: { entityType: "menuItem", entityId: id.toString() },
    })
  }

  await removeSyncQueueItem(item.id)
  return true
}

// Update pending orders that reference a temp ID with the real ID
async function updateOrdersWithRealId(
  field: "client_id" | "caterer_id" | "airport_id" | "fbo_id",
  tempId: string,
  realId: number
): Promise<void> {
  const allOrders = await getAllOrders()

  for (const order of allOrders) {
    // Check if this order uses the temp ID (stored as negative number)
    const currentValue = order[field]

    // For orders created offline with temp references, update the sync queue payload
    if (order._syncStatus === "pending_create") {
      const queueItems = await getAllSyncQueueItems()
      for (const queueItem of queueItems) {
        if (
          queueItem.entityType === "order" &&
          queueItem.type === "create" &&
          queueItem.entityId === order._localId
        ) {
          const payload = queueItem.payload as Record<string, unknown>
          // Check if this payload has a temp reference we need to update
          const payloadValue = payload[field]
          if (payloadValue && isTempId(String(payloadValue))) {
            const mapping = tempIdMappings.get(String(payloadValue))
            if (mapping) {
              payload[field] = mapping.realId
              await updateSyncQueueItem({ ...queueItem, payload })
            }
          }
        }
      }
    }
  }
}

async function processOrderSync(item: SyncQueueItem): Promise<boolean> {
  const order = await getOrderByLocalId(item.entityId)
  if (!order && item.type !== "delete") {
    console.warn(`Order not found for sync item: ${item.entityId}`)
    await removeSyncQueueItem(item.id)
    return true
  }

  switch (item.type) {
    case "create": {
      const payload = item.payload as Record<string, unknown>

      // Resolve any temp IDs to real IDs before sending
      const resolvedPayload = { ...payload }
      for (const field of ["client_id", "caterer_id", "airport_id", "fbo_id"] as const) {
        const value = resolvedPayload[field]
        if (value && isTempId(String(value))) {
          const mapping = tempIdMappings.get(String(value))
          if (mapping) {
            resolvedPayload[field] = mapping.realId
          }
        }
      }

      const apiPayload = {
        client_id: resolvedPayload.client_id,
        caterer_id: resolvedPayload.caterer_id,
        airport_id: resolvedPayload.airport_id,
        fbo_id: resolvedPayload.fbo_id,
        aircraft_tail_number: resolvedPayload.aircraft_tail_number,
        delivery_date: resolvedPayload.delivery_date,
        delivery_time: resolvedPayload.delivery_time,
        status: resolvedPayload.status,
        order_priority: resolvedPayload.order_priority,
        order_type: resolvedPayload.order_type,
        payment_method: resolvedPayload.payment_method,
        description: resolvedPayload.description,
        notes: resolvedPayload.notes,
        reheating_instructions: resolvedPayload.reheating_instructions,
        packaging_instructions: resolvedPayload.packaging_instructions,
        dietary_restrictions: resolvedPayload.dietary_restrictions,
        service_charge: resolvedPayload.service_charge,
        delivery_fee: resolvedPayload.delivery_fee,
        coordination_fee: resolvedPayload.coordination_fee,
        airport_fee: resolvedPayload.airport_fee,
        fbo_fee: resolvedPayload.fbo_fee,
        shopping_fee: resolvedPayload.shopping_fee,
        restaurant_pickup_fee: resolvedPayload.restaurant_pickup_fee,
        airport_pickup_fee: resolvedPayload.airport_pickup_fee,
        items: resolvedPayload.items,
      }

      const response = await apiCallJson<{ order: Order }>("/orders", {
        method: "POST",
        body: JSON.stringify(apiPayload),
      })

      if (response.order && order) {
        const syncedOrder: CachedOrder = {
          ...order,
          ...response.order,
          _syncStatus: "synced",
          _localId: order._localId,
          _version: order._version,
          _lastSyncedAt: new Date().toISOString(),
          _pendingChanges: undefined,
          _serverVersion: undefined,
        }
        await saveOrder(syncedOrder)

        dispatchSyncEvent({
          type: "order:created",
          data: {
            orderId: syncedOrder._localId,
            orderNumber: syncedOrder.order_number,
          },
        })
      }
      break
    }

    case "update": {
      if (!order) break

      // Check for conflicts
      const serverResponse = await apiCall(`/orders/${order.id}`)
      if (!serverResponse.ok) {
        throw new Error(`Failed to fetch server order: ${serverResponse.status}`)
      }
      const { order: serverOrder } = (await serverResponse.json()) as { order: Order }

      const serverUpdatedAt = new Date(serverOrder.updated_at).getTime()
      const lastSyncedAt = order._lastSyncedAt
        ? new Date(order._lastSyncedAt).getTime()
        : 0

      if (serverUpdatedAt > lastSyncedAt) {
        const conflictingFields = detectConflictingFields(order, serverOrder)

        if (conflictingFields.length > 0) {
          const conflictOrder: CachedOrder = {
            ...order,
            _syncStatus: "conflict",
            _serverVersion: serverOrder,
          }
          await saveOrder(conflictOrder)

          dispatchSyncEvent({
            type: "sync:conflict",
            data: {
              orderId: order._localId,
              conflict: {
                localOrder: conflictOrder,
                serverOrder,
                conflictingFields,
              },
            },
          })

          return false
        }
      }

      const updatePayload = item.payload as Record<string, unknown>
      const response = await apiCallJson<{ order: Order }>(`/orders/${order.id}`, {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      })

      if (response.order) {
        const syncedOrder: CachedOrder = {
          ...order,
          ...response.order,
          _syncStatus: "synced",
          _localId: order._localId,
          _version: order._version,
          _lastSyncedAt: new Date().toISOString(),
          _pendingChanges: undefined,
          _serverVersion: undefined,
        }
        await saveOrder(syncedOrder)

        dispatchSyncEvent({
          type: "order:updated",
          data: {
            orderId: syncedOrder._localId,
            orderNumber: syncedOrder.order_number,
          },
        })
      }
      break
    }

    case "delete": {
      const orderId = (item.payload as { id: number }).id
      if (orderId) {
        await apiCall(`/orders/${orderId}`, { method: "DELETE" })
        await deleteOrderFromDB(item.entityId)
      }
      break
    }
  }

  await removeSyncQueueItem(item.id)
  return true
}

// Detect conflicting fields between local and server versions
function detectConflictingFields(local: CachedOrder, server: Order): string[] {
  const conflictingFields: string[] = []

  const criticalFields: (keyof Order)[] = [
    "status",
    "items",
    "total",
    "subtotal",
    "client_id",
    "caterer_id",
    "airport_id",
    "delivery_date",
    "delivery_time",
    "service_charge",
    "delivery_fee",
  ]

  for (const field of criticalFields) {
    const localValue = local[field]
    const serverValue = server[field]

    if (field === "items") {
      const localItems = JSON.stringify(localValue || [])
      const serverItems = JSON.stringify(serverValue || [])
      if (localItems !== serverItems) {
        conflictingFields.push(field)
      }
      continue
    }

    if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
      conflictingFields.push(field)
    }
  }

  return conflictingFields
}

// Resolve a conflict
export async function resolveConflict(
  localId: string,
  resolution: ConflictResolution
): Promise<CachedOrder | null> {
  const order = await getOrderByLocalId(localId)
  if (!order || order._syncStatus !== "conflict") {
    return null
  }

  const serverVersion = order._serverVersion
  if (!serverVersion && resolution !== "local") {
    console.error("No server version available for conflict resolution")
    return null
  }

  let resolvedOrder: CachedOrder

  switch (resolution) {
    case "local":
      resolvedOrder = {
        ...order,
        _syncStatus: "pending_update",
        _serverVersion: undefined,
      }

      const syncItem: SyncQueueItem = {
        id: uuidv4(),
        type: "update",
        entityType: "order",
        entityId: localId,
        payload: order._pendingChanges || (order as unknown as Record<string, unknown>),
        createdAt: new Date().toISOString(),
        attempts: 0,
      }
      await addToSyncQueue(syncItem)
      break

    case "server":
      if (!serverVersion) return null
      resolvedOrder = {
        ...serverVersion,
        _syncStatus: "synced",
        _localId: order._localId,
        _version: order._version + 1,
        _lastSyncedAt: new Date().toISOString(),
        _pendingChanges: undefined,
        _serverVersion: undefined,
      }
      break

    case "merge":
      if (!serverVersion) return null
      resolvedOrder = {
        ...order,
        status: serverVersion.status,
        total: serverVersion.total,
        subtotal: serverVersion.subtotal,
        notes: order.notes,
        description: order.description,
        reheating_instructions: order.reheating_instructions,
        packaging_instructions: order.packaging_instructions,
        dietary_restrictions: order.dietary_restrictions,
        _syncStatus: "pending_update",
        _version: order._version + 1,
        _serverVersion: undefined,
      }

      const mergeItem: SyncQueueItem = {
        id: uuidv4(),
        type: "update",
        entityType: "order",
        entityId: localId,
        payload: {
          notes: resolvedOrder.notes,
          description: resolvedOrder.description,
          reheating_instructions: resolvedOrder.reheating_instructions,
          packaging_instructions: resolvedOrder.packaging_instructions,
          dietary_restrictions: resolvedOrder.dietary_restrictions,
        },
        createdAt: new Date().toISOString(),
        attempts: 0,
      }
      await addToSyncQueue(mergeItem)
      break

    default:
      return null
  }

  await saveOrder(resolvedOrder)
  return resolvedOrder
}

// Process all items in the sync queue with proper ordering
export async function processQueue(): Promise<{
  total: number
  processed: number
  failed: number
}> {
  const items = await getAllSyncQueueItems()
  const result = {
    total: items.length,
    processed: 0,
    failed: 0,
  }

  if (items.length === 0) {
    return result
  }

  dispatchSyncEvent({
    type: "sync:started",
    data: { total: items.length },
  })

  // Sort items: reference data first (clients, caterers, airports, fbos, menuItems), then orders
  const entityPriority: Record<string, number> = {
    client: 1,
    caterer: 2,
    airport: 3,
    fbo: 4,
    menuItem: 5,
    order: 6,
  }

  const sortedItems = [...items].sort((a, b) => {
    const priorityA = entityPriority[a.entityType] || 99
    const priorityB = entityPriority[b.entityType] || 99
    if (priorityA !== priorityB) return priorityA - priorityB
    // Within same type, process by creation time
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  // Clear temp ID mappings for fresh sync
  tempIdMappings.clear()

  for (const item of sortedItems) {
    if (item.attempts > 0) {
      const delay = BASE_RETRY_DELAY * Math.pow(2, item.attempts - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    const success = await processSyncItem(item)
    if (success) {
      result.processed++
    } else {
      result.failed++
    }

    dispatchSyncEvent({
      type: "sync:progress",
      data: {
        total: result.total,
        processed: result.processed,
        failed: result.failed,
      },
    })
  }

  dispatchSyncEvent({
    type: result.failed > 0 ? "sync:failed" : "sync:completed",
    data: result,
  })

  return result
}

// Check if there are pending items to sync
export async function hasPendingSync(): Promise<boolean> {
  const count = await getSyncQueueCount()
  return count > 0
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  return getSyncQueueCount()
}

// Cache orders from server to IndexedDB
export async function cacheOrdersFromServer(orders: Order[]): Promise<void> {
  const now = new Date().toISOString()

  for (const order of orders) {
    const existingOrder = await getOrderByServerId(order.id)

    if (existingOrder) {
      if (
        existingOrder._syncStatus === "pending_create" ||
        existingOrder._syncStatus === "pending_update" ||
        existingOrder._syncStatus === "pending_delete"
      ) {
        continue
      }

      const cachedOrder: CachedOrder = {
        ...order,
        _syncStatus: "synced",
        _localId: existingOrder._localId,
        _version: existingOrder._version,
        _lastSyncedAt: now,
      }
      await saveOrder(cachedOrder)
    } else {
      const cachedOrder: CachedOrder = {
        ...order,
        _syncStatus: "synced",
        _localId: uuidv4(),
        _version: 1,
        _lastSyncedAt: now,
      }
      await saveOrder(cachedOrder)
    }
  }
}

// Convert cached order to regular order
export function cachedOrderToOrder(cached: CachedOrder): Order {
  const {
    _syncStatus,
    _localId,
    _version,
    _lastSyncedAt,
    _pendingChanges,
    _serverVersion,
    ...order
  } = cached
  return order
}

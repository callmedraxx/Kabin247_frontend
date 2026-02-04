import { openDB, DBSchema, IDBPDatabase } from "idb"
import type {
  CachedOrder,
  SyncQueueItem,
  Client,
  Caterer,
  Airport,
  FBO,
  MenuItem,
  CacheMetadata,
  CACHE_DURATIONS,
} from "./types"

const DB_NAME = "kabin247-offline"
const DB_VERSION = 1

// IndexedDB schema definition
interface Kabin247DB extends DBSchema {
  orders: {
    key: string // _localId for offline or id.toString() for synced
    value: CachedOrder
    indexes: {
      "by-sync-status": string
      "by-server-id": number
      "by-delivery-date": string
      "by-client-id": number
      "by-status": string
    }
  }
  syncQueue: {
    key: string // UUID
    value: SyncQueueItem
    indexes: {
      "by-created-at": string
      "by-entity-type": string
    }
  }
  clients: {
    key: number
    value: Client
    indexes: {
      "by-name": string
    }
  }
  caterers: {
    key: number
    value: Caterer
    indexes: {
      "by-name": string
      "by-airport": string
    }
  }
  airports: {
    key: number
    value: Airport
    indexes: {
      "by-name": string
      "by-iata": string
    }
  }
  fbos: {
    key: number
    value: FBO
    indexes: {
      "by-name": string
      "by-airport": string
    }
  }
  menuItems: {
    key: number
    value: MenuItem
    indexes: {
      "by-name": string
      "by-category": string
    }
  }
  metadata: {
    key: string
    value: CacheMetadata
  }
}

let dbInstance: IDBPDatabase<Kabin247DB> | null = null

// Initialize the database
export async function initDB(): Promise<IDBPDatabase<Kabin247DB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<Kabin247DB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Orders store
      if (!db.objectStoreNames.contains("orders")) {
        const ordersStore = db.createObjectStore("orders", { keyPath: "_localId" })
        ordersStore.createIndex("by-sync-status", "_syncStatus")
        ordersStore.createIndex("by-server-id", "id")
        ordersStore.createIndex("by-delivery-date", "delivery_date")
        ordersStore.createIndex("by-client-id", "client_id")
        ordersStore.createIndex("by-status", "status")
      }

      // Sync queue store
      if (!db.objectStoreNames.contains("syncQueue")) {
        const syncQueueStore = db.createObjectStore("syncQueue", { keyPath: "id" })
        syncQueueStore.createIndex("by-created-at", "createdAt")
        syncQueueStore.createIndex("by-entity-type", "entityType")
      }

      // Clients store
      if (!db.objectStoreNames.contains("clients")) {
        const clientsStore = db.createObjectStore("clients", { keyPath: "id" })
        clientsStore.createIndex("by-name", "full_name")
      }

      // Caterers store
      if (!db.objectStoreNames.contains("caterers")) {
        const caterersStore = db.createObjectStore("caterers", { keyPath: "id" })
        caterersStore.createIndex("by-name", "caterer_name")
        caterersStore.createIndex("by-airport", "airport_code_iata")
      }

      // Airports store
      if (!db.objectStoreNames.contains("airports")) {
        const airportsStore = db.createObjectStore("airports", { keyPath: "id" })
        airportsStore.createIndex("by-name", "airport_name")
        airportsStore.createIndex("by-iata", "airport_code_iata")
      }

      // FBOs store
      if (!db.objectStoreNames.contains("fbos")) {
        const fbosStore = db.createObjectStore("fbos", { keyPath: "id" })
        fbosStore.createIndex("by-name", "fbo_name")
        fbosStore.createIndex("by-airport", "airport_code_iata")
      }

      // Menu items store
      if (!db.objectStoreNames.contains("menuItems")) {
        const menuItemsStore = db.createObjectStore("menuItems", { keyPath: "id" })
        menuItemsStore.createIndex("by-name", "item_name")
        menuItemsStore.createIndex("by-category", "category")
      }

      // Metadata store for cache timestamps
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" })
      }
    },
  })

  return dbInstance
}

// Get database instance
export async function getDB(): Promise<IDBPDatabase<Kabin247DB>> {
  if (!dbInstance) {
    return initDB()
  }
  return dbInstance
}

// =============================================================================
// ORDERS OPERATIONS
// =============================================================================

export async function getAllOrders(): Promise<CachedOrder[]> {
  const db = await getDB()
  return db.getAll("orders")
}

export async function getOrderByLocalId(localId: string): Promise<CachedOrder | undefined> {
  const db = await getDB()
  return db.get("orders", localId)
}

export async function getOrderByServerId(serverId: number): Promise<CachedOrder | undefined> {
  const db = await getDB()
  const orders = await db.getAllFromIndex("orders", "by-server-id", serverId)
  return orders[0]
}

export async function getOrdersBySyncStatus(status: string): Promise<CachedOrder[]> {
  const db = await getDB()
  return db.getAllFromIndex("orders", "by-sync-status", status)
}

export async function getPendingOrders(): Promise<CachedOrder[]> {
  const db = await getDB()
  const allOrders = await db.getAll("orders")
  return allOrders.filter(
    (order) =>
      order._syncStatus === "pending_create" ||
      order._syncStatus === "pending_update" ||
      order._syncStatus === "pending_delete"
  )
}

export async function saveOrder(order: CachedOrder): Promise<void> {
  const db = await getDB()
  await db.put("orders", order)
}

export async function saveOrders(orders: CachedOrder[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("orders", "readwrite")
  await Promise.all([
    ...orders.map((order) => tx.store.put(order)),
    tx.done,
  ])
}

export async function deleteOrder(localId: string): Promise<void> {
  const db = await getDB()
  await db.delete("orders", localId)
}

export async function clearOrders(): Promise<void> {
  const db = await getDB()
  await db.clear("orders")
}

// =============================================================================
// SYNC QUEUE OPERATIONS
// =============================================================================

export async function getAllSyncQueueItems(): Promise<SyncQueueItem[]> {
  const db = await getDB()
  return db.getAllFromIndex("syncQueue", "by-created-at")
}

export async function getSyncQueueItem(id: string): Promise<SyncQueueItem | undefined> {
  const db = await getDB()
  return db.get("syncQueue", id)
}

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getDB()
  await db.put("syncQueue", item)
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await getDB()
  await db.put("syncQueue", item)
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("syncQueue", id)
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB()
  await db.clear("syncQueue")
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB()
  return db.count("syncQueue")
}

// =============================================================================
// CLIENTS OPERATIONS
// =============================================================================

export async function getAllClients(): Promise<Client[]> {
  const db = await getDB()
  return db.getAll("clients")
}

export async function getClient(id: number): Promise<Client | undefined> {
  const db = await getDB()
  return db.get("clients", id)
}

export async function saveClients(clients: Client[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("clients", "readwrite")
  await Promise.all([
    ...clients.map((client) => tx.store.put(client)),
    tx.done,
  ])
}

export async function clearClients(): Promise<void> {
  const db = await getDB()
  await db.clear("clients")
}

// =============================================================================
// CATERERS OPERATIONS
// =============================================================================

export async function getAllCaterers(): Promise<Caterer[]> {
  const db = await getDB()
  return db.getAll("caterers")
}

export async function getCaterer(id: number): Promise<Caterer | undefined> {
  const db = await getDB()
  return db.get("caterers", id)
}

export async function saveCaterers(caterers: Caterer[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("caterers", "readwrite")
  await Promise.all([
    ...caterers.map((caterer) => tx.store.put(caterer)),
    tx.done,
  ])
}

export async function clearCaterers(): Promise<void> {
  const db = await getDB()
  await db.clear("caterers")
}

// =============================================================================
// AIRPORTS OPERATIONS
// =============================================================================

export async function getAllAirports(): Promise<Airport[]> {
  const db = await getDB()
  return db.getAll("airports")
}

export async function getAirport(id: number): Promise<Airport | undefined> {
  const db = await getDB()
  return db.get("airports", id)
}

export async function saveAirports(airports: Airport[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("airports", "readwrite")
  await Promise.all([
    ...airports.map((airport) => tx.store.put(airport)),
    tx.done,
  ])
}

export async function clearAirports(): Promise<void> {
  const db = await getDB()
  await db.clear("airports")
}

// =============================================================================
// FBOS OPERATIONS
// =============================================================================

export async function getAllFBOs(): Promise<FBO[]> {
  const db = await getDB()
  return db.getAll("fbos")
}

export async function getFBO(id: number): Promise<FBO | undefined> {
  const db = await getDB()
  return db.get("fbos", id)
}

export async function saveFBOs(fbos: FBO[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("fbos", "readwrite")
  await Promise.all([
    ...fbos.map((fbo) => tx.store.put(fbo)),
    tx.done,
  ])
}

export async function clearFBOs(): Promise<void> {
  const db = await getDB()
  await db.clear("fbos")
}

// =============================================================================
// MENU ITEMS OPERATIONS
// =============================================================================

export async function getAllMenuItems(): Promise<MenuItem[]> {
  const db = await getDB()
  return db.getAll("menuItems")
}

export async function getMenuItem(id: number): Promise<MenuItem | undefined> {
  const db = await getDB()
  return db.get("menuItems", id)
}

export async function saveMenuItems(menuItems: MenuItem[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("menuItems", "readwrite")
  await Promise.all([
    ...menuItems.map((item) => tx.store.put(item)),
    tx.done,
  ])
}

export async function clearMenuItems(): Promise<void> {
  const db = await getDB()
  await db.clear("menuItems")
}

// =============================================================================
// METADATA / CACHE OPERATIONS
// =============================================================================

export async function getCacheMetadata(key: string): Promise<CacheMetadata | undefined> {
  const db = await getDB()
  return db.get("metadata", key)
}

export async function setCacheMetadata(metadata: CacheMetadata): Promise<void> {
  const db = await getDB()
  await db.put("metadata", metadata)
}

export async function isCacheValid(
  key: string,
  duration: (typeof CACHE_DURATIONS)[keyof typeof CACHE_DURATIONS]
): Promise<boolean> {
  const metadata = await getCacheMetadata(key)
  if (!metadata) return false

  const expiresAt = new Date(metadata.expiresAt).getTime()
  return Date.now() < expiresAt
}

export async function updateCacheTimestamp(
  key: string,
  duration: (typeof CACHE_DURATIONS)[keyof typeof CACHE_DURATIONS]
): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + duration)

  await setCacheMetadata({
    key,
    lastUpdated: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  })
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear("orders"),
    db.clear("syncQueue"),
    db.clear("clients"),
    db.clear("caterers"),
    db.clear("airports"),
    db.clear("fbos"),
    db.clear("menuItems"),
    db.clear("metadata"),
  ])
}

// Check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined"
  } catch {
    return false
  }
}

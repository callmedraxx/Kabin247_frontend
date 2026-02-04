"use client"

import * as React from "react"
import { apiCallJson } from "@/lib/api-client"
import {
  getAllClients,
  saveClients,
  isCacheValid,
  updateCacheTimestamp,
  isIndexedDBAvailable,
} from "@/lib/pwa/db"
import {
  createOfflineClient,
  updateOfflineClient,
} from "@/lib/pwa/sync-queue"
import { CACHE_DURATIONS } from "@/lib/pwa/types"

interface Client {
  id: number
  full_name: string
  full_address: string
  email: string | null
  contact_number: string | null
  airport_code: string | null
  fbo_name: string | null
  additional_emails?: string[]
}

interface ClientsResponse {
  clients: Client[]
  total: number
}

type ClientOption = {
  value: string
  label: string
}

type ClientsContextType = {
  clients: Client[]
  clientOptions: ClientOption[]
  isLoading: boolean
  isOffline: boolean
  fetchClients: (search?: string) => Promise<void>
  getClientById: (id: number) => Client | undefined
  getClientOptionById: (id: number) => ClientOption | undefined
  createClient: (clientData: Omit<Client, "id">) => Promise<Client | null>
  updateClient: (id: number, updates: Partial<Client>) => Promise<Client | null>
}

const ClientsContext = React.createContext<ClientsContextType | undefined>(undefined)

const CACHE_KEY = "clients"

export function ClientsProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = React.useState<Client[]>([])
  const [clientOptions, setClientOptions] = React.useState<ClientOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOnline, setIsOnline] = React.useState(true)

  // Listen for online/offline events
  React.useEffect(() => {
    if (typeof window === "undefined") return

    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Load from cache on mount
  React.useEffect(() => {
    async function loadFromCache() {
      if (!isIndexedDBAvailable()) return

      try {
        const cachedClients = await getAllClients()
        if (cachedClients.length > 0) {
          setClients(cachedClients)
          setClientOptions(
            cachedClients.map((client) => ({
              value: client.id.toString(),
              label: client.full_name,
            }))
          )
        }
      } catch (err) {
        console.error("Error loading clients from cache:", err)
      }
    }

    loadFromCache()
  }, [])

  const fetchClients = React.useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      // If online, try to fetch from server
      if (isOnline) {
        const params = new URLSearchParams()
        if (search?.trim()) {
          params.append("search", search.trim())
        }
        params.append("limit", "10000")

        const data: ClientsResponse = await apiCallJson(`/clients?${params.toString()}`)
        const allClients = data.clients || []

        setClients(allClients)

        const options = allClients.map((client) => ({
          value: client.id.toString(),
          label: client.full_name,
        }))
        setClientOptions(options)

        // Cache to IndexedDB (only if no search filter to avoid partial caches)
        if (!search?.trim() && isIndexedDBAvailable()) {
          await saveClients(allClients)
          await updateCacheTimestamp(CACHE_KEY, CACHE_DURATIONS.clients)
        }
      } else {
        // Offline: load from cache
        if (isIndexedDBAvailable()) {
          const cachedClients = await getAllClients()
          let filtered = cachedClients

          // Apply search filter locally
          if (search?.trim()) {
            const searchLower = search.toLowerCase()
            filtered = cachedClients.filter(
              (c) =>
                c.full_name.toLowerCase().includes(searchLower) ||
                c.email?.toLowerCase().includes(searchLower) ||
                c.full_address?.toLowerCase().includes(searchLower)
            )
          }

          setClients(filtered)
          setClientOptions(
            filtered.map((client) => ({
              value: client.id.toString(),
              label: client.full_name,
            }))
          )
        }
      }
    } catch (err) {
      console.error("Error fetching clients:", err)

      // Fallback to cache on error
      if (isIndexedDBAvailable()) {
        const cachedClients = await getAllClients()
        if (cachedClients.length > 0) {
          setClients(cachedClients)
          setClientOptions(
            cachedClients.map((client) => ({
              value: client.id.toString(),
              label: client.full_name,
            }))
          )
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [isOnline])

  const getClientById = React.useCallback((id: number) => {
    return clients.find(c => c.id === id)
  }, [clients])

  const getClientOptionById = React.useCallback((id: number) => {
    return clientOptions.find(opt => opt.value === id.toString())
  }, [clientOptions])

  const createClient = React.useCallback(async (clientData: Omit<Client, "id">): Promise<Client | null> => {
    try {
      if (isOnline) {
        // Create on server
        const response = await apiCallJson<{ client: Client }>("/clients", {
          method: "POST",
          body: JSON.stringify(clientData),
        })
        if (response.client) {
          // Update local state
          setClients(prev => [...prev, response.client])
          setClientOptions(prev => [...prev, {
            value: response.client.id.toString(),
            label: response.client.full_name,
          }])
          // Cache to IndexedDB
          if (isIndexedDBAvailable()) {
            const allClients = await getAllClients()
            await saveClients([...allClients, response.client])
          }
          return response.client
        }
      } else if (isIndexedDBAvailable()) {
        // Create offline
        const cached = await createOfflineClient(clientData)
        const tempClient = { ...cached, id: -Date.now() } as Client
        setClients(prev => [...prev, tempClient])
        setClientOptions(prev => [...prev, {
          value: tempClient.id.toString(),
          label: tempClient.full_name,
        }])
        return tempClient
      }
      return null
    } catch (err) {
      console.error("Error creating client:", err)
      throw err
    }
  }, [isOnline])

  const updateClient = React.useCallback(async (id: number, updates: Partial<Client>): Promise<Client | null> => {
    try {
      if (isOnline && id > 0) {
        // Update on server
        const response = await apiCallJson<{ client: Client }>(`/clients/${id}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        })
        if (response.client) {
          setClients(prev => prev.map(c => c.id === id ? response.client : c))
          setClientOptions(prev => prev.map(opt =>
            opt.value === id.toString()
              ? { ...opt, label: response.client.full_name }
              : opt
          ))
          if (isIndexedDBAvailable()) {
            const allClients = await getAllClients()
            await saveClients(allClients.map(c => c.id === id ? response.client : c))
          }
          return response.client
        }
      } else if (isIndexedDBAvailable()) {
        // Update offline
        const updated = await updateOfflineClient(id, updates)
        if (updated) {
          setClients(prev => prev.map(c => c.id === id ? updated : c))
          setClientOptions(prev => prev.map(opt =>
            opt.value === id.toString()
              ? { ...opt, label: updated.full_name }
              : opt
          ))
          return updated
        }
      }
      return null
    } catch (err) {
      console.error("Error updating client:", err)
      throw err
    }
  }, [isOnline])

  return (
    <ClientsContext.Provider value={{
      clients,
      clientOptions,
      isLoading,
      isOffline: !isOnline,
      fetchClients,
      getClientById,
      getClientOptionById,
      createClient,
      updateClient
    }}>
      {children}
    </ClientsContext.Provider>
  )
}

export function useClients() {
  const context = React.useContext(ClientsContext)
  if (!context) {
    throw new Error("useClients must be used within ClientsProvider")
  }
  return context
}

"use client"

import * as React from "react"
import { apiCallJson } from "@/lib/api-client"
import {
  getAllCaterers,
  saveCaterers,
  updateCacheTimestamp,
  isIndexedDBAvailable,
} from "@/lib/pwa/db"
import {
  createOfflineCaterer,
  updateOfflineCaterer,
} from "@/lib/pwa/sync-queue"
import { CACHE_DURATIONS } from "@/lib/pwa/types"

interface Caterer {
  id: number
  caterer_name: string
  caterer_number: string
  caterer_email: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
  additional_emails?: string[]
}

interface CaterersResponse {
  caterers: Caterer[]
  total: number
}

type CatererOption = {
  value: string
  label: string
  searchText?: string
}

type CaterersContextType = {
  caterers: Caterer[]
  catererOptions: CatererOption[]
  isLoading: boolean
  isOffline: boolean
  fetchCaterers: (search?: string) => Promise<void>
  getCatererById: (id: number) => Caterer | undefined
  getCatererOptionById: (id: number) => CatererOption | undefined
  createCaterer: (catererData: Omit<Caterer, "id">) => Promise<Caterer | null>
  updateCaterer: (id: number, updates: Partial<Caterer>) => Promise<Caterer | null>
}

const CaterersContext = React.createContext<CaterersContextType | undefined>(undefined)

const CACHE_KEY = "caterers"

function formatCatererOptions(caterers: Caterer[]): CatererOption[] {
  return caterers.map((caterer) => {
    const airportCodes = [
      caterer.airport_code_iata,
      caterer.airport_code_icao,
    ].filter(Boolean).join("/")

    let label = ""
    if (airportCodes) {
      label = `${airportCodes} - ${caterer.caterer_name}`
    } else {
      label = caterer.caterer_name
    }

    return {
      value: caterer.id.toString(),
      label,
      searchText: `${caterer.caterer_name} ${airportCodes} ${caterer.caterer_number || ""}`.toLowerCase(),
    }
  })
}

export function CaterersProvider({ children }: { children: React.ReactNode }) {
  const [caterers, setCaterers] = React.useState<Caterer[]>([])
  const [catererOptions, setCatererOptions] = React.useState<CatererOption[]>([])
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
        const cachedCaterers = await getAllCaterers()
        if (cachedCaterers.length > 0) {
          setCaterers(cachedCaterers)
          setCatererOptions(formatCatererOptions(cachedCaterers))
        }
      } catch (err) {
        console.error("Error loading caterers from cache:", err)
      }
    }

    loadFromCache()
  }, [])

  const fetchCaterers = React.useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      if (isOnline) {
        const params = new URLSearchParams()
        if (search?.trim()) {
          params.append("search", search.trim())
        }
        params.append("limit", "10000")

        const data: CaterersResponse = await apiCallJson(`/caterers?${params.toString()}`)
        const allCaterers = data.caterers || []

        setCaterers(allCaterers)
        setCatererOptions(formatCatererOptions(allCaterers))

        // Cache to IndexedDB
        if (!search?.trim() && isIndexedDBAvailable()) {
          await saveCaterers(allCaterers)
          await updateCacheTimestamp(CACHE_KEY, CACHE_DURATIONS.caterers)
        }
      } else {
        // Offline: load from cache
        if (isIndexedDBAvailable()) {
          const cachedCaterers = await getAllCaterers()
          let filtered = cachedCaterers

          if (search?.trim()) {
            const searchLower = search.toLowerCase()
            filtered = cachedCaterers.filter(
              (c) =>
                c.caterer_name.toLowerCase().includes(searchLower) ||
                c.airport_code_iata?.toLowerCase().includes(searchLower) ||
                c.airport_code_icao?.toLowerCase().includes(searchLower)
            )
          }

          setCaterers(filtered)
          setCatererOptions(formatCatererOptions(filtered))
        }
      }
    } catch (err) {
      console.error("Error fetching caterers:", err)

      // Fallback to cache
      if (isIndexedDBAvailable()) {
        const cachedCaterers = await getAllCaterers()
        if (cachedCaterers.length > 0) {
          setCaterers(cachedCaterers)
          setCatererOptions(formatCatererOptions(cachedCaterers))
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [isOnline])

  const getCatererById = React.useCallback((id: number) => {
    return caterers.find(c => c.id === id)
  }, [caterers])

  const getCatererOptionById = React.useCallback((id: number) => {
    return catererOptions.find(opt => opt.value === id.toString())
  }, [catererOptions])

  const createCaterer = React.useCallback(async (catererData: Omit<Caterer, "id">): Promise<Caterer | null> => {
    try {
      if (isOnline) {
        const response = await apiCallJson<{ caterer: Caterer }>("/caterers", {
          method: "POST",
          body: JSON.stringify(catererData),
        })
        if (response.caterer) {
          setCaterers(prev => [...prev, response.caterer])
          setCatererOptions(prev => [...prev, ...formatCatererOptions([response.caterer])])
          if (isIndexedDBAvailable()) {
            const allCaterers = await getAllCaterers()
            await saveCaterers([...allCaterers, response.caterer])
          }
          return response.caterer
        }
      } else if (isIndexedDBAvailable()) {
        const cached = await createOfflineCaterer(catererData)
        const tempCaterer = { ...cached, id: -Date.now() } as Caterer
        setCaterers(prev => [...prev, tempCaterer])
        setCatererOptions(prev => [...prev, ...formatCatererOptions([tempCaterer])])
        return tempCaterer
      }
      return null
    } catch (err) {
      console.error("Error creating caterer:", err)
      throw err
    }
  }, [isOnline])

  const updateCaterer = React.useCallback(async (id: number, updates: Partial<Caterer>): Promise<Caterer | null> => {
    try {
      if (isOnline && id > 0) {
        const response = await apiCallJson<{ caterer: Caterer }>(`/caterers/${id}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        })
        if (response.caterer) {
          setCaterers(prev => prev.map(c => c.id === id ? response.caterer : c))
          setCatererOptions(formatCatererOptions(caterers.map(c => c.id === id ? response.caterer : c)))
          if (isIndexedDBAvailable()) {
            const allCaterers = await getAllCaterers()
            await saveCaterers(allCaterers.map(c => c.id === id ? response.caterer : c))
          }
          return response.caterer
        }
      } else if (isIndexedDBAvailable()) {
        const updated = await updateOfflineCaterer(id, updates)
        if (updated) {
          setCaterers(prev => prev.map(c => c.id === id ? updated : c))
          setCatererOptions(formatCatererOptions(caterers.map(c => c.id === id ? updated : c)))
          return updated
        }
      }
      return null
    } catch (err) {
      console.error("Error updating caterer:", err)
      throw err
    }
  }, [isOnline, caterers])

  return (
    <CaterersContext.Provider value={{
      caterers,
      catererOptions,
      isLoading,
      isOffline: !isOnline,
      fetchCaterers,
      getCatererById,
      getCatererOptionById,
      createCaterer,
      updateCaterer
    }}>
      {children}
    </CaterersContext.Provider>
  )
}

export function useCaterers() {
  const context = React.useContext(CaterersContext)
  if (!context) {
    throw new Error("useCaterers must be used within CaterersProvider")
  }
  return context
}

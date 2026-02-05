"use client"

import * as React from "react"
import { apiCallJson } from "@/lib/api-client"
import {
  getAllFBOs,
  saveFBOs,
  updateCacheTimestamp,
  isIndexedDBAvailable,
} from "@/lib/pwa/db"
import {
  createOfflineFBO,
  updateOfflineFBO,
} from "@/lib/pwa/sync-queue"
import { CACHE_DURATIONS } from "@/lib/pwa/types"

interface FBO {
  id: number
  fbo_name: string
  fbo_email: string | null
  fbo_phone: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
  airport_name: string | null
}

interface FBOsResponse {
  fbos: FBO[]
  total: number
}

type FBOOption = {
  value: string
  label: string
  searchText?: string
}

type FBOsContextType = {
  fbos: FBO[]
  fboOptions: FBOOption[]
  isLoading: boolean
  isOffline: boolean
  fetchFBOs: (search?: string) => Promise<void>
  getFBOById: (id: number) => FBO | undefined
  getFBOOptionById: (id: number) => FBOOption | undefined
  createFBO: (fboData: Omit<FBO, "id">) => Promise<FBO | null>
  updateFBO: (id: number, updates: Partial<FBO>) => Promise<FBO | null>
}

const FBOsContext = React.createContext<FBOsContextType | undefined>(undefined)

const CACHE_KEY = "fbos"

function formatFBOOptions(fbos: FBO[]): FBOOption[] {
  return fbos.map((fbo) => {
    const codes = [
      fbo.airport_code_iata,
      fbo.airport_code_icao,
    ].filter(Boolean).join("/")

    let label = fbo.fbo_name
    if (codes) {
      label = `${codes} - ${fbo.fbo_name}`
    }

    return {
      value: fbo.id.toString(),
      label,
      searchText: `${fbo.fbo_name} ${codes} ${fbo.airport_name || ""}`.toLowerCase(),
    }
  })
}

export function FBOsProvider({ children }: { children: React.ReactNode }) {
  const [fbos, setFBOs] = React.useState<FBO[]>([])
  const [fboOptions, setFBOOptions] = React.useState<FBOOption[]>([])
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
        const cachedFBOs = await getAllFBOs()
        if (cachedFBOs.length > 0) {
          setFBOs(cachedFBOs)
          setFBOOptions(formatFBOOptions(cachedFBOs))
        }
      } catch (err) {
        console.error("Error loading FBOs from cache:", err)
      }
    }

    loadFromCache()
  }, [])

  const fetchFBOs = React.useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      if (isOnline) {
        const params = new URLSearchParams()
        if (search?.trim()) {
          params.append("search", search.trim())
        }
        params.append("limit", "10000")

        const data: FBOsResponse = await apiCallJson(`/fbos?${params.toString()}`)
        const allFBOs = data.fbos || []

        setFBOs(allFBOs)
        setFBOOptions(formatFBOOptions(allFBOs))

        // Cache to IndexedDB
        if (!search?.trim() && isIndexedDBAvailable()) {
          await saveFBOs(allFBOs)
          await updateCacheTimestamp(CACHE_KEY, CACHE_DURATIONS.fbos)
        }
      } else {
        // Offline: load from cache
        if (isIndexedDBAvailable()) {
          const cachedFBOs = await getAllFBOs()
          let filtered = cachedFBOs

          if (search?.trim()) {
            const searchLower = search.toLowerCase()
            filtered = cachedFBOs.filter(
              (f) =>
                f.fbo_name.toLowerCase().includes(searchLower) ||
                f.airport_code_iata?.toLowerCase().includes(searchLower) ||
                f.airport_code_icao?.toLowerCase().includes(searchLower) ||
                f.airport_name?.toLowerCase().includes(searchLower)
            )
          }

          setFBOs(filtered)
          setFBOOptions(formatFBOOptions(filtered))
        }
      }
    } catch (err) {
      console.error("Error fetching FBOs:", err)

      // Fallback to cache
      if (isIndexedDBAvailable()) {
        const cachedFBOs = await getAllFBOs()
        if (cachedFBOs.length > 0) {
          setFBOs(cachedFBOs)
          setFBOOptions(formatFBOOptions(cachedFBOs))
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [isOnline])

  const getFBOById = React.useCallback((id: number) => {
    return fbos.find(f => f.id === id)
  }, [fbos])

  const getFBOOptionById = React.useCallback((id: number) => {
    return fboOptions.find(opt => opt.value === id.toString())
  }, [fboOptions])

  const createFBO = React.useCallback(async (fboData: Omit<FBO, "id">): Promise<FBO | null> => {
    try {
      if (isOnline) {
        // Backend returns the FBO directly, not wrapped in { fbo: FBO }
        const response = await apiCallJson<FBO>("/fbos", {
          method: "POST",
          body: JSON.stringify(fboData),
        })
        // Check if response is the FBO directly (has id and fbo_name)
        const fbo = response && 'id' in response && 'fbo_name' in response 
          ? response 
          : (response as any)?.fbo

        if (fbo) {
          setFBOs(prev => [...prev, fbo])
          setFBOOptions(prev => [...prev, ...formatFBOOptions([fbo])])
          if (isIndexedDBAvailable()) {
            const allFBOs = await getAllFBOs()
            await saveFBOs([...allFBOs, fbo])
          }
          return fbo
        }
      } else if (isIndexedDBAvailable()) {
        const cached = await createOfflineFBO(fboData)
        const tempFBO = { ...cached, id: -Date.now() } as FBO
        setFBOs(prev => [...prev, tempFBO])
        setFBOOptions(prev => [...prev, ...formatFBOOptions([tempFBO])])
        return tempFBO
      }
      return null
    } catch (err) {
      console.error("Error creating FBO:", err)
      throw err
    }
  }, [isOnline])

  const updateFBO = React.useCallback(async (id: number, updates: Partial<FBO>): Promise<FBO | null> => {
    try {
      if (isOnline && id > 0) {
        // Backend returns the FBO directly, not wrapped in { fbo: FBO }
        const response = await apiCallJson<FBO>(`/fbos/${id}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        })
        // Check if response is the FBO directly (has id and fbo_name)
        const fbo = response && 'id' in response && 'fbo_name' in response 
          ? response 
          : (response as any)?.fbo

        if (fbo) {
          setFBOs(prev => prev.map(f => f.id === id ? fbo : f))
          setFBOOptions(formatFBOOptions(fbos.map(f => f.id === id ? fbo : f)))
          if (isIndexedDBAvailable()) {
            const allFBOs = await getAllFBOs()
            await saveFBOs(allFBOs.map(f => f.id === id ? fbo : f))
          }
          return fbo
        }
      } else if (isIndexedDBAvailable()) {
        const updated = await updateOfflineFBO(id, updates)
        if (updated) {
          setFBOs(prev => prev.map(f => f.id === id ? updated : f))
          setFBOOptions(formatFBOOptions(fbos.map(f => f.id === id ? updated : f)))
          return updated
        }
      }
      return null
    } catch (err) {
      console.error("Error updating FBO:", err)
      throw err
    }
  }, [isOnline, fbos])

  return (
    <FBOsContext.Provider value={{
      fbos,
      fboOptions,
      isLoading,
      isOffline: !isOnline,
      fetchFBOs,
      getFBOById,
      getFBOOptionById,
      createFBO,
      updateFBO
    }}>
      {children}
    </FBOsContext.Provider>
  )
}

export function useFBOs() {
  const context = React.useContext(FBOsContext)
  if (!context) {
    throw new Error("useFBOs must be used within FBOsProvider")
  }
  return context
}

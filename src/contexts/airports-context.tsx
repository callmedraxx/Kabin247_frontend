"use client"

import * as React from "react"
import { apiCallJson } from "@/lib/api-client"
import {
  getAllAirports,
  saveAirports,
  updateCacheTimestamp,
  isIndexedDBAvailable,
} from "@/lib/pwa/db"
import {
  createOfflineAirport,
  updateOfflineAirport,
} from "@/lib/pwa/sync-queue"
import { CACHE_DURATIONS } from "@/lib/pwa/types"

interface Airport {
  id: number
  airport_name: string
  fbo_name: string
  airport_code_iata: string | null
  airport_code_icao: string | null
}

interface AirportsResponse {
  airports: Airport[]
  total: number
}

type AirportOption = {
  value: string
  label: string
  searchText?: string
}

type AirportsContextType = {
  airports: Airport[]
  airportOptions: AirportOption[]
  isLoading: boolean
  isOffline: boolean
  fetchAirports: (search?: string) => Promise<void>
  getAirportById: (id: number) => Airport | undefined
  getAirportOptionById: (id: number) => AirportOption | undefined
  createAirport: (airportData: Omit<Airport, "id">) => Promise<Airport | null>
  updateAirport: (id: number, updates: Partial<Airport>) => Promise<Airport | null>
}

const AirportsContext = React.createContext<AirportsContextType | undefined>(undefined)

const CACHE_KEY = "airports"

// Helper function to decode HTML entities
const decodeHtmlEntities = (text: string): string => {
  if (typeof document === "undefined") return text
  const textarea = document.createElement("textarea")
  textarea.innerHTML = text
  return textarea.value
}

function formatAirportOptions(airports: Airport[]): AirportOption[] {
  return airports.map((airport) => {
    const codes = [
      airport.airport_code_iata,
      airport.airport_code_icao,
    ].filter(Boolean).join("/")

    const decodedAirportName = decodeHtmlEntities(airport.airport_name)

    let label = ""
    if (codes) {
      label = `${codes} - ${decodedAirportName}`
    } else {
      label = decodedAirportName
    }

    return {
      value: airport.id.toString(),
      label,
      searchText: `${decodedAirportName} ${codes} ${airport.fbo_name || ""}`.toLowerCase(),
    }
  })
}

export function AirportsProvider({ children }: { children: React.ReactNode }) {
  const [airports, setAirports] = React.useState<Airport[]>([])
  const [airportOptions, setAirportOptions] = React.useState<AirportOption[]>([])
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
        const cachedAirports = await getAllAirports()
        if (cachedAirports.length > 0) {
          setAirports(cachedAirports)
          setAirportOptions(formatAirportOptions(cachedAirports))
        }
      } catch (err) {
        console.error("Error loading airports from cache:", err)
      }
    }

    loadFromCache()
  }, [])

  const fetchAirports = React.useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      if (isOnline) {
        const params = new URLSearchParams()
        if (search?.trim()) {
          params.append("search", search.trim())
        }
        params.append("limit", "10000")

        const data: AirportsResponse = await apiCallJson(`/airports?${params.toString()}`)
        const allAirports = data.airports || []

        setAirports(allAirports)
        setAirportOptions(formatAirportOptions(allAirports))

        // Cache to IndexedDB
        if (!search?.trim() && isIndexedDBAvailable()) {
          await saveAirports(allAirports)
          await updateCacheTimestamp(CACHE_KEY, CACHE_DURATIONS.airports)
        }
      } else {
        // Offline: load from cache
        if (isIndexedDBAvailable()) {
          const cachedAirports = await getAllAirports()
          let filtered = cachedAirports

          if (search?.trim()) {
            const searchLower = search.toLowerCase()
            filtered = cachedAirports.filter(
              (a) =>
                a.airport_name.toLowerCase().includes(searchLower) ||
                a.airport_code_iata?.toLowerCase().includes(searchLower) ||
                a.airport_code_icao?.toLowerCase().includes(searchLower) ||
                a.fbo_name?.toLowerCase().includes(searchLower)
            )
          }

          setAirports(filtered)
          setAirportOptions(formatAirportOptions(filtered))
        }
      }
    } catch (err) {
      console.error("Error fetching airports:", err)

      // Fallback to cache
      if (isIndexedDBAvailable()) {
        const cachedAirports = await getAllAirports()
        if (cachedAirports.length > 0) {
          setAirports(cachedAirports)
          setAirportOptions(formatAirportOptions(cachedAirports))
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [isOnline])

  const getAirportById = React.useCallback((id: number) => {
    return airports.find(a => a.id === id)
  }, [airports])

  const getAirportOptionById = React.useCallback((id: number) => {
    return airportOptions.find(opt => opt.value === id.toString())
  }, [airportOptions])

  const createAirport = React.useCallback(async (airportData: Omit<Airport, "id">): Promise<Airport | null> => {
    try {
      if (isOnline) {
        const response = await apiCallJson<{ airport: Airport }>("/airports", {
          method: "POST",
          body: JSON.stringify(airportData),
        })
        if (response.airport) {
          setAirports(prev => [...prev, response.airport])
          setAirportOptions(prev => [...prev, ...formatAirportOptions([response.airport])])
          if (isIndexedDBAvailable()) {
            const allAirports = await getAllAirports()
            await saveAirports([...allAirports, response.airport])
          }
          return response.airport
        }
      } else if (isIndexedDBAvailable()) {
        const cached = await createOfflineAirport(airportData)
        const tempAirport = { ...cached, id: -Date.now() } as Airport
        setAirports(prev => [...prev, tempAirport])
        setAirportOptions(prev => [...prev, ...formatAirportOptions([tempAirport])])
        return tempAirport
      }
      return null
    } catch (err) {
      console.error("Error creating airport:", err)
      throw err
    }
  }, [isOnline])

  const updateAirport = React.useCallback(async (id: number, updates: Partial<Airport>): Promise<Airport | null> => {
    try {
      if (isOnline && id > 0) {
        const response = await apiCallJson<{ airport: Airport }>(`/airports/${id}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        })
        if (response.airport) {
          setAirports(prev => prev.map(a => a.id === id ? response.airport : a))
          setAirportOptions(formatAirportOptions(airports.map(a => a.id === id ? response.airport : a)))
          if (isIndexedDBAvailable()) {
            const allAirports = await getAllAirports()
            await saveAirports(allAirports.map(a => a.id === id ? response.airport : a))
          }
          return response.airport
        }
      } else if (isIndexedDBAvailable()) {
        const updated = await updateOfflineAirport(id, updates)
        if (updated) {
          setAirports(prev => prev.map(a => a.id === id ? updated : a))
          setAirportOptions(formatAirportOptions(airports.map(a => a.id === id ? updated : a)))
          return updated
        }
      }
      return null
    } catch (err) {
      console.error("Error updating airport:", err)
      throw err
    }
  }, [isOnline, airports])

  return (
    <AirportsContext.Provider value={{
      airports,
      airportOptions,
      isLoading,
      isOffline: !isOnline,
      fetchAirports,
      getAirportById,
      getAirportOptionById,
      createAirport,
      updateAirport
    }}>
      {children}
    </AirportsContext.Provider>
  )
}

export function useAirports() {
  const context = React.useContext(AirportsContext)
  if (!context) {
    throw new Error("useAirports must be used within AirportsProvider")
  }
  return context
}

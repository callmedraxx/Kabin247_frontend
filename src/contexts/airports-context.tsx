"use client"

import * as React from "react"
import { apiCallJson } from "@/lib/api-client"

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
  fetchAirports: (search?: string) => Promise<void>
  getAirportById: (id: number) => Airport | undefined
  getAirportOptionById: (id: number) => AirportOption | undefined
}

const AirportsContext = React.createContext<AirportsContextType | undefined>(undefined)

// Helper function to decode HTML entities
const decodeHtmlEntities = (text: string): string => {
  if (typeof document === "undefined") return text
  const textarea = document.createElement("textarea")
  textarea.innerHTML = text
  return textarea.value
}

export function AirportsProvider({ children }: { children: React.ReactNode }) {
  const [airports, setAirports] = React.useState<Airport[]>([])
  const [airportOptions, setAirportOptions] = React.useState<AirportOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const fetchAirports = React.useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search?.trim()) {
        params.append("search", search.trim())
      }
      // Fetch ALL airports - no limit
      params.append("limit", "10000") // High limit to get all
      
      const data: AirportsResponse = await apiCallJson(`/airports?${params.toString()}`)
      const allAirports = data.airports || []
      
      setAirports(allAirports)
      
      // Format for combobox
      const options = allAirports.map((airport) => {
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
      
      setAirportOptions(options)
    } catch (err) {
      console.error("Error fetching airports:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getAirportById = React.useCallback((id: number) => {
    return airports.find(a => a.id === id)
  }, [airports])

  const getAirportOptionById = React.useCallback((id: number) => {
    return airportOptions.find(opt => opt.value === id.toString())
  }, [airportOptions])

  return (
    <AirportsContext.Provider value={{ 
      airports, 
      airportOptions, 
      isLoading, 
      fetchAirports,
      getAirportById,
      getAirportOptionById
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


"use client"

import * as React from "react"
import { apiCallJson } from "@/lib/api-client"

interface Caterer {
  id: number
  caterer_name: string
  caterer_number: string
  caterer_email: string | null
  airport_code_iata: string | null
  airport_code_icao: string | null
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
  fetchCaterers: (search?: string) => Promise<void>
  getCatererById: (id: number) => Caterer | undefined
  getCatererOptionById: (id: number) => CatererOption | undefined
}

const CaterersContext = React.createContext<CaterersContextType | undefined>(undefined)

export function CaterersProvider({ children }: { children: React.ReactNode }) {
  const [caterers, setCaterers] = React.useState<Caterer[]>([])
  const [catererOptions, setCatererOptions] = React.useState<CatererOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const fetchCaterers = React.useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search?.trim()) {
        params.append("search", search.trim())
      }
      // Fetch ALL caterers - no limit
      params.append("limit", "10000") // High limit to get all
      
      const data: CaterersResponse = await apiCallJson(`/caterers?${params.toString()}`)
      const allCaterers = data.caterers || []
      
      setCaterers(allCaterers)
      
      // Format for combobox
      const options = allCaterers.map((caterer) => {
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
      
      setCatererOptions(options)
    } catch (err) {
      console.error("Error fetching caterers:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getCatererById = React.useCallback((id: number) => {
    return caterers.find(c => c.id === id)
  }, [caterers])

  const getCatererOptionById = React.useCallback((id: number) => {
    return catererOptions.find(opt => opt.value === id.toString())
  }, [catererOptions])

  return (
    <CaterersContext.Provider value={{ 
      caterers, 
      catererOptions, 
      isLoading, 
      fetchCaterers,
      getCatererById,
      getCatererOptionById
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


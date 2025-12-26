"use client"

import * as React from "react"
import { apiCallJson } from "@/lib/api-client"

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
  fetchFBOs: (search?: string) => Promise<void>
  getFBOById: (id: number) => FBO | undefined
  getFBOOptionById: (id: number) => FBOOption | undefined
}

const FBOsContext = React.createContext<FBOsContextType | undefined>(undefined)

export function FBOsProvider({ children }: { children: React.ReactNode }) {
  const [fbos, setFBOs] = React.useState<FBO[]>([])
  const [fboOptions, setFBOOptions] = React.useState<FBOOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const fetchFBOs = React.useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search?.trim()) {
        params.append("search", search.trim())
      }
      // Fetch ALL FBOs - no limit
      params.append("limit", "10000") // High limit to get all
      
      const data: FBOsResponse = await apiCallJson(`/fbos?${params.toString()}`)
      const allFBOs = data.fbos || []
      
      setFBOs(allFBOs)
      
      // Format for combobox
      const options = allFBOs.map((fbo) => {
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
      
      setFBOOptions(options)
    } catch (err) {
      console.error("Error fetching FBOs:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getFBOById = React.useCallback((id: number) => {
    return fbos.find(f => f.id === id)
  }, [fbos])

  const getFBOOptionById = React.useCallback((id: number) => {
    return fboOptions.find(opt => opt.value === id.toString())
  }, [fboOptions])

  return (
    <FBOsContext.Provider value={{ 
      fbos, 
      fboOptions, 
      isLoading, 
      fetchFBOs,
      getFBOById,
      getFBOOptionById
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


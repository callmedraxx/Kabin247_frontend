"use client"

import * as React from "react"
import { apiCallJson } from "@/lib/api-client"

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
  fetchClients: (search?: string) => Promise<void>
  getClientById: (id: number) => Client | undefined
  getClientOptionById: (id: number) => ClientOption | undefined
}

const ClientsContext = React.createContext<ClientsContextType | undefined>(undefined)

export function ClientsProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = React.useState<Client[]>([])
  const [clientOptions, setClientOptions] = React.useState<ClientOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const fetchClients = React.useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search?.trim()) {
        params.append("search", search.trim())
      }
      // Fetch ALL clients - no limit
      params.append("limit", "10000") // High limit to get all
      
      const data: ClientsResponse = await apiCallJson(`/clients?${params.toString()}`)
      const allClients = data.clients || []
      
      setClients(allClients)
      
      // Format for combobox
      const options = allClients.map((client) => ({
        value: client.id.toString(),
        label: client.full_name,
      }))
      
      setClientOptions(options)
    } catch (err) {
      console.error("Error fetching clients:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getClientById = React.useCallback((id: number) => {
    return clients.find(c => c.id === id)
  }, [clients])

  const getClientOptionById = React.useCallback((id: number) => {
    return clientOptions.find(opt => opt.value === id.toString())
  }, [clientOptions])

  return (
    <ClientsContext.Provider value={{ 
      clients, 
      clientOptions, 
      isLoading, 
      fetchClients,
      getClientById,
      getClientOptionById
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


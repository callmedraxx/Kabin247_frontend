"use client"

import * as React from "react"
import { apiCallJson } from "@/lib/api-client"

interface MenuItem {
  id: number
  item_name: string
  item_description: string | null
  category: string
  variants: Array<{
    id: number
    menu_item_id?: number
    portion_size: string
    price: number
    sort_order?: number
    caterer_prices?: Array<{
      caterer_id: number
      price: number
    }>
  }>
}

interface MenuItemsResponse {
  menu_items: MenuItem[]
  total: number
}

type MenuItemOption = {
  value: string
  label: string
}

type MenuItemsContextType = {
  menuItems: MenuItem[]
  menuItemOptions: MenuItemOption[]
  isLoading: boolean
  fetchMenuItems: (search?: string) => Promise<MenuItem[]>
  getMenuItemById: (id: number) => MenuItem | undefined
  getMenuItemOptionById: (id: number) => MenuItemOption | undefined
  getMenuItemByName: (name: string) => MenuItem | undefined
}

const MenuItemsContext = React.createContext<MenuItemsContextType | undefined>(undefined)

export function MenuItemsProvider({ children }: { children: React.ReactNode }) {
  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([])
  const [menuItemOptions, setMenuItemOptions] = React.useState<MenuItemOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const fetchMenuItems = React.useCallback(async (search?: string): Promise<MenuItem[]> => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search?.trim()) {
        params.append("search", search.trim())
      }
      params.append("is_active", "true")
      // Fetch ALL menu items - no limit
      params.append("limit", "10000") // High limit to get all
      
      const data: MenuItemsResponse = await apiCallJson(`/menu-items?${params.toString()}`)
      const allMenuItems = data.menu_items || []
      
      setMenuItems(allMenuItems)
      
      // Format for combobox
      const options = allMenuItems.map((item) => ({
        value: item.id.toString(),
        label: item.item_name,
      }))
      
      setMenuItemOptions(options)
      
      // Return the data so callers can use it immediately without waiting for state
      return allMenuItems
    } catch (err) {
      console.error("Error fetching menu items:", err)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getMenuItemById = React.useCallback((id: number) => {
    return menuItems.find(mi => mi.id === id)
  }, [menuItems])

  const getMenuItemOptionById = React.useCallback((id: number) => {
    return menuItemOptions.find(opt => opt.value === id.toString())
  }, [menuItemOptions])

  const getMenuItemByName = React.useCallback((name: string) => {
    return menuItems.find(mi => 
      mi.item_name?.toLowerCase() === name?.toLowerCase()
    )
  }, [menuItems])

  return (
    <MenuItemsContext.Provider value={{ 
      menuItems, 
      menuItemOptions, 
      isLoading, 
      fetchMenuItems,
      getMenuItemById,
      getMenuItemOptionById,
      getMenuItemByName
    }}>
      {children}
    </MenuItemsContext.Provider>
  )
}

export function useMenuItems() {
  const context = React.useContext(MenuItemsContext)
  if (!context) {
    throw new Error("useMenuItems must be used within MenuItemsProvider")
  }
  return context
}


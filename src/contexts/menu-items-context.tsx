"use client"

import * as React from "react"
import { apiCallJson } from "@/lib/api-client"
import {
  getAllMenuItems,
  saveMenuItems,
  updateCacheTimestamp,
  isIndexedDBAvailable,
} from "@/lib/pwa/db"
import {
  createOfflineMenuItem,
  updateOfflineMenuItem,
} from "@/lib/pwa/sync-queue"
import { CACHE_DURATIONS } from "@/lib/pwa/types"

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
  isOffline: boolean
  fetchMenuItems: (search?: string) => Promise<MenuItem[]>
  getMenuItemById: (id: number) => MenuItem | undefined
  getMenuItemOptionById: (id: number) => MenuItemOption | undefined
  getMenuItemByName: (name: string) => MenuItem | undefined
  createMenuItem: (menuItemData: Omit<MenuItem, "id">) => Promise<MenuItem | null>
  updateMenuItem: (id: number, updates: Partial<MenuItem>) => Promise<MenuItem | null>
}

const MenuItemsContext = React.createContext<MenuItemsContextType | undefined>(undefined)

const CACHE_KEY = "menuItems"

export function MenuItemsProvider({ children }: { children: React.ReactNode }) {
  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([])
  const [menuItemOptions, setMenuItemOptions] = React.useState<MenuItemOption[]>([])
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
        const cachedMenuItems = await getAllMenuItems()
        if (cachedMenuItems.length > 0) {
          setMenuItems(cachedMenuItems)
          setMenuItemOptions(
            cachedMenuItems.map((item) => ({
              value: item.id.toString(),
              label: item.item_name,
            }))
          )
        }
      } catch (err) {
        console.error("Error loading menu items from cache:", err)
      }
    }

    loadFromCache()
  }, [])

  const fetchMenuItems = React.useCallback(async (search?: string): Promise<MenuItem[]> => {
    setIsLoading(true)
    try {
      if (isOnline) {
        const params = new URLSearchParams()
        if (search?.trim()) {
          params.append("search", search.trim())
        }
        params.append("is_active", "true")
        params.append("limit", "10000")

        const data: MenuItemsResponse = await apiCallJson(`/menu-items?${params.toString()}`)
        const allMenuItems = data.menu_items || []

        setMenuItems(allMenuItems)
        setMenuItemOptions(
          allMenuItems.map((item) => ({
            value: item.id.toString(),
            label: item.item_name,
          }))
        )

        // Cache to IndexedDB
        if (!search?.trim() && isIndexedDBAvailable()) {
          await saveMenuItems(allMenuItems)
          await updateCacheTimestamp(CACHE_KEY, CACHE_DURATIONS.menuItems)
        }

        return allMenuItems
      } else {
        // Offline: load from cache
        if (isIndexedDBAvailable()) {
          const cachedMenuItems = await getAllMenuItems()
          let filtered = cachedMenuItems

          if (search?.trim()) {
            const searchLower = search.toLowerCase()
            filtered = cachedMenuItems.filter(
              (m) =>
                m.item_name.toLowerCase().includes(searchLower) ||
                m.item_description?.toLowerCase().includes(searchLower) ||
                m.category?.toLowerCase().includes(searchLower)
            )
          }

          setMenuItems(filtered)
          setMenuItemOptions(
            filtered.map((item) => ({
              value: item.id.toString(),
              label: item.item_name,
            }))
          )

          return filtered
        }
        return []
      }
    } catch (err) {
      console.error("Error fetching menu items:", err)

      // Fallback to cache
      if (isIndexedDBAvailable()) {
        const cachedMenuItems = await getAllMenuItems()
        if (cachedMenuItems.length > 0) {
          setMenuItems(cachedMenuItems)
          setMenuItemOptions(
            cachedMenuItems.map((item) => ({
              value: item.id.toString(),
              label: item.item_name,
            }))
          )
          return cachedMenuItems
        }
      }
      return []
    } finally {
      setIsLoading(false)
    }
  }, [isOnline])

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

  const createMenuItem = React.useCallback(async (menuItemData: Omit<MenuItem, "id">): Promise<MenuItem | null> => {
    try {
      if (isOnline) {
        const response = await apiCallJson<{ menu_item: MenuItem }>("/menu-items", {
          method: "POST",
          body: JSON.stringify(menuItemData),
        })
        if (response.menu_item) {
          setMenuItems(prev => [...prev, response.menu_item])
          setMenuItemOptions(prev => [...prev, {
            value: response.menu_item.id.toString(),
            label: response.menu_item.item_name,
          }])
          if (isIndexedDBAvailable()) {
            const allMenuItems = await getAllMenuItems()
            await saveMenuItems([...allMenuItems, response.menu_item])
          }
          return response.menu_item
        }
      } else if (isIndexedDBAvailable()) {
        const cached = await createOfflineMenuItem(menuItemData)
        const tempMenuItem = { ...cached, id: -Date.now() } as MenuItem
        setMenuItems(prev => [...prev, tempMenuItem])
        setMenuItemOptions(prev => [...prev, {
          value: tempMenuItem.id.toString(),
          label: tempMenuItem.item_name,
        }])
        return tempMenuItem
      }
      return null
    } catch (err) {
      console.error("Error creating menu item:", err)
      throw err
    }
  }, [isOnline])

  const updateMenuItem = React.useCallback(async (id: number, updates: Partial<MenuItem>): Promise<MenuItem | null> => {
    try {
      if (isOnline && id > 0) {
        const response = await apiCallJson<{ menu_item: MenuItem }>(`/menu-items/${id}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        })
        if (response.menu_item) {
          setMenuItems(prev => prev.map(m => m.id === id ? response.menu_item : m))
          setMenuItemOptions(prev => prev.map(opt =>
            opt.value === id.toString()
              ? { ...opt, label: response.menu_item.item_name }
              : opt
          ))
          if (isIndexedDBAvailable()) {
            const allMenuItems = await getAllMenuItems()
            await saveMenuItems(allMenuItems.map(m => m.id === id ? response.menu_item : m))
          }
          return response.menu_item
        }
      } else if (isIndexedDBAvailable()) {
        const updated = await updateOfflineMenuItem(id, updates)
        if (updated) {
          setMenuItems(prev => prev.map(m => m.id === id ? updated : m))
          setMenuItemOptions(prev => prev.map(opt =>
            opt.value === id.toString()
              ? { ...opt, label: updated.item_name }
              : opt
          ))
          return updated
        }
      }
      return null
    } catch (err) {
      console.error("Error updating menu item:", err)
      throw err
    }
  }, [isOnline])

  return (
    <MenuItemsContext.Provider value={{
      menuItems,
      menuItemOptions,
      isLoading,
      isOffline: !isOnline,
      fetchMenuItems,
      getMenuItemById,
      getMenuItemOptionById,
      getMenuItemByName,
      createMenuItem,
      updateMenuItem
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

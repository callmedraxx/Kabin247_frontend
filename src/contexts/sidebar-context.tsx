"use client"

import * as React from "react"

export type SidebarCategory = {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: {
    title: string
    url: string
  }[]
} | null

type SidebarContextType = {
  selectedCategory: SidebarCategory
  setSelectedCategory: (category: SidebarCategory) => void
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined)

export function SidebarCategoryProvider({ children }: { children: React.ReactNode }) {
  const [selectedCategory, setSelectedCategory] = React.useState<SidebarCategory>(null)

  return (
    <SidebarContext.Provider value={{ selectedCategory, setSelectedCategory }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebarCategory() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebarCategory must be used within SidebarCategoryProvider")
  }
  return context
}


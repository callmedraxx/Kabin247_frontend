"use client"

import * as React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Home, BarChart3, Users, Settings, ShoppingCart, FileText, UserCog } from "lucide-react"
import { useSidebarCategory } from "@/contexts/sidebar-context"
import { useSidebar } from "@/components/ui/sidebar"

interface DashboardTabsProps {
  defaultTab?: string
  children?: React.ReactNode
}

export function DashboardTabs({ defaultTab, children }: DashboardTabsProps) {
  const { selectedCategory, setSelectedCategory } = useSidebarCategory()
  const { state } = useSidebar()
  const sidebarCollapsed = state === "collapsed"

  // Clear selected category when sidebar expands
  React.useEffect(() => {
    if (!sidebarCollapsed && selectedCategory) {
      setSelectedCategory(null)
    }
  }, [sidebarCollapsed, selectedCategory, setSelectedCategory])
  
  // Use selected category items if sidebar is collapsed and category is selected
  // Otherwise use default tabs
  const tabs = sidebarCollapsed && selectedCategory && selectedCategory.items.length > 0
    ? selectedCategory.items.map((item) => ({
        value: item.url.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
        label: item.title,
        url: item.url,
        icon: selectedCategory.icon,
      }))
    : [
        { value: "create-new-order", label: "Create new order", icon: ShoppingCart, url: "/admin/pos" },
        { value: "orders", label: "Orders", icon: FileText, url: "/admin/order-status/all-orders" },
        { value: "client", label: "Client", icon: UserCog, url: "/admin/customers" },
      ]

  const defaultTabValue = defaultTab || tabs[0]?.value || "create-new-order"

  return (
    <Tabs defaultValue={defaultTabValue} key={selectedCategory?.title || "default"} className="w-full">
      <TabsList 
        className="flex w-full flex-nowrap bg-muted/50 gap-1"
      >
        {tabs.map((tab) => (
          <TabsTrigger 
            key={tab.value} 
            value={tab.value} 
            className="flex flex-1 min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 transition-colors hover:bg-primary/20 hover:text-primary-foreground"
            onClick={() => {
              if (sidebarCollapsed && selectedCategory && tab.url !== "#") {
                window.location.href = tab.url
              }
            }}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline truncate text-xs sm:text-sm">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  )
}

// Export TabsContent for use in pages
export { TabsContent as DashboardTabsContent } from "@/components/ui/tabs"


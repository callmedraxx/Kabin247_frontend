"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar"
import { useSidebarCategory } from "@/contexts/sidebar-context"
import { cn } from "@/lib/utils"
import { ChevronRight, ShoppingCart, Utensils, Tag, TrendingUp, UserCog, Plane, Settings } from "lucide-react"
import { Separator } from "@/components/ui/separator"

// Navigation structure matching app-sidebar.tsx
const navStructure = [
  {
    title: "Order Management",
    icon: ShoppingCart,
    items: [
      { title: "Create new order", url: "/admin/pos" },
      { title: "Orders", url: "/admin/order-status/all-orders" },
      { title: "Order history", url: "/admin/order-history" },
    ],
  },
  {
    title: "Menu Management",
    icon: Utensils,
    items: [
      { title: "Menu items", url: "/admin/menu-items" },
      { title: "Add-on items", url: "/admin/addon-items" },
      { title: "Categories", url: "/admin/categories" },
      { title: "Tax and charges", url: "/admin/tax-and-charges" },
      { title: "Delivery fees", url: "/admin/delivery-fees" },
      { title: "Stock and Inventory", url: "/admin/stock-inventory" },
    ],
  },
  {
    title: "Promotions",
    icon: Tag,
    items: [
      { title: "Promotions", url: "/admin/promotions" },
    ],
  },
  {
    title: "Report and Analysis",
    icon: TrendingUp,
    items: [
      { title: "Earning report", url: "/admin/earning-report" },
      { title: "Order report", url: "/admin/order-report" },
    ],
  },
  {
    title: "User Management",
    icon: UserCog,
    items: [
      { title: "Clients", url: "/admin/customers" },
      { title: "Caterer", url: "/admin/caterers" },
      { title: "Employees", url: "/admin/employees" },
    ],
  },
  {
    title: "Airports",
    icon: Plane,
    items: [
      { title: "Airports", url: "/admin/airports" },
    ],
  },
  {
    title: "System",
    icon: Settings,
    items: [
      { title: "Languages", url: "/admin/languages" },
      { title: "Payment Methods", url: "/admin/payment-methods" },
      { title: "Settings", url: "/admin/settings" },
    ],
  },
]

interface HeaderNavProps {
  title: string
  className?: string
}

export function HeaderNav({ title, className }: HeaderNavProps) {
  const { state } = useSidebar()
  const { selectedCategory, setSelectedCategory } = useSidebarCategory()
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)
  const sidebarCollapsed = state === "collapsed"

  // Ensure we only render conditional content after mount to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Find the current category based on pathname
  const currentCategory = React.useMemo(() => {
    for (const category of navStructure) {
      const matchingItem = category.items.find(item => pathname === item.url)
      if (matchingItem) {
        return category
      }
    }
    return null
  }, [pathname])

  // Auto-set the category when sidebar is collapsed and we're on a valid page
  React.useEffect(() => {
    if (sidebarCollapsed && currentCategory && !selectedCategory) {
      setSelectedCategory({
        title: currentCategory.title,
        icon: currentCategory.icon,
        items: currentCategory.items,
      })
    }
  }, [sidebarCollapsed, currentCategory, selectedCategory, setSelectedCategory])

  // Use selectedCategory if available, otherwise use currentCategory
  const displayCategory = selectedCategory || (currentCategory ? {
    title: currentCategory.title,
    icon: currentCategory.icon,
    items: currentCategory.items,
  } : null)

  return (
    <header className={cn(
      "flex h-10 shrink-0 items-center gap-2 border-b border-border/40 px-4 md:pl-0 md:peer-data-[collapsible=icon]:pl-2",
      className
    )}>
      <div className="flex items-center gap-2 w-full overflow-hidden">
        <SidebarTrigger className="h-7 w-7 shrink-0" />
        <Separator orientation="vertical" className="h-4 bg-border/50 shrink-0" />
        
        {/* Show category navigation when sidebar is collapsed */}
        {mounted && sidebarCollapsed && displayCategory ? (
          <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
            {/* Category Icon and Title */}
            <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
              {displayCategory.icon && (
                <displayCategory.icon className="h-3.5 w-3.5" />
              )}
              <span className="text-xs font-medium hidden sm:inline">{displayCategory.title}</span>
            </div>
            
            <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
            
            {/* Sub-navigation Links */}
            <nav className="flex items-center gap-0.5">
              {displayCategory.items?.map((item) => {
                const isActive = pathname === item.url
                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {item.title}
                  </Link>
                )
              })}
            </nav>
          </div>
        ) : (
          /* Default title when sidebar is expanded or no category */
          <h1 className="text-sm font-medium text-foreground truncate">{title}</h1>
        )}
      </div>
    </header>
  )
}

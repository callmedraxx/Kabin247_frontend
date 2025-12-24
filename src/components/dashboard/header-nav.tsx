"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar"
import { useSidebarCategory } from "@/contexts/sidebar-context"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { ChevronRight, ShoppingCart, Utensils, Tag, TrendingUp, UserCog, Plane, Settings, LogOut, User } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
  const router = useRouter()
  const { user, logout } = useAuth()
  const [mounted, setMounted] = React.useState(false)
  const sidebarCollapsed = state === "collapsed"

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const userInitial = user?.email?.[0]?.toUpperCase() || "U"
  const userName = user?.email?.split("@")[0] || "User"
  const userEmail = user?.email || "user@kabin247.com"
  const userRole = user?.role || "CSR"

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
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff&bold=true`} alt={userName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{userInitial}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userRole}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

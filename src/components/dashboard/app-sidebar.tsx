"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  BarChart3,
  Users,
  Settings,
  FileText,
  ShoppingCart,
  Utensils,
  Tag,
  TrendingUp,
  UserCog,
  Plane,
  Globe,
  CreditCard,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { useSidebarCategory } from "@/contexts/sidebar-context"
import { useSidebar } from "@/components/ui/sidebar"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"

const navDashboard = {
  title: "Dashboard",
  url: "/admin/dashboard",
  icon: Home,
}

const navMain = [
  {
    title: "Order Management",
    url: "#",
    icon: ShoppingCart,
    items: [
      {
        title: "Create new order",
        url: "/admin/pos",
      },
      {
        title: "Orders",
        url: "/admin/order-status/all-orders",
      },
      {
        title: "Order history",
        url: "/admin/order-history",
      },
    ],
  },
  {
    title: "Menu Management",
    url: "#",
    icon: Utensils,
    items: [
      {
        title: "Menu items",
        url: "/admin/menu-items",
      },
      {
        title: "Categories",
        url: "/admin/categories",
      },
      {
        title: "Tax and charges",
        url: "/admin/tax-and-charges",
      },
      {
        title: "Stock and Inventory",
        url: "/admin/stock-inventory",
      },
    ],
  },
  {
    title: "User Management",
    url: "#",
    icon: UserCog,
    items: [
      {
        title: "Clients",
        url: "/admin/customers",
      },
      {
        title: "Caterer",
        url: "/admin/caterers",
      },
    ],
  },
  {
    title: "Airports",
    url: "#",
    icon: Plane,
    items: [
      {
        title: "Airports",
        url: "/admin/airports",
      },
    ],
  },
]

function NavDashboard({
  item,
}: {
  item: {
    title: string
    url: string
    icon: LucideIcon
  }
}) {
  const { setSelectedCategory } = useSidebarCategory()
  const { state } = useSidebar()
  const pathname = usePathname()
  const sidebarCollapsed = state === "collapsed"
  const isActive = pathname === item.url

  const handleDashboardClick = () => {
    if (sidebarCollapsed) {
      setSelectedCategory(null)
    }
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={item.title} isActive={isActive} onClick={handleDashboardClick}>
            <Link href={item.url}>
              {item.icon && <item.icon />}
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const { setSelectedCategory } = useSidebarCategory()
  const { state } = useSidebar()
  const pathname = usePathname()
  const sidebarCollapsed = state === "collapsed"
  // Track open state for each collapsible
  const [openStates, setOpenStates] = React.useState<Record<string, boolean>>({})

  const handleCategoryClick = (e: React.MouseEvent, item: typeof items[0]) => {
    if (sidebarCollapsed && item.items && item.items.length > 0) {
      e.preventDefault()
      e.stopPropagation()
      setSelectedCategory({
        title: item.title,
        icon: item.icon || Home,
        items: item.items,
      })
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          // Check if any sub-item is active
          const hasActiveSubItem = item.items?.some((subItem) => pathname === subItem.url) || false
          // Check if the category itself is active (though categories usually don't have direct URLs)
          const isCategoryActive = pathname === item.url
          // Category is considered active if it has an active sub-item
          const isActive = hasActiveSubItem || isCategoryActive
          // Auto-expand if any sub-item is active, otherwise use stored state
          const isOpen = hasActiveSubItem || openStates[item.title] || false

          return (
            <Collapsible
              key={item.title}
              asChild
              open={isOpen}
              onOpenChange={(open) => {
                setOpenStates((prev) => ({ ...prev, [item.title]: open }))
              }}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton 
                    tooltip={item.title} 
                    isActive={isActive}
                    onClick={(e) => handleCategoryClick(e, item)}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsed=true]:!hidden group-data-[collapsed=true]:!w-0 group-data-[collapsed=true]:!max-w-0 group-data-[collapsed=true]:!overflow-hidden group-data-[collapsed=true]:!opacity-0 group-data-[collapsed=true]:!pointer-events-none group-data-[collapsed=true]:!absolute group-data-[collapsed=true]:!-z-10" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="group-data-[collapsed=true]:!hidden group-data-[collapsed=true]:!overflow-hidden">
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const isSubItemActive = pathname === subItem.url
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isSubItemActive}>
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src="https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff&bold=true" alt="Admin" />
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">A</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsed=true]:!hidden group-data-[collapsed=true]:!w-0 group-data-[collapsed=true]:!max-w-0 group-data-[collapsed=true]:!overflow-hidden">
                <span className="truncate font-medium">Admin</span>
                <span className="truncate text-xs">admin@kabin247.com</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="right"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src="https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff&bold=true" alt="Admin" />
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">A</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Admin</span>
                  <span className="truncate text-xs">admin@kabin247.com</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 overflow-hidden">
                  <Image 
                    src="/logo.png" 
                    alt="Kabin247" 
                    width={36} 
                    height={36} 
                    className="object-contain brightness-110 contrast-125 saturate-150"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight [&>span]:group-data-[collapsed=true]:!hidden [&>span]:group-data-[collapsed=true]:!w-0 [&>span]:group-data-[collapsed=true]:!max-w-0 [&>span]:group-data-[collapsed=true]:!overflow-hidden">
                  <span className="truncate font-semibold">Kabin247</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavDashboard item={navDashboard} />
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-center w-full px-2 py-2 group-data-[collapsed=true]:px-1">
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}


"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  options: { value: string; label: string; searchText?: string }[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  onAddNew?: () => void
  addNewLabel?: string
  onSearchChange?: (search: string) => void
  isLoading?: boolean
  onOpenChange?: (open: boolean) => void
  maxInitialItems?: number
  allowDeselect?: boolean
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  onAddNew,
  addNewLabel = "Add New",
  onSearchChange,
  isLoading = false,
  onOpenChange,
  maxInitialItems = 50,
  allowDeselect = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  // Track if the list is ready to render (for deferred rendering)
  const [isListReady, setIsListReady] = React.useState(false)
  const commandListRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  // Filter options based on search text (if searchText is provided)
  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options
    
    const query = search.toLowerCase()
    return options.filter((option) => {
      if (option.searchText) {
        return option.searchText.includes(query)
      }
      return option.label.toLowerCase().includes(query)
    })
  }, [options, search])
  
  // Limit displayed options to prevent rendering lag
  // Show all when searching, limit when showing full list
  const displayedOptions = React.useMemo(() => {
    if (search.trim()) {
      // When searching, show all filtered results (usually much smaller)
      return filteredOptions
    }
    // When not searching, limit to maxInitialItems
    return filteredOptions.slice(0, maxInitialItems)
  }, [filteredOptions, search, maxInitialItems])
  
  const hasMoreItems = !search.trim() && filteredOptions.length > maxInitialItems
  
  // Defer list rendering to allow popover to open immediately
  React.useEffect(() => {
    if (open) {
      // Reset ready state when opening
      setIsListReady(false)
      // Use requestAnimationFrame to defer rendering after popover is visible
      const frame = requestAnimationFrame(() => {
        setIsListReady(true)
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [open])

  // Ensure mouse wheel scrolling works on CommandList
  React.useEffect(() => {
    if (!open || !isListReady || !commandListRef.current) return

    const commandList = commandListRef.current as HTMLElement
    if (!commandList) return

    // Ensure it can receive wheel events and scroll
    commandList.style.pointerEvents = 'auto'
    commandList.style.overflowY = 'auto'
    
    // Add wheel event listener to prevent dialog from capturing it
    const handleWheel = (e: WheelEvent) => {
      const canScrollUp = commandList.scrollTop > 0
      const canScrollDown = commandList.scrollTop < (commandList.scrollHeight - commandList.clientHeight)
      
      // If we can scroll in the direction of the wheel, prevent propagation to dialog
      if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
        e.stopPropagation()
        e.preventDefault()
        // Manually scroll
        commandList.scrollTop += e.deltaY
      } else if ((e.deltaY < 0 && !canScrollUp) || (e.deltaY > 0 && !canScrollDown)) {
        // At the top or bottom, prevent dialog from scrolling
        e.stopPropagation()
      }
    }
    
    commandList.addEventListener('wheel', handleWheel, { passive: false, capture: true })
    
    return () => {
      commandList.removeEventListener('wheel', handleWheel, { capture: true } as any)
    }
  }, [open, isListReady])

  // Debounce search change callback to prevent too many API calls
  React.useEffect(() => {
    if (onSearchChange && open) {
      const timer = setTimeout(() => {
        onSearchChange(search)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [search, onSearchChange, open])
  
  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearch("")
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen)
      if (!newOpen) {
        setSearch("")
      }
      // Call the onOpenChange callback if provided
      onOpenChange?.(newOpen)
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-11 px-3 font-normal",
            "bg-muted/30 border-border/40 hover:bg-muted/50",
            "transition-all duration-200 ease-out",
            "hover:border-primary/30 hover:shadow-sm",
            open && "border-primary/50 ring-2 ring-primary/20 shadow-md",
            !selectedOption && "text-muted-foreground"
          )}
        >
          {selectedOption ? (
            <span className="truncate text-foreground">{selectedOption.label}</span>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className={cn(
            "ml-2 h-4 w-4 shrink-0 transition-transform duration-200",
            open ? "rotate-180 text-primary" : "text-muted-foreground"
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "w-[--radix-popover-trigger-width] p-0",
          "border-0 shadow-2xl shadow-black/40",
          "bg-popover backdrop-blur-md",
          "ring-1 ring-white/[0.05] rounded-xl",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-2",
          "duration-200"
        )}
        align="start"
        sideOffset={6}
        side="bottom"
        collisionPadding={8}
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus to keep popover open when typing
          e.preventDefault()
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <Command shouldFilter={false} className="bg-transparent">
          <div className="relative border-b border-border/30">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <CommandInput 
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={(newSearch) => {
                setSearch(newSearch)
              }}
              className="pl-9 h-11 border-0 bg-transparent focus:ring-0"
            />
          </div>
          <CommandList 
            ref={commandListRef}
            className="max-h-[300px] overflow-y-auto overflow-x-hidden" 
            style={{ 
              height: '300px', 
              maxHeight: '300px',
              pointerEvents: 'auto'
            }}
          >
            {isLoading || !isListReady ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading options...
              </div>
            ) : displayedOptions.length === 0 ? (
              <CommandEmpty>
                <div className="py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mx-auto mb-3">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                  {onAddNew && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 h-9 gap-2 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => {
                        setOpen(false)
                        onAddNew()
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      {addNewLabel}
                    </Button>
                  )}
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup className="p-1.5">
                {displayedOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.searchText || option.label}
                    onSelect={() => {
                      const shouldDeselect = allowDeselect && option.value === value
                      onValueChange(shouldDeselect ? "" : option.value)
                      setOpen(false)
                      setSearch("")
                    }}
                    className={cn(
                      "relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer",
                      "transition-all duration-150 ease-out",
                      "hover:bg-muted hover:text-foreground",
                      "data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary",
                      value === option.value && "bg-primary/10 text-primary font-medium",
                    )}
                  >
                    <div className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-md transition-all duration-150",
                      value === option.value 
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" 
                        : "bg-muted/50"
                    )}>
                      <Check className={cn(
                        "h-3 w-3 transition-all duration-150",
                        value === option.value ? "opacity-100 scale-100" : "opacity-0 scale-75"
                      )} />
                    </div>
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
                {hasMoreItems && (
                  <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-border/30 mt-1.5">
                    Showing {maxInitialItems} of {filteredOptions.length} • Type to search for more
                  </div>
                )}
                {onAddNew && (
                  <>
                    <div className="my-1.5 h-px bg-border/30" />
                    <CommandItem
                      onSelect={() => {
                        setOpen(false)
                        setSearch("")
                        onAddNew()
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer",
                        "text-primary hover:bg-primary/10",
                        "transition-all duration-150"
                      )}
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium">{addNewLabel}</span>
                    </CommandItem>
                  </>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}


"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface AutocompleteInputProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function AutocompleteInput({
  options,
  value,
  onChange,
  placeholder,
  className,
}: AutocompleteInputProps) {
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const filtered = React.useMemo(() => {
    if (!value.trim()) return options
    const q = value.toLowerCase()
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [options, value])

  const handleSelect = (opt: string) => {
    onChange(opt)
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <PopoverPrimitive.Root open={open && filtered.length > 0} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay close so onMouseDown on options fires first
            setTimeout(() => setOpen(false), 150)
          }}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          side="bottom"
          align="start"
          sideOffset={4}
          style={{ width: "var(--radix-popover-trigger-width)" }}
          className={cn(
            "z-50 overflow-hidden rounded-xl border border-border/40",
            "bg-popover shadow-2xl shadow-black/30 ring-1 ring-white/[0.05]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          )}
        >
          <ul className="max-h-48 overflow-y-auto py-1.5">
            {filtered.map((opt) => (
              <li
                key={opt}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(opt)
                }}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-muted",
                  opt === value && "bg-primary/10 text-primary font-medium"
                )}
              >
                {opt}
              </li>
            ))}
          </ul>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

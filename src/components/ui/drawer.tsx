"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { GripVertical } from "lucide-react"

import { cn } from "@/lib/utils"

const Drawer = ({
  shouldScaleBackground = true,
  direction = "bottom",
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root> & { direction?: "top" | "bottom" | "left" | "right" }) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    direction={direction}
    {...props}
  />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
      "animate-in fade-in-0 duration-300",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className
    )}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    side?: "top" | "bottom" | "left" | "right"
    resizable?: boolean
  }
>(({ className, children, side = "right", resizable = true, ...props }, ref) => {
  const [width, setWidth] = React.useState(760)
  const [isResizing, setIsResizing] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const minWidth = 400
  const maxWidth = typeof window !== "undefined" ? window.innerWidth * 0.9 : 1200

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = window.innerWidth - e.clientX
      setWidth(Math.min(Math.max(newWidth, minWidth), maxWidth))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "ew-resize"
      document.body.style.userSelect = "none"
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing, maxWidth])

  const sideClasses = {
    top: "inset-x-0 top-0 border-b rounded-b-2xl",
    bottom: "inset-x-0 bottom-0 border-t rounded-t-2xl",
    left: "inset-y-0 left-0 border-r rounded-r-2xl",
    right: "inset-y-0 right-0 border-l rounded-l-2xl",
  }

  const animationClasses = {
    top: "animate-in slide-in-from-top duration-300",
    bottom: "animate-in slide-in-from-bottom duration-300",
    left: "animate-in slide-in-from-left duration-300",
    right: "animate-in slide-in-from-right duration-300",
  }
  
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col border-0 bg-card",
          "shadow-2xl shadow-black/50 ring-1 ring-white/[0.05]",
          side === "top" || side === "bottom" ? "max-h-[92vh]" : "h-screen",
          (side === "right" || side === "left") && isMobile && "w-full",
          sideClasses[side],
          animationClasses[side],
          "data-[state=closed]:animate-out",
          side === "right" && "data-[state=closed]:slide-out-to-right",
          side === "left" && "data-[state=closed]:slide-out-to-left",
          side === "top" && "data-[state=closed]:slide-out-to-top",
          side === "bottom" && "data-[state=closed]:slide-out-to-bottom",
          "data-[state=closed]:duration-200",
          className
        )}
        style={side === "right" && resizable && !isMobile ? { width: `${width}px` } : undefined}
        {...props}
      >
        {/* Gradient top edge */}
        {(side === "left" || side === "right") && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        )}
        
        {/* Resize Handle for right drawer - only on desktop */}
        {side === "right" && resizable && !isMobile && (
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize z-50",
              "flex items-center justify-center",
              "hover:bg-primary/5 transition-colors duration-200",
              isResizing && "bg-primary/10"
            )}
          >
            <div className="flex flex-col items-center gap-1">
              <GripVertical className={cn(
                "h-6 w-6 text-muted-foreground/50 transition-colors",
                isResizing && "text-primary"
              )} />
            </div>
          </div>
        )}
        
        {/* Bottom drawer handle */}
        {side === "bottom" && (
          <div className="flex justify-center pt-4 pb-2">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/20" />
          </div>
        )}
        
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
})
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "grid gap-1.5 p-6 text-left border-b border-border/30",
      className
    )}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-auto flex flex-col gap-2 p-6 border-t border-border/30 bg-muted/20",
      className
    )}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-xl font-bold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Classes manuais inspiradas na Apple para não depender de CVA externo
    let variantClasses = ""
    switch (variant) {
      case "default":
        variantClasses = "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-sm"
        break
      case "outline":
        variantClasses = "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-canvas)] text-[var(--color-text-main)]"
        break
      case "ghost":
        variantClasses = "hover:bg-[var(--color-canvas)] text-[var(--color-text-main)]"
        break
      case "destructive":
        variantClasses = "bg-red-500 text-white hover:bg-red-600 shadow-sm"
        break
      default:
        variantClasses = "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-sm"
    }

    let sizeClasses = ""
    switch (size) {
      case "default": sizeClasses = "h-10 px-4 py-2"; break
      case "sm": sizeClasses = "h-8 rounded-md px-3 text-xs"; break
      case "lg": sizeClasses = "h-12 rounded-lg px-8"; break
      case "icon": sizeClasses = "h-10 w-10"; break
    }

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded-[var(--radius-md)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantClasses,
          sizeClasses,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

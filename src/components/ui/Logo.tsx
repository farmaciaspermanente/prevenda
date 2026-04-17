"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  variant?: "sidebar" | "login"
  isExpanded?: boolean
}

export function Logo({ className, variant = "login", isExpanded = true }: LogoProps) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "rounded-xl bg-[var(--color-accent)] flex items-center justify-center text-white font-bold",
          variant === "login" ? "w-12 h-12 text-xl" : "w-8 h-8 text-md"
        )}>
          P
        </div>
        {(isExpanded || variant === "login") && (
          <span className={cn(
            "font-semibold tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300",
            variant === "login" ? "text-2xl text-[var(--color-text-main)]" : "text-lg text-black",
            !isExpanded && variant === "sidebar" ? "opacity-0 w-0" : "opacity-100 w-auto"
          )}>
            PreVenda
          </span>
        )}
      </div>
    )
  }

  const logoSrc = (variant === "sidebar" && !isExpanded) ? "/favicon.png" : "/logo.png"

  return (
    <div className={cn(
      "flex items-center justify-center transition-all duration-300",
      variant === "sidebar" && isExpanded ? "bg-white rounded-lg p-2 mx-4 w-full max-w-[180px] shadow-sm" : "",
      variant === "sidebar" && !isExpanded ? "bg-white rounded-md p-1 shadow-sm h-10 w-10" : "",
      className
    )}>
      <img 
        src={logoSrc}
        alt="Permanente" 
        className={cn(
          "transition-all duration-300 object-contain",
          variant === "login" ? "h-12 w-auto" : (isExpanded ? "h-7 w-auto" : "h-8 w-8"),
        )}
        onError={() => setHasError(true)}
      />
    </div>
  )
}

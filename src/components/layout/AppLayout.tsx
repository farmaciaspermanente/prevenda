"use client"

import React, { useState } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

interface AppLayoutProps {
  children: React.ReactNode
  userProfile: { nome: string; role: string; filial_id?: string | null }
  allowedMenus: string[]
}

export function AppLayout({ children, userProfile, allowedMenus }: AppLayoutProps) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

  return (
    <div className="flex h-screen w-full bg-[var(--color-canvas)] overflow-hidden">
      {/* Sidebar with hover expansion */}
      <Sidebar 
        isExpanded={isSidebarExpanded} 
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
        allowedMenus={allowedMenus}
      />
      
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden transition-all duration-300 relative z-0">
        <Topbar userProfile={userProfile} />
        
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

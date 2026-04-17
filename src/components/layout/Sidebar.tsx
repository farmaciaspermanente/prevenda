"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Home, 
  ShoppingCart, 
  Store, 
  Package, 
  Link as LinkIcon, 
  Settings 
} from "lucide-react"
import { Logo } from "@/components/ui/Logo"

interface SidebarProps {
  isExpanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  allowedMenus: string[];
}

const MENU_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/pedido-venda", label: "Pedido de Venda", icon: ShoppingCart },
  { href: "/cadastros/filiais", label: "Cadastro de Filial", icon: Store },
  { href: "/cadastros/produtos", label: "Cadastro de Produtos", icon: Package },
  { href: "/cadastros/produto-filial", label: "Produto Filial", icon: LinkIcon },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
]

export function Sidebar({ isExpanded, onMouseEnter, onMouseLeave, allowedMenus }: SidebarProps) {
  const pathname = usePathname()

  // Filtra itens com base nas permissões ou admin override visualmente não é necessário se já tá no permitidos
  const visibleItems = MENU_ITEMS.filter(item => allowedMenus.includes(item.href))

  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "flex flex-col h-full bg-[var(--color-accent)] text-white/90 shadow-[var(--shadow-apple)] transition-all duration-300 ease-in-out z-20",
        isExpanded ? "w-64" : "w-[72px]"
      )}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-center border-b border-white/10 overflow-hidden">
        <Logo 
          variant="sidebar" 
          isExpanded={isExpanded} 
        />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 flex flex-col gap-2 overflow-y-auto hidden-scrollbar px-3">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 h-10 rounded-lg px-3 transition-colors",
                isActive 
                  ? "bg-white/20 text-white font-medium shadow-sm backdrop-blur-md" 
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-white" : "text-white/70")} />
              
              <span 
                className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

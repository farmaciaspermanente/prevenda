"use client"

import React, { useState } from "react"
import { Bell, User, LogOut, KeyRound, ChevronDown } from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/DropdownMenu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { toast } from "sonner"
import { updatePassword } from "@/app/(app)/actions/auth"

export function Topbar({ userProfile }: { userProfile: { nome: string; role: string; filial_id?: string | null }}) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = () => {
    document.cookie = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1].split('.')[0]}-auth-token=; path=/; max-age=0;`
    window.location.href = '/login'
  }

  const handlePasswordChange = async (formData: FormData) => {
    setIsLoading(true)
    const res = await updatePassword(formData)
    setIsLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success("Senha alterada com sucesso!")
      setIsPasswordModalOpen(false)
    }
  }

  return (
    <header className="h-16 w-full flex items-center justify-between px-6 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-10 sticky top-0">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-main)]">
          PreVenda
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-canvas)] transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        
        <div className="pl-4 border-l border-[var(--color-border)]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:bg-[var(--color-canvas)] p-1.5 rounded-xl transition-colors outline-none group text-right">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium leading-none text-[var(--color-text-main)]">{userProfile.nome}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] mt-1 capitalize font-medium">{userProfile.role} {userProfile.filial_id ? `(${userProfile.filial_id})` : ''}</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:border-[var(--color-accent)] transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => {
                e.preventDefault()
                setIsPasswordModalOpen(true)
              }}>
                <KeyRound className="w-4 h-4" />
                <span>Alterar Senha</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Modal Alterar Senha */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Crie uma nova senha de acesso para sua conta.
            </DialogDescription>
          </DialogHeader>
          <form action={handlePasswordChange} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova Senha</label>
              <Input name="password" type="password" placeholder="Mínimo 6 caracteres" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar Nova Senha</label>
              <Input name="confirmPassword" type="password" placeholder="Repita a nova senha" required />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Atualizar Senha"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  )
}

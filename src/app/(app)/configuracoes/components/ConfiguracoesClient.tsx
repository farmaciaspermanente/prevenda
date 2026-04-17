"use client"

import { useState } from "react"
import { Search, Edit2, ShieldAlert, Key } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { updateUserConfiguration, createNewUser, adminResetPassword } from "../actions"

const ALL_MENUS = [
  { id: "/", label: "Home" },
  { id: "/pedido-venda", label: "Pedido de Venda" },
  { id: "/cadastros/filiais", label: "Cadastro de Filial" },
  { id: "/cadastros/produtos", label: "Cadastro de Produtos" },
  { id: "/cadastros/produto-filial", label: "Produto Filial" },
  { id: "/configuracoes", label: "Configurações" }
]

export default function ConfiguracoesClient({ initialUsers, setupData }: { initialUsers: any[], setupData: any }) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resettingUser, setResettingUser] = useState<any>(null)
  const [selectedMenus, setSelectedMenus] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const filteredUsers = users.filter(u => 
    u.nome?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleOpenModal = (user: any) => {
    setEditingUser(user)
    // Extrair menus do usuário e inicializar o estado
    const oldMenus = user.permissoes_menu?.map((m: any) => m.menu) || []
    setSelectedMenus(oldMenus)
    setIsModalOpen(true)
  }

  const handleMenuToggle = (menuId: string) => {
    setSelectedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(m => m !== menuId)
        : [...prev, menuId]
    )
  }

  // Pre-sets de permissões rápidas baseado no request do usuário
  const applyPreset = (role: string) => {
    if (role === "admin") {
      setSelectedMenus(ALL_MENUS.map(m => m.id))
    } else if (role === "vendedor") {
      setSelectedMenus(["/", "/pedido-venda"])
    } else if (role === "cadastro") {
      setSelectedMenus(["/cadastros/filiais", "/cadastros/produtos", "/cadastros/produto-filial"])
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    
    // Anexamos as permissões de menu (como multiplas keys para o FormData pegar via getAll)
    selectedMenus.forEach(m => formData.append("menus", m))

    const isAtivo = formData.get("ativo") === "on"
    formData.set("ativo", isAtivo ? "true" : "false")

    const res = await updateUserConfiguration(formData)
    setIsLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success("Configurações do usuário salvas com sucesso.")
      setIsModalOpen(false)
      window.location.reload()
    }
  }

  async function handleCreateSubmit(formData: FormData) {
    setIsLoading(true)
    selectedMenus.forEach(m => formData.append("menus", m))

    const res = await createNewUser(formData)
    setIsLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success("Usuário criado com sucesso!")
      setIsCreateModalOpen(false)
      window.location.reload()
    }
  }

  async function handleResetSubmit(formData: FormData) {
    setIsLoading(true)
    const res = await adminResetPassword(formData)
    setIsLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success("Senha do usuário redefinida com sucesso!")
      setIsResetModalOpen(false)
      setResettingUser(null)
    }
  }

  const handleOpenCreateModal = () => {
    setEditingUser(null)
    setSelectedMenus(["/", "/pedido-venda"]) // Vendedor padrão
    setIsCreateModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Configurações & Usuários</h2>
          <p className="text-[var(--color-text-muted)] text-sm">Gerencie acessos, filiais permitidas e níveis hierárquicos.</p>
        </div>
        <Button onClick={handleOpenCreateModal} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white">
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <Input 
              placeholder="Buscar usuário por nome ou email..." 
              className="pl-9 bg-[var(--color-canvas)] border-transparent focus-visible:bg-[var(--color-surface)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Filial Vinculada</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium text-[var(--color-text-main)]">{user.nome}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{user.role}</span>
                    {user.role === 'admin' && <ShieldAlert className="inline w-3 h-3 ml-1 text-yellow-500" />}
                  </TableCell>
                  <TableCell>
                    {user.filiais ? (
                      <span className="text-sm font-medium text-[var(--color-accent)]">{user.filial_id} - {user.filiais.nome}</span>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">Nenhuma (Acesso Negado as Filiais)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Resetar Senha" onClick={() => {
                        setResettingUser(user)
                        setIsResetModalOpen(true)
                      }}>
                        <Key className="w-4 h-4 text-amber-500" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar Perfil" onClick={() => handleOpenModal(user)}>
                        <Edit2 className="w-4 h-4 text-[var(--color-text-muted)]" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Edição usuário */}
      {editingUser && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Acessos do Usuário</DialogTitle>
              <DialogDescription>
                Configure as permissões e o nível de acesso de <strong>{editingUser.nome}</strong>.
              </DialogDescription>
            </DialogHeader>
            
            <form action={handleSubmit} className="flex flex-col gap-6 mt-4 overflow-y-auto max-h-[70vh] p-1">
              <input type="hidden" name="id" value={editingUser.id} />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Nome</label>
                  <Input name="nome" defaultValue={editingUser.nome} required />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Email (Bloqueado)</label>
                  <Input defaultValue={editingUser.email} disabled className="bg-black/5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Perfil / Role</label>
                  <select 
                    name="role" 
                    defaultValue={editingUser.role}
                    onChange={(e) => applyPreset(e.target.value)} 
                    className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)]"
                  >
                    <option value="vendedor">Vendedor</option>
                    <option value="cadastro">Cadastro</option>
                    <option value="admin">Administrador (Total)</option>
                  </select>
                  <span className="text-xs text-[var(--color-text-muted)]">O perfil altera automaticamente os menus abaixo.</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Filial Permitida (Máx: 1)</label>
                  <select 
                    name="filial_id" 
                    defaultValue={editingUser.filial_id || ""}
                    className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)]"
                  >
                    <option value="">Desvinculado</option>
                    {setupData.filiais.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.id} - {f.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3 p-4 bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-[var(--radius-md)]">
                <label className="text-sm font-medium">Menus Permitidos</label>
                <div className="grid grid-cols-2 gap-3">
                  {ALL_MENUS.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id={`menu-${m.id}`} 
                        checked={selectedMenus.includes(m.id)}
                        onChange={() => handleMenuToggle(m.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                      />
                      <label htmlFor={`menu-${m.id}`} className="text-sm select-none cursor-pointer text-[var(--color-text-main)]">
                        {m.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]">
                <input 
                  type="checkbox" 
                  id="ativo" 
                  name="ativo" 
                  defaultChecked={editingUser.ativo}
                  className="w-4 h-4 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <label htmlFor="ativo" className="text-sm font-medium">Usuário Ativo para Login</label>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? "Salvando..." : "Salvar Configuração"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Novo Usuário */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo acesso para o sistema. O usuário poderá fazer login imediatamente.
            </DialogDescription>
          </DialogHeader>
          
          <form action={handleCreateSubmit} className="flex flex-col gap-6 mt-4 overflow-y-auto max-h-[70vh] p-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <Input name="nome" placeholder="Ex: João Silva" required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Email</label>
                <Input name="email" type="email" placeholder="email@permanente.com" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Senha Inicial</label>
                <Input name="password" type="password" placeholder="Mínimo 6 caracteres" required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Perfil / Role</label>
                <select 
                  name="role" 
                  defaultValue="vendedor"
                  onChange={(e) => applyPreset(e.target.value)} 
                  className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)]"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="cadastro">Cadastro</option>
                  <option value="admin">Administrador (Total)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Filial Permitida</label>
              <select 
                name="filial_id" 
                className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)]"
              >
                <option value="">Selecione a filial...</option>
                {setupData.filiais.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.id} - {f.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 p-4 bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-[var(--radius-md)]">
              <label className="text-sm font-medium">Menus Permitidos</label>
              <div className="grid grid-cols-2 gap-3">
                {ALL_MENUS.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`create-menu-${m.id}`} 
                      checked={selectedMenus.includes(m.id)}
                      onChange={() => handleMenuToggle(m.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                    />
                    <label htmlFor={`create-menu-${m.id}`} className="text-sm select-none cursor-pointer">
                      {m.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? "Criando..." : "Criar Usuário"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Reset Senha Administrativo */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para o usuário <strong>{resettingUser?.nome}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <form action={handleResetSubmit} className="flex flex-col gap-4 mt-4">
            <input type="hidden" name="userId" value={resettingUser?.id || ""} />
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Nova Senha</label>
              <Input name="password" type="password" required placeholder="Nova senha temporária" />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Confirmar Senha</label>
              <Input name="confirmPassword" type="password" required placeholder="Repita a senha" />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={() => setIsResetModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
                {isLoading ? "Resetando..." : "Confirmar Reset"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

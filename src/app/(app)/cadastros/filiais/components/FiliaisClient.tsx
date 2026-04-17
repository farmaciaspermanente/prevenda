"use client"

import { useState } from "react"
import { Search, Plus, Edit2, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { upsertFilial, toggleFilialStatus } from "../actions"

export default function FiliaisClient({ initialData }: { initialData: any[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFilial, setEditingFilial] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Filtro no lado do cliente
  const filteredData = data.filter((item) => 
    item.nome.toLowerCase().includes(search.toLowerCase()) || 
    item.id.toLowerCase().includes(search.toLowerCase()) ||
    item.cnpj.includes(search)
  )

  const handleOpenModal = (filial?: any) => {
    if (filial) {
      setEditingFilial(filial)
    } else {
      setEditingFilial(null)
    }
    setIsModalOpen(true)
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const res = await toggleFilialStatus(id, currentStatus)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(currentStatus ? "Filial inativada." : "Filial ativada.")
      // Update local state instead of doing full refresh
      setData(data.map(item => item.id === id ? { ...item, ativo: !currentStatus } : item))
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    formData.append("isEdit", !!editingFilial ? "true" : "false")
    
    // Pegar o 'ativo' que não é sempre mandado pelo HTML se não marcado
    const isAtivo = formData.get("ativo") === "on"
    formData.set("ativo", isAtivo ? "true" : "false")

    const res = await upsertFilial(formData)
    setIsLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(editingFilial ? "Filial atualizada!" : "Filial criada com sucesso!")
      setIsModalOpen(false)
      // Como não usamos useRouter.refresh, podemos apenas atualizar a página
      window.location.reload()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Filiais</h2>
          <p className="text-[var(--color-text-muted)] text-sm">Gerencie o cadastro das filiais da empresa.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Filial
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <Input 
              placeholder="Buscar por ID, Nome ou CNPJ..." 
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
                <TableHead>ID (ERP)</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell>{item.cnpj}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${item.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.ativo ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Ativo</>
                      ) : (
                        <><XCircle className="w-3.5 h-3.5" /> Inativo</>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)}>
                        <Edit2 className="w-4 h-4 text-[var(--color-text-muted)]" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="text-xs"
                        onClick={() => handleToggleStatus(item.id, item.ativo)}
                      >
                        {item.ativo ? "Inativar" : "Ativar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-[var(--color-text-muted)]">
                    Nenhuma filial encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFilial ? "Editar Filial" : "Nova Filial"}</DialogTitle>
            <DialogDescription>
              {editingFilial ? "Altere os dados da filial abaixo." : "Preencha os dados da nova filial conforme o ERP."}
            </DialogDescription>
          </DialogHeader>
          
          <form action={handleSubmit} className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">ID (Código ERP)</label>
              <Input name="id" defaultValue={editingFilial?.id} readOnly={!!editingFilial} required placeholder="Ex: 001" className={editingFilial ? "bg-black/5" : ""} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Nome</label>
              <Input name="nome" defaultValue={editingFilial?.nome} required placeholder="Ex: Filial Matriz" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">CNPJ</label>
              <Input name="cnpj" defaultValue={editingFilial?.cnpj} required placeholder="00.000.000/0000-00" />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="ativo" 
                name="ativo" 
                defaultChecked={editingFilial ? editingFilial.ativo : true}
                className="w-4 h-4 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              />
              <label htmlFor="ativo" className="text-sm font-medium">Filial Ativa</label>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

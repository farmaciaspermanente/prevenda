"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Plus, Edit2, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { upsertProduto, toggleProdutoStatus, getProdutos } from "../actions"

export default function ProdutosClient({ initialData }: { initialData: any[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduto, setEditingProduto] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Debounced search logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      // Se a pesquisa for vazia, ainda chamamos getProdutos() para resetar para a lista inicial (ou o initialData)
      setIsSearching(true)
      const results = await getProdutos(search)
      setData(results)
      setIsSearching(false)
    }, 400) // 400ms debounce

    return () => clearTimeout(delayDebounceFn)
  }, [search])

  // We no longer need local filteredData as the 'data' state now reflects the server search results
  const tableData = data

  const handleOpenModal = (produto?: any) => {
    if (produto) {
      setEditingProduto(produto)
    } else {
      setEditingProduto(null)
    }
    setIsModalOpen(true)
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const res = await toggleProdutoStatus(id, currentStatus)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(currentStatus ? "Produto inativado." : "Produto ativado.")
      setData(data.map(item => item.id === id ? { ...item, ativo: !currentStatus } : item))
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    formData.append("isEdit", !!editingProduto ? "true" : "false")
    
    const isAtivo = formData.get("ativo") === "on"
    formData.set("ativo", isAtivo ? "true" : "false")

    const res = await upsertProduto(formData)
    setIsLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(editingProduto ? "Produto atualizado!" : "Produto criado com sucesso!")
      setIsModalOpen(false)
      window.location.reload()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Produtos</h2>
          <p className="text-[var(--color-text-muted)] text-sm">Gerencie o catálogo mestre de produtos.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Produto
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <Input 
              placeholder="Buscar por ID, Descrição, EAN ou Princípio Ativo..." 
              className="pl-9 bg-[var(--color-canvas)] border-transparent focus-visible:bg-[var(--color-surface)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID (ERP)</TableHead>
                <TableHead>EAN</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Princípio Ativo</TableHead>
                <TableHead>Subgrupo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.ean || "-"}</TableCell>
                  <TableCell>{item.descricao}</TableCell>
                  <TableCell>{item.principio_ativo || "-"}</TableCell>
                  <TableCell>{item.subgrupo || "-"}</TableCell>
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
              {tableData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-[var(--color-text-muted)]">
                    {isSearching ? "Buscando..." : "Nenhum produto encontrado."}
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
            <DialogTitle>{editingProduto ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>
              {editingProduto ? "Altere os dados do produto abaixo." : "Preencha os dados do novo produto conforme o ERP."}
            </DialogDescription>
          </DialogHeader>
          
          <form action={handleSubmit} className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">ID (Código ERP)</label>
              <Input name="id" defaultValue={editingProduto?.id} readOnly={!!editingProduto} required placeholder="Ex: 10001" className={editingProduto ? "bg-black/5" : ""} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input name="descricao" defaultValue={editingProduto?.descricao} required placeholder="Ex: iPhone 15 Pro Max" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">EAN / Código de Barras</label>
              <Input name="ean" defaultValue={editingProduto?.ean} placeholder="Código de barras (opcional)" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Subgrupo</label>
              <Input name="subgrupo" defaultValue={editingProduto?.subgrupo} placeholder="Ex: PBM, MARCA PROP, etc (opcional)" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Princípio Ativo</label>
              <Input name="principio_ativo" defaultValue={editingProduto?.principio_ativo} placeholder="Ex: Paracetamol (opcional)" />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="ativo" 
                name="ativo" 
                defaultChecked={editingProduto ? editingProduto.ativo : true}
                className="w-4 h-4 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              />
              <label htmlFor="ativo" className="text-sm font-medium">Produto Ativo</label>
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

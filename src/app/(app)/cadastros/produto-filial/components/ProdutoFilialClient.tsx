"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Edit2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { upsertProdutoFilial, deleteProdutoFilial, getProdutoFilial } from "../actions"

export default function ProdutoFilialClient({ initialData, dropdownData }: { initialData: any[], dropdownData: { filiais: any[], produtos: any[] } }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [filialFilter, setFilialFilter] = useState("")

  // Debounced search logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true)
      const results = await getProdutoFilial(search, filialFilter)
      setData(results)
      setIsSearching(false)
    }, 400) // 400ms debounce

    return () => clearTimeout(delayDebounceFn)
  }, [search, filialFilter])

  const tableData = data

  // We no longer need local filteredData as the 'data' state now reflects the server search results

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item)
    } else {
      setEditingItem(null)
    }
    setIsModalOpen(true)
  }

  const handleDelete = async (id_filial: string, id_produto: string) => {
    if (!confirm("Deseja realmente remover este vínculo e zerar o estoque deste produto nesta filial?")) return
    
    const res = await deleteProdutoFilial(id_filial, id_produto)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success("Vínculo removido com sucesso.")
      setData(data.filter(i => !(i.id_filial === id_filial && i.id_produto === id_produto)))
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    formData.append("isEdit", !!editingItem ? "true" : "false")
    // Se estiver editando, repassa IDs originais caso o select esteja desativado
    if (editingItem) {
      formData.set("id_filial", editingItem.id_filial)
      formData.set("id_produto", editingItem.id_produto)
    }

    const res = await upsertProdutoFilial(formData)
    setIsLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success(editingItem ? "Vínculo atualizado!" : "Vínculo criado com sucesso!")
      setIsModalOpen(false)
      window.location.reload()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Vínculo Produto/Filial</h2>
          <p className="text-[var(--color-text-muted)] text-sm">Gerencie preços de venda e estoque local.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Vínculo
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4 border-b">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <Input 
                placeholder="Buscar produto, ID ou princípio..." 
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

            <div className="w-full md:w-64">
              <select 
                className="flex h-10 w-full rounded-[var(--radius-md)] border-transparent bg-[var(--color-canvas)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)] focus-visible:bg-[var(--color-surface)] transition-all cursor-pointer"
                value={filialFilter}
                onChange={(e) => setFilialFilter(e.target.value)}
              >
                <option value="">Todas as Filiais</option>
                {dropdownData.filiais.map(f => (
                  <option key={f.id} value={f.id}>{f.id} - {f.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filial</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Preço de Venda</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((item) => (
                <TableRow key={`${item.id_filial}-${item.id_produto}`}>
                  <TableCell>
                    <div className="font-medium text-[var(--color-text-main)] w-48 truncate" title={item.filial_nome}>
                      {item.filial_nome}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">{item.id_filial}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-[var(--color-text-main)] max-w-[250px] truncate" title={item.produto_descricao}>
                      {item.produto_descricao}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {item.id_produto} {item.produto_ean && `• EAN: ${item.produto_ean}`} {item.produto_principio_ativo && `• P.A.: ${item.produto_principio_ativo}`}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-[var(--color-accent)]">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco_venda || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${item.quantidade > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.quantidade} unId
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)}>
                        <Edit2 className="w-4 h-4 text-[var(--color-text-muted)]" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id_filial, item.id_produto)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tableData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-[var(--color-text-muted)]">
                    {isSearching ? "Buscando..." : "Nenhum vínculo encontrado."}
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
            <DialogTitle>{editingItem ? "Editar Vínculo" : "Novo Vínculo Produto/Filial"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Altere o preço e estoque abaixo." : "Selecione uma filial e um produto ativos para estabelecer a venda."}
            </DialogDescription>
          </DialogHeader>
          
          <form action={handleSubmit} className="flex flex-col gap-4 mt-4">
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Filial</label>
              {editingItem ? (
                 <Input value={`${editingItem.id_filial} - ${editingItem.filial_nome}`} disabled className="bg-black/5" />
              ) : (
                <select name="id_filial" required className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)]">
                  <option value="">Selecione a Filial...</option>
                  {dropdownData.filiais.map(f => (
                    <option key={f.id} value={f.id}>{f.id} - {f.nome}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Produto</label>
              {editingItem ? (
                 <Input value={`${editingItem.id_produto} - ${editingItem.produto_descricao}`} disabled className="bg-black/5" />
              ) : (
                <select name="id_produto" required className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)]">
                  <option value="">Selecione o Produto...</option>
                  {dropdownData.produtos.map(p => (
                    <option key={p.id} value={p.id}>{p.id} - {p.descricao}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Preço de Venda (R$)</label>
                <Input name="preco_venda" type="number" step="0.01" min="0" defaultValue={editingItem?.preco_venda} required placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Quantidade em Estoque</label>
                <Input name="quantidade" type="number" step="1" defaultValue={editingItem?.quantidade || 0} required placeholder="0" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar vínculo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, PackageOpen, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { saveOrder, getBranchProducts, getCheapestAlternative, getComplementaryProduct } from "../actions"

export default function PedidoVendaClient({ 
  availableProducts, 
  userFilial, 
  recentOrders 
}: { 
  availableProducts: any[], 
  userFilial: string | undefined,
  recentOrders: any[]
}) {
  const [cart, setCart] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [qty, setQty] = useState<number>(1)
  const [obs, setObs] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [serverProducts, setServerProducts] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedProductData, setSelectedProductData] = useState<any>(null)
  const [alternativeProduct, setAlternativeProduct] = useState<any>(null)
  const [complementaryProduct, setComplementaryProduct] = useState<any>(null)
  const [prevencidoProduct, setPrevencidoProduct] = useState<any>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Close search suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Debounced server-side search
  useEffect(() => {
    if (!searchQuery.trim() || !userFilial) {
      setServerProducts([])
      return
    }

    // Se o usuário selecionou um produto e o campo reflete isso (Cód - Descrição), não busca novamente
    if (searchQuery.includes(" - ")) return

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true)
      const results = await getBranchProducts(userFilial, searchQuery)
      setServerProducts(results)
      setIsSearching(false)
    }, 400)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, userFilial])

  const suggestions = serverProducts

  const extractMG = (descricao: string) => {
    const match = descricao.match(/(\d+\s*MG)/i)
    return match ? match[0] : null
  }

  // Fetch cheaper alternative when a product is selected
  useEffect(() => {
    async function fetchAlternative() {
      if (!selectedProduct || !userFilial) {
        setAlternativeProduct(null)
        setSelectedProductData(null)
        return
      }

      const currentProd = serverProducts.find(p => p.id_produto === selectedProduct) || availableProducts.find(p => p.id_produto === selectedProduct)
      
      if (currentProd) {
        setSelectedProductData(currentProd)
        setIsAiLoading(true)
        // Disparando requisições em paralelo
        const promises: Promise<void>[] = []
        
        if (currentProd.principio_ativo) {
          promises.push((async () => {
            const mg = extractMG(currentProd.descricao || "")
            const alt = await getCheapestAlternative(userFilial, currentProd.principio_ativo, currentProd.id_produto, currentProd.preco_venda, mg || undefined)
            setAlternativeProduct(alt)
          })())
        } else {
          setAlternativeProduct(null)
        }

        // Sugestão Gemini
        promises.push((async () => {
          const comp = await getComplementaryProduct(userFilial, currentProd.descricao)
          setComplementaryProduct(comp)
        })())

        // Verifica se o item principal tem versão prevencido
        if (currentProd.prevencido_disponivel > 0) {
          const dscPrev = currentProd.desconto_prevencido || 0
          const discountedPrice = currentProd.preco_venda * (1 - dscPrev / 100)
          setPrevencidoProduct({
            ...currentProd,
            preco_cheio: currentProd.preco_venda,
            preco_venda: discountedPrice,
            desconto_aplicado: dscPrev,
            is_prevencido: true
          })
        } else {
          setPrevencidoProduct(null)
        }

        await Promise.allSettled(promises)
        setIsAiLoading(false)
      } else {
        setSelectedProductData(null)
        setAlternativeProduct(null)
        setComplementaryProduct(null)
        setPrevencidoProduct(null)
        setIsAiLoading(false)
      }
    }

    fetchAlternative()
  }, [selectedProduct, userFilial])

  const addToCartProduct = (product: any, quantity: number): boolean => {
    const isPrevencido = !!product.is_prevencido
    const cartKey = `${product.id_produto}_${isPrevencido ? 'prev' : 'norm'}`
    // Prevencido tem estoque pr\u00f3prio; normal usa o total menos prevencidos reservados
    const stockDisponivel = isPrevencido
      ? (product.prevencido_disponivel ?? product.quantidade)
      : product.quantidade - (product.prevencido_disponivel ?? 0)

    if (stockDisponivel <= 0) {
      toast.error(`O produto ${product.descricao} não possui estoque.`)
      return false
    }

    if (quantity <= 0) {
      toast.error("Quantidade inválida.")
      return false
    }

    const itemExists = cart.find(c => c.cart_key === cartKey)
    if (itemExists) {
      if (itemExists.quantidade + quantity > stockDisponivel) {
         toast.error(`Estoque insuficiente. Você já possui ${itemExists.quantidade} no carrinho.`)
         return false
      }
      setCart(cart.map(c => c.cart_key === cartKey ? {
        ...c,
        quantidade: c.quantidade + quantity,
        subtotal: (c.quantidade + quantity) * c.preco_unitario
      } : c))
    } else {
      if (quantity > stockDisponivel) {
         toast.error(`Estoque insuficiente. Disponível: ${stockDisponivel}.`)
         return false
      }
      setCart([...cart, {
        cart_key: cartKey,
        id_produto: product.id_produto,
        descricao: product.descricao,
        quantidade: quantity,
        preco_unitario: product.preco_venda,
        subtotal: quantity * product.preco_venda,
        is_prevencido: isPrevencido,
        stock_disponivel: stockDisponivel,
      }])
    }
    
    toast.success(`${product.descricao} adicionado ao pedido!`)
    return true
  }

  const handleSelectAlternative = () => {
    if (!alternativeProduct) return
    const success = addToCartProduct(alternativeProduct, 1)
    if (success) {
      setAlternativeProduct(null)
    }
  }

  const handleSelectPrevencido = () => {
    if (!prevencidoProduct) return
    const success = addToCartProduct(prevencidoProduct, 1)
    if (success) {
      setPrevencidoProduct(null)
    }
  }

  const handleSelectComplementary = () => {
    if (!complementaryProduct) return
    const success = addToCartProduct(complementaryProduct, 1)
    if (success) {
      setComplementaryProduct(null)
    }
  }

  const handleClear = () => {
    setSelectedProduct("")
    setSelectedProductData(null)
    setSearchQuery("")
    setQty(1)
    setAlternativeProduct(null)
    setComplementaryProduct(null)
    setPrevencidoProduct(null)
    setIsAiLoading(false)
  }

  const handleAddToCart = () => {
    if (!selectedProduct) return
    const prodRef = serverProducts.find(p => p.id_produto === selectedProduct) || availableProducts.find(p => p.id_produto === selectedProduct)
    if (!prodRef) return
    
    const success = addToCartProduct(prodRef, qty)
    
    if (success) {
      handleClear()
    }
  }

  const removeFromCart = (cartKey: string) => {
    setCart(cart.filter(c => c.cart_key !== cartKey))
  }

  const updateCartQty = (cartKey: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(cartKey)
      return
    }
    const cartItem = cart.find(c => c.cart_key === cartKey)
    if (!cartItem) return
    
    if (newQty > cartItem.stock_disponivel) {
      toast.error(`Estoque insuficiente. Disponível: ${cartItem.stock_disponivel}`)
      return
    }
    
    setCart(cart.map(c => c.cart_key === cartKey ? {
      ...c,
      quantidade: newQty,
      subtotal: newQty * c.preco_unitario
    } : c))
  }

  const cartTotal = cart.reduce((acc, curr) => acc + curr.subtotal, 0)

  const handleFinishOrder = async () => {
    if (cart.length === 0) return
    setIsLoading(true)

    const payload = {
      filial_id: userFilial,
      observacao: obs,
      total: cartTotal,
      items: cart
    }

    const res = await saveOrder(payload)
    setIsLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success("Pedido finalizado com sucesso!")
      setCart([])
      setObs("")
      window.location.reload() // Recarrega para baixar estoque exibido
    }
  }

  if (!userFilial) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <PackageOpen className="w-16 h-16 text-[var(--color-text-muted)] mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Acesso Restrito</h2>
        <p className="text-[var(--color-text-muted)]">Você não possui nenhuma filial vinculada ao seu usuário. Contate um administrador.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Nova Venda</h2>
        <p className="text-[var(--color-text-muted)] text-sm">Filial de faturação: <strong className="text-[var(--color-text-main)]">{userFilial}</strong></p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Esquerda: Catalog & Form */}
        <div className="flex flex-col w-full xl:w-2/3 gap-6">
          <Card>
          <CardHeader>
            <CardTitle>Adicionar Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex flex-col gap-2 w-full relative" ref={dropdownRef}>
                <label className="text-sm font-medium">Produto</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Buscar por descrição, ean, código ou princípio ativo..."
                    value={searchQuery}
                    className="pl-10 h-10 w-full"
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      if (selectedProduct) setSelectedProduct("")
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                {showSuggestions && searchQuery.trim() && (
                  <div className="absolute z-10 w-full top-[calc(100%+4px)] bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.length > 0 ? (
                      suggestions.map(p => (
                        <div
                          key={p.id_produto}
                          className={`px-4 py-3 cursor-pointer hover:bg-[var(--color-border)] text-sm flex flex-col border-b border-[var(--color-border)] last:border-b-0 ${selectedProduct === p.id_produto ? 'bg-[var(--color-border)]' : ''}`}
                          onClick={() => {
                            setSelectedProduct(p.id_produto)
                            const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco_venda)
                            setSearchQuery(`${p.id_produto} - ${p.descricao} (${formattedPrice})`)
                            setShowSuggestions(false)
                          }}
                        >
                          <span className="font-medium text-[var(--color-text-main)] truncate">{p.descricao}</span>
                          <span className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            Cód: {p.id_produto} {p.ean ? `| EAN: ${p.ean}` : ''} {p.principio_ativo ? `| P.A.: ${p.principio_ativo}` : ''} | 
                            <span className={p.quantidade <= 0 ? "text-red-500 font-bold" : ""}> Est: {p.quantidade}</span> | R$ {p.preco_venda}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-[var(--color-text-muted)] text-center">
                        Nenhum produto encontrado.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 w-32 shrink-0">
                <label className="text-sm font-medium">Qtd.</label>
                <div className="flex items-center rounded-lg border border-[var(--color-border)] h-10 w-full overflow-hidden">
                  <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="flex items-center justify-center h-full aspect-square hover:bg-black/5 active:bg-black/10 border-r border-[var(--color-border)] text-black"><Minus className="w-4 h-4" /></button>
                  <input type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="h-full w-full bg-transparent text-center text-sm font-medium focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  <button type="button" onClick={() => setQty(qty + 1)} className="flex items-center justify-center h-full aspect-square hover:bg-black/5 active:bg-black/10 border-l border-[var(--color-border)] text-black"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button onClick={handleAddToCart} variant="secondary" className="gap-2 bg-black text-white hover:bg-neutral-800 shrink-0 h-10 px-6">
                  <Plus className="w-4 h-4" /> Incluir
                </Button>
                {(selectedProduct || searchQuery) && (
                  <Button onClick={handleClear} variant="outline" className="shrink-0 h-10 px-4 text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-border)] hover:text-black shadow-sm">
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* Info Cards: Valor e Estoque do produto selecionado */}
            {selectedProductData && (
              <>
                <div className="mt-4 flex gap-3">
                  <div className="flex-1 flex flex-col gap-0.5 border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Valor</span>
                    <span className="text-base font-bold text-[var(--color-text-main)]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProductData.preco_venda)}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5 border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Estoque Disponível</span>
                    <span className={`text-base font-bold ${selectedProductData.quantidade <= 0 ? 'text-red-500' : 'text-[var(--color-text-main)]'}`}>
                      {selectedProductData.quantidade <= 0 ? 'Sem estoque' : `${selectedProductData.quantidade} un.`}
                    </span>
                    {selectedProductData.prevencido_disponivel > 0 && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                        {selectedProductData.prevencido_disponivel} prevencido{selectedProductData.prevencido_disponivel > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 border-t border-dashed border-[var(--color-border)]" />
              </>
            )}

            {/* Suggestions Rendered Below the Form so it doesn't push it down */}
            {(prevencidoProduct || alternativeProduct || complementaryProduct || isAiLoading || selectedProductData?.subgrupo?.toUpperCase().includes('PBM')) && (
              <div className="mt-4 flex flex-col gap-2 w-full">
                {selectedProductData?.prevencido_disponivel > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 animate-in fade-in slide-in-from-top-2 border-dashed shadow-md border-red-300">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1">
                        ⚠️ ALERTA: PRODUTO EM OFERTA (PREVENCIDO)
                      </span>
                      <span className="text-sm font-medium text-red-900">{selectedProductData.descricao}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-red-700/60 line-through">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProductData.preco_venda)}
                        </span>
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                          -{selectedProductData.desconto_prevencido || 0}% OFF
                        </span>
                        <span className="text-sm font-bold text-red-700 ml-1">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProductData.preco_venda * (1 - (selectedProductData.desconto_prevencido || 0) / 100))}
                        </span>
                      </div>
                    </div>
                    {prevencidoProduct && (
                      <Button type="button" size="sm" onClick={handleSelectPrevencido} className="bg-red-600 hover:bg-red-700 text-white border-none h-8 px-4 text-xs font-semibold rounded-full shadow-sm shrink-0">
                        Adicionar por {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prevencidoProduct.preco_venda)}
                      </Button>
                    )}
                  </div>
                )}

                {selectedProductData?.subgrupo?.toUpperCase().includes('PBM') && (
                  <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] self-start uppercase tracking-wider shadow-sm flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
                    🏷️ Encontrado no perfil de benefícios: {selectedProductData.subgrupo}
                  </div>
                )}
                
                {alternativeProduct && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-[var(--radius-md)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 animate-in fade-in slide-in-from-top-2 border-dashed shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3 h-3" /> Produto Alternativo
                      </span>
                      <span className="text-sm font-medium text-blue-900 line-clamp-1">{alternativeProduct.descricao}</span>
                      <span className="text-xs text-blue-700">Mesmo Princípio Ativo • Preço: <strong className="text-blue-900 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(alternativeProduct.preco_venda)}</strong></span>
                    </div>
                    <Button type="button" size="sm" onClick={handleSelectAlternative} className="bg-blue-600 hover:bg-blue-700 text-white border-none h-8 px-4 text-xs font-semibold rounded-full shadow-sm shrink-0">
                      Adicionar por {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(alternativeProduct.preco_venda)}
                    </Button>
                  </div>
                )}
                
                {isAiLoading && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-[var(--radius-md)] flex items-center justify-center gap-3 animate-pulse border-dashed">
                    <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-neutral-600">A IA está analisando sugestões...</span>
                  </div>
                )}
                
                {(!isAiLoading && complementaryProduct) && (
                  <div className={`p-3 border rounded-[var(--radius-md)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 animate-in fade-in slide-in-from-top-2 border-dashed shadow-sm ${complementaryProduct.is_prevencido ? 'bg-orange-50 border-orange-200' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex flex-col flex-1 pb-2 sm:pb-0">
                      <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${complementaryProduct.is_prevencido ? 'text-orange-600' : 'text-orange-700'}`}>
                        {complementaryProduct.is_prevencido ? (
                          <><Sparkles className="w-3 h-3" /> SUGESTÃO DA IA: VENCIMENTO PRÓXIMO</>
                        ) : (
                          <><Sparkles className="w-3 h-3" /> SUGESTÃO DA IA: LEVE TAMBÉM</>
                        )}
                      </span>
                      <span className="text-sm font-medium text-orange-900 line-clamp-1">{complementaryProduct.descricao}</span>
                      
                      {complementaryProduct.is_prevencido ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-orange-700/60 line-through">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(complementaryProduct.preco_cheio)}
                          </span>
                          <span className="text-xs font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                            -{complementaryProduct.desconto_aplicado}% OFF
                          </span>
                        </div>
                      ) : null}

                      <span className="text-xs text-orange-800 mt-1 italic font-medium leading-tight max-w-[500px]">"{complementaryProduct.argumento_venda}"</span>
                    </div>
                    <Button type="button" size="sm" onClick={handleSelectComplementary} className={`${complementaryProduct.is_prevencido ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600'} text-white border-none h-8 px-4 text-xs font-semibold rounded-full shadow-sm shrink-0`}>
                      Adicionar por {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(complementaryProduct.preco_venda)}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Carrinho */}
        <Card className="min-h-[300px]">
          <CardHeader className="py-4 border-b">
            <CardTitle className="text-lg">Carrinho</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Unitário</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item) => (
                  <TableRow key={item.cart_key}>
                    <TableCell>
                      <div className="font-medium text-[var(--color-text-main)] w-48 xl:w-64 truncate">
                        {item.descricao}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--color-text-muted)]">{item.id_produto}</span>
                        {item.is_prevencido && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                            <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                            Prevencido
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="w-[120px] text-right">
                      <div className="flex justify-end">
                        <div className="flex items-center rounded-lg border border-[var(--color-border)] h-8 w-24 overflow-hidden">
                          <button type="button" onClick={() => updateCartQty(item.cart_key, item.quantidade - 1)} className="flex items-center justify-center h-full aspect-square hover:bg-black/5 active:bg-black/10 border-r border-[var(--color-border)] text-black"><Minus className="w-3 h-3" /></button>
                          <div className="h-full flex-1 flex items-center justify-center text-xs font-bold">{item.quantidade}</div>
                          <button type="button" onClick={() => updateCartQty(item.cart_key, item.quantidade + 1)} className="flex items-center justify-center h-full aspect-square hover:bg-black/5 active:bg-black/10 border-l border-[var(--color-border)] text-black"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco_unitario)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.subtotal)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.cart_key)}>
                         <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {cart.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-[var(--color-text-muted)]">
                      Nenhum item no pedido.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Direita: Resumo e Pagamento */}
      <div className="flex flex-col w-full xl:w-1/3 gap-6">
        <Card className="flex-1 max-h-[500px]">
          <CardHeader className="bg-[var(--color-canvas)]/50 rounded-t-[var(--radius-xl)] border-b">
            <CardTitle className="flex items-center gap-2">
               <ShoppingCart className="w-5 h-5" /> Resumo do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col h-[calc(100%-70px)]">
            
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Observações Internas</label>
                <textarea 
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] min-h-[100px] resize-none"
                  placeholder="Ex: Entrega agendada para sexta, cliente vip..."
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                />
              </div>

              <div className="mt-auto border-t border-[var(--color-border)] pt-4 flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">Itens Totais</span>
                  <span className="font-medium">{cart.length}</span>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-lg font-semibold">Total Geral</span>
                  <span className="text-3xl font-bold tracking-tight text-[var(--color-accent)]">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}
                  </span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full mt-6 h-12 text-md gap-2 shadow-lg"
              onClick={handleFinishOrder}
              disabled={isLoading || cart.length === 0}
            >
              <Check className="w-5 h-5" />
              {isLoading ? "Processando..." : "Finalizar Pedido"}
            </Button>
          </CardContent>
        </Card>
      </div>

      </div>
    </div>
  )
}

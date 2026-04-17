"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function getBranchProducts(filial_id: string, searchQuery?: string) {
  const supabase = await createClient()
  
  let query = supabase
    .from("v_produto_filial")
    .select("*")
    .eq("id_filial", filial_id)
    .order("quantidade", { ascending: false })

  if (searchQuery) {
    query = query.or(`id_produto.ilike.%${searchQuery}%,produto_descricao.ilike.%${searchQuery}%,produto_ean.ilike.%${searchQuery}%,produto_principio_ativo.ilike.%${searchQuery}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("Erro ao buscar catálogo da filial", error)
    return []
  }
  
  return data.map((item: any) => ({
    id_produto: item.id_produto,
    descricao: item.produto_descricao,
    ean: item.produto_ean,
    principio_ativo: item.produto_principio_ativo,
    preco_venda: item.preco_venda,
    quantidade: item.quantidade,
    subgrupo: item.produto_subgrupo
  }))
}

export async function getCheapestAlternative(filial_id: string, principio_ativo: string, current_id_produto: string, current_price: number, mgPattern?: string) {
  const supabase = await createClient()

  let query = supabase
    .from("v_produto_filial")
    .select("*")
    .eq("id_filial", filial_id)
    .eq("produto_principio_ativo", principio_ativo)
    .neq("id_produto", current_id_produto)
    .gt("quantidade", 0)
    .lt("preco_venda", current_price)

  if (mgPattern) {
    query = query.ilike("produto_descricao", `%${mgPattern}%`)
  }

  const { data, error } = await query
    .order("preco_venda", { ascending: true })
    .limit(1)
    .single()

  if (error || !data) return null

  return {
    id_produto: data.id_produto,
    descricao: data.produto_descricao,
    ean: data.produto_ean,
    principio_ativo: data.produto_principio_ativo,
    preco_venda: data.preco_venda,
    quantidade: data.quantidade,
    subgrupo: data.produto_subgrupo
  }
}

export async function saveOrder(orderPayload: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: "Usuário não autenticado." }

  const { filial_id, observacao, total, items } = orderPayload

  if (!filial_id || items.length === 0) {
    return { error: "Pedido inválido." }
  }

  try {
    // Inserir cabeçalho
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .insert({
        user_id: user.id,
        filial_id,
        observacao,
        total,
        status: "Aberto" // É criado como Aberto. Logo em seguida, se é apenas salvar já faturado, poderiamos mandar 'Finalizado' para disparar trigger. No caso do ERP comum a gente gera aberto depois converte, mas se o cliente quer descontar estoque, converteremos agora.
      })
      .select("id")
      .single()

    if (pedidoError) throw pedidoError
    
    // Inserir itens
    const itemsToInsert = items.map((i: any) => ({
      pedido_id: pedido.id,
      produto_id: i.id_produto,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      subtotal: i.subtotal
    }))

    const { error: itemsError } = await supabase
      .from("itens_pedido")
      .insert(itemsToInsert)

    if (itemsError) throw itemsError

    // Imediatamente atualizar status para "Finalizado" se for uma "Venda Direta" para que a Trigger do Postgres abata o estoque.
    const { error: finalizeError } = await supabase
      .from("pedidos")
      .update({ status: "Finalizado" })
      .eq("id", pedido.id)
      
    if (finalizeError) throw finalizeError

    revalidatePath("/pedido-venda")
    revalidatePath("/")
    return { success: true, pedido_id: pedido.id }
  } catch (error: any) {
    return { error: error.message || "Falha ao gravar pedido." }
  }
}

export async function getMyOrders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from("pedidos")
    .select("*, filiais(nome)")
    .eq("user_id", user.id)
    .order("data_hora", { ascending: false })
    .limit(50)

  return data || []
}

export async function getComplementaryProduct(filial_id: string, product_description: string) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const prompt = `Atue como um farmacêutico experiente focado em vendas cruzadas. O cliente pediu o produto "${product_description}".
Sugira um produto complementar para aumentar o ticket da farmácia. Deve ter forte coerência farmacêutica (ex: amoxicilina -> floratil/probiótico, clenil -> espaçador, anti-hipertensivo -> aparelho de pressão).
Responda APENAS um JSON válido no formato:
{ 
  "termo_busca": "Forme estritamente UMA ÚNICA PALAVRA ININTERRUPTA representativa do produto (ex: 'Pressao' e nunca 'Aparelho', 'Floratil', 'Soro', 'Espacador'). É PROIBIDO usar acentos ou espaços.", 
  "argumento_venda": "Frase curta, impactante e empática para justificar a adição à compra (máximo 2 linhas)." 
}`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // Clean up markdown block if Gemini uses it
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim()
    const suggestion = JSON.parse(cleanJson)

    // Remove any accidental accents provided by the AI
    const searchKeyword = suggestion.termo_busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Buscando no estoque o termo sugerido (em descrição ou princípio ativo)
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("v_produto_filial")
      .select("*")
      .eq("id_filial", filial_id)
      .gt("quantidade", 0)
      .or(`produto_descricao.ilike.%${searchKeyword}%,produto_principio_ativo.ilike.%${searchKeyword}%`)
      .order("quantidade", { ascending: false })
      .limit(20)

    if (error || !data || data.length === 0) return null

    // Order by MARCA PROP preference first, then by quantidade
    const sortedData = data.sort((a, b) => {
      const isAProp = a.produto_subgrupo?.toUpperCase() === 'MARCA PROP'
      const isBProp = b.produto_subgrupo?.toUpperCase() === 'MARCA PROP'
      if (isAProp && !isBProp) return -1
      if (!isAProp && isBProp) return 1
      return b.quantidade - a.quantidade
    })

    const topProduct = sortedData[0]

    return {
      id_produto: topProduct.id_produto,
      descricao: topProduct.produto_descricao,
      ean: topProduct.produto_ean,
      principio_ativo: topProduct.produto_principio_ativo,
      preco_venda: topProduct.preco_venda,
      quantidade: topProduct.quantidade,
      subgrupo: topProduct.produto_subgrupo,
      argumento_venda: suggestion.argumento_venda
    }

  } catch (err) {
    console.error("Erro na sugestão complementar via Gemini:", err)
    return null
  }
}

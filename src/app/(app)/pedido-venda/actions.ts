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
    subgrupo: item.produto_subgrupo,
    prevencido_disponivel: item.prevencido_disponivel || 0,
    desconto_prevencido: item.desconto_prevencido || 0,
    desconto_padrao: item.desconto_padrao || 0
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

  if (error || !data || data.length === 0) return null

  const item = data[0]
  return {
    id_produto: item.id_produto,
    descricao: item.produto_descricao,
    ean: item.produto_ean,
    principio_ativo: item.produto_principio_ativo,
    preco_venda: item.preco_venda,
    quantidade: item.quantidade,
    subgrupo: item.produto_subgrupo,
    desconto_padrao: item.desconto_padrao || 0
  }
}

export async function saveOrder(orderPayload: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Usuário não autenticado." }
  const { filial_id, observacao, total, items } = orderPayload
  if (!filial_id || items.length === 0) return { error: "Pedido inválido." }

  try {
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .insert({ user_id: user.id, filial_id, observacao, total, status: "Aberto" })
      .select("id").single()
    if (pedidoError) throw pedidoError
    
    const itemsToInsert = items.map((i: any) => ({
      pedido_id: pedido.id,
      produto_id: i.id_produto,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      subtotal: i.subtotal,
      origem: i.origem_sugestao || 'Manual'
    }))

    const { error: itemsError } = await supabase.from("itens_pedido").insert(itemsToInsert)
    if (itemsError) throw itemsError

    await supabase.from("pedidos").update({ status: "Finalizado" }).eq("id", pedido.id)
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
  const { data } = await supabase.from("pedidos").select("*, filiais(nome)").eq("user_id", user.id).order("data_hora", { ascending: false }).limit(50)
  return data || []
}

export async function getComplementaryProduct(filial_id: string, product_description: string) {
  try {
    const supabase = await createClient()
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return null

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelsToTry = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"]
    
    const generateWithFallback = async (prompt: string) => {
      let lastError = null
      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName })
          const result = await model.generateContent(prompt)
          return result
        } catch (err: any) {
          lastError = err
        }
      }
      throw lastError
    }

    let topProduct = null

    // 1. BUSCA HISTÓRICA
    const cleanName = product_description.split(' ')[0].replace(/[^a-zA-Z]/g, '')
    const { data: recentMatches } = await supabase
      .from("itens_pedido")
      .select("pedido_id")
      .ilike("produto_descricao", `%${cleanName}%`)
      .limit(10)

    if (recentMatches && recentMatches.length > 0) {
      const orderIds = recentMatches.map(m => m.pedido_id)
      const { data: historicalItems } = await supabase
        .from("itens_pedido")
        .select("produto_id, produto_descricao")
        .in("pedido_id", orderIds)
        .not("produto_descricao", "ilike", `%${cleanName}%`)
        .limit(20)

      if (historicalItems && historicalItems.length > 0) {
        const counts: Record<string, number> = {}
        historicalItems.forEach(item => { counts[item.produto_id] = (counts[item.produto_id] || 0) + 1 })
        const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a])

        for (const pid of sortedIds) {
          const { data: inStock } = await supabase
            .from("v_produto_filial").select("*").eq("id_filial", filial_id).eq("id_produto", pid).gt("quantidade", 0).single()
          if (inStock) {
            topProduct = inStock
            break
          }
        }
      }
    }

    // 2. IA (Descoberta + Busca por Preço)
    if (!topProduct) {
      const promptKeywords = `Atue como um farmacêutico experiente focado em suporte ao tratamento e bem-estar. O cliente está levando "${product_description}".
Sugira 3 termos de busca (marcas ou categorias) que complementem este tratamento (Vitamins, Supplements, Equipment).
Responda JSON: { "sugestoes": [{"termo": "Nome", "tipo": "produto|principio"}] }`

      const resultKeywords = await generateWithFallback(promptKeywords)
      const responseTextKw = resultKeywords.response.text().replace(/```json|```/g, '').trim()
      const suggestions = JSON.parse(responseTextKw).sugestoes || []

      for (const item of suggestions) {
        const fullKeyword = item.termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // BUSCA POR PREVENCIDO
        let qPrev = supabase.from("v_produto_filial").select("*").eq("id_filial", filial_id).gt("prevencido_disponivel", 0)
        if (item.tipo === 'principio') qPrev = qPrev.ilike("produto_principio_ativo", `%${fullKeyword}%`)
        else qPrev = qPrev.ilike("produto_descricao", `%${fullKeyword}%`)
        const { data: prevMatches } = await qPrev.limit(1)

        // BUSCA POR MARCA PROP
        let qProp = supabase.from("v_produto_filial").select("*").eq("id_filial", filial_id).eq("produto_subgrupo", "MARCA PROP").gt("quantidade", 0)
        if (item.tipo === 'principio') qProp = qProp.ilike("produto_principio_ativo", `%${fullKeyword}%`)
        else qProp = qProp.ilike("produto_descricao", `%${fullKeyword}%`)
        const { data: propMatches } = await qProp.limit(1)

        const pPrev = prevMatches?.[0]
        const pProp = propMatches?.[0]

        if (pPrev || pProp) {
          const pricePrev = pPrev ? pPrev.preco_venda * (1 - (pPrev.desconto_prevencido || 0) / 100) : Infinity
          const priceProp = pProp ? pProp.preco_venda * (1 - (pProp.desconto_padrao || 0) / 100) : Infinity

          if (pricePrev <= priceProp) topProduct = pPrev
          else topProduct = pProp
          break
        }

        // BUSCA GERAL (Fallback)
        let qGen = supabase.from("v_produto_filial").select("*").eq("id_filial", filial_id).gt("quantidade", 0)
        if (item.tipo === 'principio') qGen = qGen.ilike("produto_principio_ativo", `%${fullKeyword}%`)
        else qGen = qGen.ilike("produto_descricao", `%${fullKeyword}%`)
        const { data: genMatches } = await qGen.order("preco_venda", { ascending: true }).limit(1)
        
        if (genMatches && genMatches.length > 0) {
          topProduct = genMatches[0]
          break
        }
      }
    }

    if (!topProduct) return null

    // 3. IA (Argumento Assertivo)
    const promptArgument = `Como farmacêutico especialista, o cliente está levando "${product_description}" e você vai oferecer também "${topProduct.produto_descricao}".
Crie uma frase curta (máximo 2 linhas) justificando a oferta.

REGRAS CRÍTICAS:
1. PROIBIDO fazer perguntas. Não use interrogações.
2. Use apenas AFIRMAÇÕES diretas e argumentos "vendedores".
3. Justifique como o segundo item protege, complementa ou potencializa o primeiro.

Exemplos de tom esperado:
- "${product_description}" pode causar ressecamento, leve "${topProduct.produto_descricao}" para auxiliar no conforto.
- O efeito de "${product_description}" é potencializado com o uso combinado de "${topProduct.produto_descricao}".
- Para garantir a proteção da flora durante o uso de "${product_description}", recomendo levar "${topProduct.produto_descricao}".`

    const resultArg = await generateWithFallback(promptArgument)
    const argument = resultArg.response.text().trim().replace(/^"|"$/g, '')

    const isPrevencido = topProduct.prevencido_disponivel > 0
    const precoCheio = topProduct.preco_venda
    const desconto = isPrevencido ? (topProduct.desconto_prevencido || 0) : (topProduct.desconto_padrao || 0)
    const precoFinal = precoCheio * (1 - desconto / 100)

    return {
      id_produto: topProduct.id_produto,
      descricao: topProduct.produto_descricao,
      ean: topProduct.produto_ean,
      principio_ativo: topProduct.produto_principio_ativo,
      preco_venda: precoFinal,
      preco_cheio: precoCheio,
      quantidade: topProduct.quantidade,
      subgrupo: topProduct.produto_subgrupo,
      desconto_padrao: topProduct.desconto_padrao || 0,
      desconto_aplicado: desconto,
      is_prevencido: isPrevencido,
      argumento_venda: argument
    }
  } catch (err) {
    console.error("Erro no processo de sugestão:", err)
    return null
  }
}

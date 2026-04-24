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
  console.log(`--- Sugestão Inteligente para: ${product_description} ---`)
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
          console.log(`Modelo ${modelName} falhou: ${err.message}`)
        }
      }
      throw lastError
    }

    let topProduct = null
    let internalFound = false

    // 1. BUSCA HISTÓRICA (Primeira prioridade)
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
            .from("v_produto_filial")
            .select("*")
            .eq("id_filial", filial_id)
            .eq("id_produto", pid)
            .gt("quantidade", 0)
            .single()
          if (inStock) {
            topProduct = inStock
            internalFound = true
            console.log("Sugestão interna via histórico encontrada.")
            break
          }
        }
      }
    }

    // 2. SE NÃO HOUVER HISTÓRICO, RECORRE AO NOVO FLUXO DA IA
    if (!topProduct) {
      console.log("Recorrendo ao fluxo de IA (Etapa 1: Descoberta)...")
      
      const promptKeywords = `Atue como um farmacêutico experiente focado em suporte ao tratamento e bem-estar. O cliente está levando "${product_description}".
Sua tarefa: Sugira 3 termos de busca (marcas famosas ou categorias) que complementem este tratamento.

REGRAS CRÍTICAS: 
1. PREFERÊNCIA: Sugira Vitaminas, Suplementos Alimentares, Probióticos ou Equipamentos/Correlatos (ex: Espaçador, Termômetro, Aparelho de Pressão, Umidificador).
2. EVITE: Medicamentos que exigem prescrição médica (tarjados). Foque em itens de venda livre que potencializem a saúde ou facilitem a administração.
3. Evite a mesma marca de "${product_description}".

Responda APENAS um JSON no formato:
{ "sugestoes": [{"termo": "Marca ou Sal", "tipo": "produto|principio"}] }`

      const resultKeywords = await generateWithFallback(promptKeywords)
      const responseTextKw = resultKeywords.response.text().replace(/```json|```/g, '').trim()
      const suggestions = JSON.parse(responseTextKw).sugestoes || []

      // PASSO 2: Buscar no banco de dados o melhor item disponível baseado nas sugestões
      for (const item of suggestions) {
        const fullKeyword = item.termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // 1. Tenta encontrar primeiro um item PREVENCIDO (Vencimento próximo)
        let queryPrev = supabase.from("v_produto_filial")
          .select("*")
          .eq("id_filial", filial_id)
          .gt("prevencido_disponivel", 0)
        
        if (item.tipo === 'principio') {
          queryPrev = queryPrev.ilike("produto_principio_ativo", `%${fullKeyword}%`)
        } else {
          queryPrev = queryPrev.ilike("produto_descricao", `%${fullKeyword}%`)
        }

        const { data: prevMatches } = await queryPrev.limit(1)
        
        if (prevMatches && prevMatches.length > 0) {
          topProduct = prevMatches[0]
          console.log(`Prioridade 1 (PREVENCIDO) encontrada: ${topProduct.produto_descricao}`)
          break
        }

        // 2. Tenta encontrar um item de MARCA PRÓPRIA
        let queryProp = supabase.from("v_produto_filial")
          .select("*")
          .eq("id_filial", filial_id)
          .eq("produto_subgrupo", "MARCA PROP")
          .gt("quantidade", 0)
        
        if (item.tipo === 'principio') {
          queryProp = queryProp.ilike("produto_principio_ativo", `%${fullKeyword}%`)
        } else {
          queryProp = queryProp.ilike("produto_descricao", `%${fullKeyword}%`)
        }

        const { data: propMatches } = await queryProp.limit(1)
        
        if (propMatches && propMatches.length > 0) {
          topProduct = propMatches[0]
          console.log(`Prioridade 2 (MARCA PROP) encontrada: ${topProduct.produto_descricao}`)
          break
        }

        // 3. Busca geral (Mais barato)
        let queryGen = supabase.from("v_produto_filial")
          .select("*")
          .eq("id_filial", filial_id)
          .gt("quantidade", 0)
        
        if (item.tipo === 'principio') {
          queryGen = queryGen.ilike("produto_principio_ativo", `%${fullKeyword}%`)
        } else {
          queryGen = queryGen.ilike("produto_descricao", `%${fullKeyword}%`)
        }

        const { data: genMatches } = await queryGen.order("preco_venda", { ascending: true }).limit(1)
        
        if (genMatches && genMatches.length > 0) {
          topProduct = genMatches[0]
          console.log(`Prioridade 3 (Geral/Preço) encontrada: ${topProduct.produto_descricao}`)
          break
        }
      }
    }

    if (!topProduct) return null

    // 3. IA (Etapa 2): Gerar argumento de venda específico para o produto ENCONTRADO
    console.log("Fluxo de IA (Etapa 2: Argumento de Venda)...")
    const promptArgument = `Como farmacêutico, o cliente está levando "${product_description}" e você vai oferecer também "${topProduct.produto_descricao}".
Crie uma frase curta (máximo 2 linhas) e persuasiva justificando por que levar este segundo item agora.
Seja empático e técnico.`

    const resultArg = await generateWithFallback(promptArgument)
    const argument = resultArg.response.text().trim().replace(/^"|"$/g, '')
    console.log("Argumento gerado:", argument)

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

"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function getProdutoFilial(searchQuery?: string, idFilial?: string) {
  const supabase = await createClient()
  
  let query = supabase
    .from("v_produto_filial")
    .select("*")
    .order("id_filial")

  if (idFilial && idFilial !== "") {
    query = query.eq("id_filial", idFilial)
  }

  if (searchQuery) {
    query = query.or(`id_produto.ilike.%${searchQuery}%,id_filial.ilike.%${searchQuery}%,produto_descricao.ilike.%${searchQuery}%,produto_ean.ilike.%${searchQuery}%,produto_principio_ativo.ilike.%${searchQuery}%,filial_nome.ilike.%${searchQuery}%`)
  }

  const { data, error } = await query
  
  if (error) {
    console.error("Erro ao buscar produto filial", error)
    return []
  }

  // Ordenação numérica por ID da filial
  return data.sort((a: any, b: any) => {
    const idA = parseInt(a.id_filial, 10)
    const idB = parseInt(b.id_filial, 10)
    if (!isNaN(idA) && !isNaN(idB)) return idA - idB
    return a.id_filial.localeCompare(b.id_filial)
  })
}

export async function getDropdownData() {
  const supabase = await createClient()
  
  const { data: filiais } = await supabase.from("filiais").select("id, nome, ativo").eq('ativo', true)
  const { data: produtos } = await supabase.from("produtos").select("id, descricao, ean, principio_ativo, ativo").eq('ativo', true).order("descricao")
  
  // Ordenação numérica por ID
  const sortedFiliais = (filiais || []).sort((a: any, b: any) => {
    const idA = parseInt(a.id, 10)
    const idB = parseInt(b.id, 10)
    if (!isNaN(idA) && !isNaN(idB)) return idA - idB
    return a.id.localeCompare(b.id)
  })

  return {
    filiais: sortedFiliais,
    produtos: produtos || []
  }
}

export async function upsertProdutoFilial(formData: FormData) {
  const supabase = await createClient()
  
  const id_filial = formData.get("id_filial") as string
  const id_produto = formData.get("id_produto") as string
  const preco_venda = parseFloat(formData.get("preco_venda") as string)
  const quantidade = parseInt(formData.get("quantidade") as string, 10)
  const isEdit = formData.get("isEdit") === "true"

  if (!id_filial || !id_produto || isNaN(preco_venda) || isNaN(quantidade)) {
    return { error: "Preencha todos os campos corretamente." }
  }

  try {
    if (isEdit) {
      const { error } = await supabase
        .from("produto_filial")
        .update({ preco_venda, quantidade })
        .eq("id_filial", id_filial)
        .eq("id_produto", id_produto)
        
      if (error) throw error
    } else {
      // Checar se vínculo já existe para impedir duplicidade
      const { data: existing } = await supabase
        .from("produto_filial")
        .select("*")
        .eq("id_filial", id_filial)
        .eq("id_produto", id_produto)
        .single()
        
      if (existing) {
         return { error: "Este produto já está vinculado a esta filial. Edite o registro existente." }
      }

      const { error } = await supabase
        .from("produto_filial")
        .insert({ id_filial, id_produto, preco_venda, quantidade })
        
      if (error) throw error
    }

    revalidatePath("/cadastros/produto-filial")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Ocorreu um erro inesperado." }
  }
}

export async function deleteProdutoFilial(id_filial: string, id_produto: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("produto_filial")
    .delete()
    .eq("id_filial", id_filial)
    .eq("id_produto", id_produto)
  
  if (error) return { error: error.message }
  
  revalidatePath("/cadastros/produto-filial")
  return { success: true }
}

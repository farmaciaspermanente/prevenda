"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function getProdutos(searchQuery?: string) {
  const supabase = await createClient()
  let query = supabase.from("produtos").select("*").order("descricao")

  if (searchQuery) {
    query = query.or(`descricao.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%,ean.ilike.%${searchQuery}%,principio_ativo.ilike.%${searchQuery}%`)
  }

  const { data, error } = await query
  if (error) {
    console.error("Erro ao buscar produtos", error)
    return []
  }
  return data
}

export async function upsertProduto(formData: FormData) {
  const supabase = await createClient()
  
  const id = formData.get("id") as string
  const ean = formData.get("ean") as string
  const descricao = formData.get("descricao") as string
  const principioAtivo = formData.get("principio_ativo") as string
  const subgrupo = formData.get("subgrupo") as string
  const isEdit = formData.get("isEdit") === "true"
  const ativo = formData.get("ativo") === "true"

  if (!id || !descricao) {
    return { error: "Preencha ao menos o ID e a Descrição." }
  }

  try {
    if (isEdit) {
      const { error } = await supabase
        .from("produtos")
        .update({ ean: ean || null, descricao, principio_ativo: principioAtivo || null, subgrupo: subgrupo || null, ativo })
        .eq("id", id)
        
      if (error) throw error
    } else {
      const { data: existingOption } = await supabase.from("produtos").select("id").eq("id", id).single()
      if (existingOption) {
         return { error: "O ID de produto informado já existe." }
      }

      const { error } = await supabase
        .from("produtos")
        .insert({ id, ean: ean || null, descricao, principio_ativo: principioAtivo || null, subgrupo: subgrupo || null, ativo })
        
      if (error) {
        if (error.code === '23505') {
          return { error: "Este EAN já está cadastrado em outro produto." }
        }
        throw error
      }
    }

    revalidatePath("/cadastros/produtos")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Ocorreu um erro inesperado." }
  }
}

export async function toggleProdutoStatus(id: string, currentStatus: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from("produtos").update({ ativo: !currentStatus }).eq("id", id)
  
  if (error) return { error: error.message }
  
  revalidatePath("/cadastros/produtos")
  return { success: true }
}

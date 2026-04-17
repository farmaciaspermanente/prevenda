"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function getFiliais(searchQuery?: string) {
  const supabase = await createClient()
  let query = supabase.from("filiais").select("*").order("nome")

  if (searchQuery) {
    query = query.ilike("nome", `%${searchQuery}%`)
  }

  const { data, error } = await query
  if (error) {
    console.error("Erro ao buscar filiais", error)
    return []
  }
  return data
}

export async function upsertFilial(formData: FormData) {
  const supabase = await createClient()
  
  const id = formData.get("id") as string
  const nome = formData.get("nome") as string
  const cnpj = formData.get("cnpj") as string
  const isEdit = formData.get("isEdit") === "true"
  const ativo = formData.get("ativo") === "true"

  // Validação básica
  if (!id || !nome || !cnpj) {
    return { error: "Preencha todos os campos obrigatórios." }
  }

  try {
    if (isEdit) {
      const { error } = await supabase
        .from("filiais")
        .update({ nome, cnpj, ativo })
        .eq("id", id)
        
      if (error) throw error
    } else {
      // Checar se ID já existe
      const { data: existingOption } = await supabase.from("filiais").select("id").eq("id", id).single()
      if (existingOption) {
         return { error: "O ID informado já existe." }
      }

      const { error } = await supabase
        .from("filiais")
        .insert({ id, nome, cnpj, ativo })
        
      if (error) {
        if (error.code === '23505') {
          return { error: "Este CNPJ já está cadastrado em outra filial." }
        }
        throw error
      }
    }

    revalidatePath("/cadastros/filiais")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Ocorreu um erro inesperado." }
  }
}

export async function toggleFilialStatus(id: string, currentStatus: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from("filiais").update({ ativo: !currentStatus }).eq("id", id)
  
  if (error) return { error: error.message }
  
  revalidatePath("/cadastros/filiais")
  return { success: true }
}

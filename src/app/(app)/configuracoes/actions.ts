"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { revalidatePath } from "next/cache"

export async function getUsers() {
  const supabase = await createClient()
  
  // Pegamos informacoes centralizadas
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      nome,
      role,
      ativo,
      filial_id,
      filiais(nome),
      permissoes_menu(menu)
    `)
    .order("nome")

  if (error) {
    console.error("Erro ao buscar usuários", error)
    return []
  }
  return data
}

export async function getSetupData() {
  const supabase = await createClient()
  // Precisa apenas pegar as filiais ativas para o combo box
  const { data: filiais } = await supabase.from("filiais").select("id, nome").eq("ativo", true)
  return { filiais: filiais || [] }
}

export async function updateUserConfiguration(formData: FormData) {
  const supabase = await createClient()
  
  const id = formData.get("id") as string
  const nome = formData.get("nome") as string
  const role = formData.get("role") as string
  const filial_id = formData.get("filial_id") as string || null
  const ativo = formData.get("ativo") === "true"
  
  // Pegamos os menus marcados como string[] do FormData
  const menus = formData.getAll("menus") as string[]

  try {
    // 1. Atualizar profile master
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ nome, role, ativo, filial_id })
      .eq("id", id)

    if (profileError) throw profileError

    // 2. Apagar permissoes atuais e reinserir as novas
    const { error: deleteError } = await supabase
      .from("permissoes_menu")
      .delete()
      .eq("user_id", id)

    if (deleteError) throw deleteError

    if (menus.length > 0) {
      const inserts = menus.map(menu => ({ user_id: id, menu }))
      const { error: insertError } = await supabase.from("permissoes_menu").insert(inserts)
      if (insertError) throw insertError
    }

    revalidatePath("/configuracoes")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Erro inesperado ao salvar as configurações do usuário." }
  }
}

export async function createNewUser(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const nome = formData.get("nome") as string
  const role = formData.get("role") as string
  const filial_id = formData.get("filial_id") as string || null
  const menus = formData.getAll("menus") as string[]

  if (!email || !password || !nome) {
    return { error: "Nome, Email e Senha são obrigatórios." }
  }

  try {
    const adminClient = createAdminClient()

    // 1. Criar usuário no Auth via Admin (Pula confirmação de email)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome,
        role,
        filial_id
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error("Falha ao criar usuário.")

    const userId = authData.user.id

    // O profile é criado automaticamente via Trigger. 
    // Precisamos apenas garantir que o filial_id seja aplicado caso queiramos forçar (embora o metadata deva cuidar)
    // E inserir as permissões de menu.

    if (menus.length > 0) {
      const inserts = menus.map(menu => ({ user_id: userId, menu }))
      const { error: insertError } = await supabase.from("permissoes_menu").insert(inserts)
      if (insertError) throw insertError
    }

    revalidatePath("/configuracoes")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Erro ao criar novo usuário." }
  }
}

export async function adminResetPassword(formData: FormData) {
  const userId = formData.get("userId") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!userId || !password || !confirmPassword) {
    return { error: "Todos os campos são obrigatórios." }
  }

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." }
  }

  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." }
  }

  try {
    const adminClient = createAdminClient()
    
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: password,
      email_confirm: true
    })

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Erro administrativo ao resetar senha:", error)
    return { error: error.message || "Falha ao resetar a senha do usuário." }
  }
}

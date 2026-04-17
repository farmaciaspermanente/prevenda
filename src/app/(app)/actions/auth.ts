"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!password || !confirmPassword) {
    return { error: "Ambos os campos de senha são obrigatórios." }
  }

  if (password.length < 6) {
    return { error: "A nova senha deve ter pelo menos 6 caracteres." }
  }

  if (password !== confirmPassword) {
    return { error: "As senhas informadas não coincidem." }
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Erro ao alterar senha:", error)
    return { error: error.message || "Falha ao atualizar a senha." }
  }
}

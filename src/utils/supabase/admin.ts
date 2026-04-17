import { createClient } from '@supabase/supabase-js'

/**
 * Cria um cliente do Supabase com privilégios de Service Role.
 * ATENÇÃO: Use apenas no servidor e nunca exponha esta chave ao cliente.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error('A variável SUPABASE_SERVICE_ROLE_KEY não foi encontrada nas variáveis de ambiente.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

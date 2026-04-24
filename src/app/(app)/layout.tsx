import { AppLayout } from "@/components/layout/AppLayout"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Buscar perfil e permissoes_menu
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, role, filial_id, permissoes_menu(menu)")
    .eq("id", user.id)
    .single()

  let allowedMenus = profile?.permissoes_menu?.map((m: any) => m.menu) || []
  
  // Hard-bypass para admins recém criados
  if (profile?.role === 'admin') {
    allowedMenus = [
      "/", 
      "/pedido-venda", 
      "/dashboard-vendas",
      "/cadastros/filiais", 
      "/cadastros/produtos", 
      "/cadastros/produto-filial", 
      "/configuracoes"
    ]
  }

  // Repassar para o AppLayout
  return (
    <AppLayout 
      userProfile={{
         nome: profile?.nome || "Usuário", 
         role: profile?.role || "vendedor",
         filial_id: profile?.filial_id
      }} 
      allowedMenus={allowedMenus}
    >
      {children}
    </AppLayout>
  )
}

import { createClient } from "@/utils/supabase/server"
import { getBranchProducts, getMyOrders } from "./actions"
import PedidoVendaClient from "./components/PedidoVendaClient"

export default async function PedidoVendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("filial_id")
    .eq("id", user.id)
    .single()

  const filial_id = profile?.filial_id || undefined

  let products = []
  let recentOrders = []

  if (filial_id) {
    products = await getBranchProducts(filial_id)
    recentOrders = await getMyOrders()
  }

  return (
    <PedidoVendaClient 
      availableProducts={products} 
      userFilial={filial_id}
      recentOrders={recentOrders}
    />
  )
}

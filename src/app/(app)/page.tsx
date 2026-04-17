import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { createClient } from "@/utils/supabase/server"
import { SalesChart } from "./components/SalesChart"

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch month data
  const date = new Date()
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
  
  const { data: orders } = await supabase
    .from("pedidos")
    .select("total, data_hora")
    .eq("user_id", user.id)
    .gte("data_hora", firstDay)

  const userOrders = orders || []
  
  const totalOrders = userOrders.length
  const totalAmount = userOrders.reduce((acc, curr) => acc + Number(curr.total), 0)

  // Aggregate by day
  const dailyData: Record<string, number> = {}
  
  // Initialize current month up to today
  const today = new Date().getDate()
  for (let i = 1; i <= today; i++) {
    dailyData[i.toString()] = 0
  }

  userOrders.forEach(order => {
    if (order.data_hora) {
      const day = new Date(order.data_hora).getDate().toString()
      if (dailyData[day] !== undefined) {
        dailyData[day] += Number(order.total)
      }
    }
  })

  const chartData = Object.keys(dailyData).map(day => ({
    date: `Dia ${day}`,
    total: dailyData[day]
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-[var(--color-text-muted)]">Bem-vindo ao PreVenda. Aqui está o resumo das suas vendas do mês.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Pedidos Realizados (Mês Atual)</CardDescription>
            <CardTitle className="text-4xl">{totalOrders}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-[var(--color-text-muted)]">Somente vendas computadas com este usuário.</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Valor Vendido (Mês Atual)</CardDescription>
            <CardTitle className="text-4xl text-[var(--color-accent)]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-[var(--color-text-muted)]">Receita bruta gerada.</div>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Evolução Diária de Vendas</CardTitle>
          <CardDescription>
            Acompanhamento das suas vendas do dia 1 até hoje.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4 pt-6 border-t border-[var(--color-border)]">
          <SalesChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  )
}

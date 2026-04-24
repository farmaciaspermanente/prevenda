import React from "react"
import { getDashboardMetrics } from "../pedido-venda/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { TrendingUp, ShoppingBag, Brain, Zap, DollarSign, Target, CalendarDays, ShoppingCart } from "lucide-react"
import { DashboardFilters } from "./components/DashboardFilters"

export const dynamic = 'force-dynamic'

export default async function SalesDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams
  
  // Default to current month if no dates provided
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const startDate = params.start || firstDay
  const endDate = params.end || lastDay

  const metrics = await getDashboardMetrics(startDate, endDate)

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Target className="w-16 h-16 text-neutral-300" />
        <h1 className="text-xl font-semibold text-neutral-500">Acesso Restrito ou Sem Dados</h1>
        <p className="text-neutral-400">Apenas administradores podem visualizar estas métricas.</p>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const iaPercentage = (metrics.iaRevenue / metrics.totalRevenue) * 100 || 0
  const altPercentage = (metrics.altRevenue / metrics.totalRevenue) * 100 || 0

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Performance de Vendas AI</h1>
          <p className="text-neutral-500 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-orange-500" />
            Período: <span className="font-semibold text-neutral-700">{startDate.split('-').reverse().join('/')}</span> até <span className="font-semibold text-neutral-700">{endDate.split('-').reverse().join('/')}</span>
          </p>
        </div>
        <DashboardFilters />
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Faturamento Total</CardTitle>
            <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-neutral-400 mt-1">Vendas finalizadas no período</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-orange-50/50 overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 uppercase tracking-wider">Incremento IA</CardTitle>
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Brain className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{formatCurrency(metrics.iaRevenue)}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-orange-500" />
              <p className="text-xs text-orange-600/80 font-medium">{iaPercentage.toFixed(1)}% do faturamento</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-blue-50/50 overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 uppercase tracking-wider">Conversão Alternativos</CardTitle>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Zap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(metrics.altRevenue)}</div>
            <p className="text-xs text-blue-600/80 mt-1 font-medium">{altPercentage.toFixed(1)}% de economia/conversão</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Volume de Sugestões</CardTitle>
            <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.iaCount + metrics.altCount}</div>
            <p className="text-xs text-neutral-400 mt-1">Produtos aceitos no período</p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
              Distribuição de Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Venda Direta (Manual)</span>
                <span className="font-semibold">{formatCurrency(metrics.manualRevenue)}</span>
              </div>
              <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-neutral-800 h-full transition-all duration-1000" 
                  style={{ width: `${(metrics.manualRevenue / metrics.totalRevenue) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-orange-600 font-medium">Sugestões IA</span>
                <span className="font-semibold text-orange-700">{formatCurrency(metrics.iaRevenue)}</span>
              </div>
              <div className="w-full bg-orange-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-orange-500 h-full transition-all duration-1000" 
                  style={{ width: `${iaPercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-600 font-medium">Produtos Alternativos</span>
                <span className="font-semibold text-blue-700">{formatCurrency(metrics.altRevenue)}</span>
              </div>
              <div className="w-full bg-blue-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-1000" 
                  style={{ width: `${altPercentage}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center p-8 bg-neutral-900 text-white">
          <div className="text-center space-y-4">
             <div className="inline-flex p-3 bg-white/10 rounded-full mb-4">
                <Brain className="w-8 h-8 text-orange-400" />
             </div>
             <h2 className="text-2xl font-bold">Resumo da Inteligência</h2>
             <p className="text-neutral-400 text-sm max-w-[300px]">
                Neste período, a IA foi responsável por um crescimento incremental de <span className="text-orange-400 font-bold">{((metrics.iaRevenue / metrics.manualRevenue) * 100 || 0).toFixed(1)}%</span> nas vendas diretas.
             </p>
             <div className="pt-6">
                <div className="text-4xl font-black text-orange-400">{formatCurrency(metrics.iaRevenue + metrics.altRevenue)}</div>
                <p className="text-xs text-neutral-500 uppercase tracking-widest mt-2">Valor Total Influenciado pela Sugestão</p>
             </div>
          </div>
        </Card>
      </div>
      {/* Suggested Products Table */}
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
        <CardHeader className="border-b border-neutral-50 px-8 py-6">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-neutral-400" />
            Detalhamento de Produtos Sugeridos
          </CardTitle>
          <p className="text-sm text-neutral-400 mt-1">Lista de itens vendidos via IA ou sugestão alternativa no período selecionado.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/50">
                  <th className="px-8 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Produto</th>
                  <th className="px-8 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Origem</th>
                  <th className="px-8 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest text-center">Qtd Total</th>
                  <th className="px-8 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest text-right">Valor Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {metrics.suggestedProducts.length > 0 ? (
                  metrics.suggestedProducts.map((prod, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/30 transition-colors">
                      <td className="px-8 py-4 font-medium text-neutral-700">{prod.descricao}</td>
                      <td className="px-8 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter ${
                          prod.origem === 'IA' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {prod.origem}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-center font-medium text-neutral-600">{prod.quantidade}</td>
                      <td className="px-8 py-4 text-right font-bold text-neutral-900">{formatCurrency(prod.valor)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-neutral-400 italic">
                      Nenhum produto sugerido foi vendido neste período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

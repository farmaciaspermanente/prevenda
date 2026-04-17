"use client"

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface SalesChartProps {
  data: { date: string; total: number }[]
}

export function SalesChart({ data }: SalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis 
          dataKey="date" 
          stroke="var(--color-text-muted)" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="var(--color-text-muted)" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(value) => `R$${value}`}
        />
        <Tooltip 
          cursor={{fill: 'var(--color-canvas)'}}
          contentStyle={{borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)'}}
          formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)}
          labelStyle={{color: 'var(--color-text-muted)', marginBottom: 4}}
        />
        <Bar 
          dataKey="total" 
          fill="var(--color-accent)" 
          radius={[4, 4, 0, 0]} 
          animationDuration={1000}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

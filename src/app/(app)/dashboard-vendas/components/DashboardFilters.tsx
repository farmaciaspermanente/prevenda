"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar } from "lucide-react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

export function DashboardFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [start, setStart] = useState(searchParams.get("start") || "")
  const [end, setEnd] = useState(searchParams.get("end") || "")

  const handleFilter = () => {
    const params = new URLSearchParams()
    if (start) params.set("start", start)
    if (end) params.set("end", end)
    router.push(`/dashboard-vendas?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-4 bg-white p-4 rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-100">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Data Início</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <Input 
            type="date" 
            value={start} 
            onChange={(e) => setStart(e.target.value)}
            className="pl-10 h-10 w-44 bg-neutral-50 border-neutral-100 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Data Fim</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <Input 
            type="date" 
            value={end} 
            onChange={(e) => setEnd(e.target.value)}
            className="pl-10 h-10 w-44 bg-neutral-50 border-neutral-100 focus:bg-white transition-all"
          />
        </div>
      </div>

      <Button onClick={handleFilter} className="bg-black text-white hover:bg-neutral-800 h-10 px-6 rounded-lg transition-all shadow-md active:scale-95">
        Filtrar Resultados
      </Button>
    </div>
  )
}

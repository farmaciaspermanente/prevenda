import { getProdutoFilial, getDropdownData } from "./actions"
import ProdutoFilialClient from "./components/ProdutoFilialClient"

export default async function ProdutoFilialPage() {
  const [data, dropdownData] = await Promise.all([
    getProdutoFilial(),
    getDropdownData()
  ])

  return (
    <ProdutoFilialClient initialData={data} dropdownData={dropdownData} />
  )
}

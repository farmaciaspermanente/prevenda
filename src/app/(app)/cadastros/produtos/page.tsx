import { getProdutos } from "./actions"
import ProdutosClient from "./components/ProdutosClient"

export default async function ProdutosPage() {
  const produtos = await getProdutos()

  return (
    <ProdutosClient initialData={produtos} />
  )
}

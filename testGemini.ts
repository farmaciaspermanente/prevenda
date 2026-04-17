import { getComplementaryProduct } from "./src/app/(app)/pedido-venda/actions"

async function run() {
  console.log("Testing Gemini...")
  const res = await getComplementaryProduct("101", "AMOXICILINA")
  console.log("Result:", res)
}

run()

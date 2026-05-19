import { getComplementaryProduct } from "./src/app/(app)/pedido-venda/actions"

async function run() {
  console.log("Testing Gemini...")
  const res = await getComplementaryProduct("11", "CATAFLAM 50MG")
  console.log("Result:", res)
}

run()

import { getFiliais } from "./actions"
import FiliaisClient from "./components/FiliaisClient"

export default async function FiliaisPage() {
  const filiais = await getFiliais()

  return (
    <FiliaisClient initialData={filiais} />
  )
}

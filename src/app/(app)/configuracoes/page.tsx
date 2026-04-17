import { getUsers, getSetupData } from "./actions"
import ConfiguracoesClient from "./components/ConfiguracoesClient"

export default async function ConfiguracoesPage() {
  const [users, setupData] = await Promise.all([
    getUsers(),
    getSetupData()
  ])

  return (
    <ConfiguracoesClient initialUsers={users} setupData={setupData} />
  )
}

import { login } from "./actions"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Logo } from "@/components/ui/Logo"

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = await props.searchParams
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--color-canvas)] p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center">
          <Logo variant="login" className="mb-4" />
          <CardDescription>Faça login para acessar o sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" action={login}>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-[var(--color-text-main)]">Email</label>
              <Input id="email" name="email" type="email" placeholder="nome@exemplo.com" required />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-[var(--color-text-main)]">Senha</label>
              <Input id="password" name="password" type="password" required />
            </div>
            
            {searchParams?.error && (
              <p className="text-sm text-red-500 font-medium">Credenciais inválidas. Tente novamente.</p>
            )}

            <Button type="submit" className="w-full mt-2" size="lg">Entrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

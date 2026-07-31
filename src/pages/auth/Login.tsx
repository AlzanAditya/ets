import { LoginForm } from "@/components/login-form"

/**
 * Purpose: public login page at /login.
 * Responsibilities: center the LoginForm, apply full-screen layout.
 * Usage notes: no auth guard — accessible without session.
 */
export default function LoginPage() {
  return (
    <div className="dark bg-background text-foreground">
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-3xl">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  LockKeyholeIcon,
  ArrowLeftIcon,
} from "lucide-react";

/**
 * Purpose: email/password login form wired to Supabase Auth.
 * Responsibilities: validate input, call signInWithPassword, redirect on success,
 *                   show inline error on failure.
 * Usage notes: standalone — place inside the login page layout.
 */
export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();

  const [email, setEmail] = React.useState("admin@ets.co.id");
  const [password, setPassword] = React.useState("Admin123!");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      setError(
        authError.message.includes("Invalid login credentials")
          ? "Email atau password salah. Silakan coba lagi."
          : authError.message,
      );
      return;
    }

    // Auth state change will propagate through AuthContext automatically
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 shadow-2xl border-border/60">
        <CardContent className="grid p-0 md:grid-cols-2">
          {/* ── Left panel: form ───────────────────────────────────── */}
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              {/* Header */}
              <div className="flex flex-col items-center gap-3 text-center mb-2">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
                  <LockKeyholeIcon className="size-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Selamat Datang
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Masuk ke Dashboard ETS Tracking
                  </p>
                </div>
              </div>

              {/* Error alert */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                  <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email */}
              <Field>
                <FieldLabel htmlFor="login-email">Email</FieldLabel>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="admin@perusahaan.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                  className="h-[40px]"
                />
              </Field>

              {/* Password */}
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="login-password">Password</FieldLabel>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    className="h-[40px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 size-10 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </Button>
                </div>
              </Field>


              {/* Submit */}
              <div className="flex flex-row gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => navigate("/")}
                >
                  <ArrowLeftIcon className="size-4" />
                </Button>

                <Button
                  type="submit"
                  className="h-10 flex-1"
                  disabled={loading || !email || !password}
                >
                  {loading ? "Sedang masuk..." : "Masuk"}
                </Button>
              </div>
            </FieldGroup>
          </form>

          {/* ── Right panel: branded visual ────────────────────────── */}
          <div className="relative hidden md:flex flex-col items-center justify-center bg-sidebar px-8 py-10 text-white">
            {/* Subtle gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-transparent" />
            <div className="relative z-10 flex flex-col items-center gap-5 text-center">
              <img
                src="/ets-logo.png"
                alt="ETS Logo"
                className="h-16 w-16 object-contain brightness-0 invert"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-1">
                  Protecting &amp; Improving
                </p>
                <p className="text-lg font-bold text-white/90">Electricity</p>
              </div>
              <div className="mt-4 grid gap-2 w-full">
                {[
                  "Manajemen Aset Real-time",
                  "Tracking QR Code",
                  "Laporan Transaksi",
                ].map((f) => (
                  <div
                    key={f}
                    className="flex items-center gap-2 text-xs text-white/50"
                  >
                    <div className="size-1.5 rounded-full bg-primary/60" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center text-xs text-muted-foreground">
        Copyright © 2026 ETS
      </FieldDescription>
    </div>
  );
}

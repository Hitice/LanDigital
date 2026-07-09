import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { auth } from "@/auth";
import { getEntitlementByEmail } from "@/lib/subscriptions";
import { loginGoogle, logout } from "./actions";
import { LogIn, LogOut, CheckCircle2, Crown } from "lucide-react";

export const metadata: Metadata = {
  title: "Minha conta · LanhouseDigital",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Assinatura ativa",
  overdue: "Pagamento em atraso",
  pending: "Aguardando pagamento",
  canceled: "Assinatura cancelada",
  none: "Sem assinatura",
  error: "Sem assinatura",
};

export default async function ContaPage() {
  const session = await auth();

  if (!session?.user?.email) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Entrar</h1>
          <p className="mt-2 text-muted-foreground">
            Acesse sua conta para assinar e usar as ferramentas sem pagar por serviço.
          </p>
          <form action={loginGoogle} className="mt-8">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white py-3.5 font-semibold shadow-sm hover:border-primary hover:text-primary transition-colors"
            >
              <LogIn className="h-5 w-5" /> Entrar com Google
            </button>
          </form>
        </main>
      </div>
    );
  }

  const ent = await getEntitlementByEmail(session.user.email);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-bold">Minha conta</h1>

        <div className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="font-semibold text-foreground">{session.user.name ?? "Usuário"}</p>
          <p className="text-sm text-muted-foreground">{session.user.email}</p>

          <div className="mt-4 flex items-center gap-2">
            {ent.subscribed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                <CheckCircle2 className="h-4 w-4" /> {STATUS_LABEL[ent.status]}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground">
                {STATUS_LABEL[ent.status] ?? "Sem assinatura"}
              </span>
            )}
          </div>
        </div>

        {!ent.subscribed && (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Crown className="h-5 w-5 text-primary" /> Plano LanhouseDigital
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Use as ferramentas sem pagar por serviço. Planos a partir de R$ 6,99/mês.
            </p>
            <Link
              href="/conta/assinar"
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary py-3.5 font-bold text-white hover:bg-primary/90 transition-colors"
            >
              Ver planos e assinar
            </Link>
          </div>
        )}

        <form action={logout} className="mt-6">
          <button
            type="submit"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </main>
    </div>
  );
}

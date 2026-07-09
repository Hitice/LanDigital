import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/auth";
import { PLANS } from "@/lib/plans";
import { subscribe } from "../actions";
import { ArrowLeft, Check } from "lucide-react";

export const metadata: Metadata = { title: "Assinar · LanhouseDigital" };

const ERRO: Record<string, string> = {
  plano: "Escolha um plano.",
  nome: "Informe seu nome completo.",
  cpf: "CPF inválido. Digite os 11 números.",
  asaas: "Não consegui iniciar o pagamento. Tente novamente.",
  checkout: "O checkout não abriu. Tente de novo em instantes.",
};

export default async function AssinarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; plan?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/conta");

  const { erro, plan } = await searchParams;
  const selected = plan === "anual" ? "anual" : "mensal";
  const plans = [PLANS.mensal, PLANS.anual];

  const input =
    "w-full rounded-xl border border-input bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-4 py-10">
        <Link href="/conta" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <h1 className="mt-4 text-2xl font-bold">Escolha seu plano</h1>
        <p className="mt-1 text-muted-foreground">Use todas as ferramentas sem pagar por serviço.</p>

        <form action={subscribe} className="mt-6 space-y-5">
          <div className="space-y-3">
            {plans.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-white p-4 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/30 transition"
              >
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  defaultChecked={p.id === selected}
                  className="mt-1 h-4 w-4 accent-[var(--primary)]"
                />
                <span className="flex-1">
                  <span className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{p.label}</span>
                    <span className="font-bold text-primary">{p.priceLabel}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{p.sublabel}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <input
              name="nome"
              defaultValue={session.user.name ?? ""}
              placeholder="Nome completo"
              required
              className={input}
            />
            <input
              name="cpf"
              inputMode="numeric"
              placeholder="CPF (somente números)"
              required
              className={input}
            />
          </div>

          {erro && <p className="text-sm text-red-600">{ERRO[erro] ?? "Algo deu errado. Tente novamente."}</p>}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-bold text-white hover:bg-primary/90 transition-colors"
          >
            <Check className="h-5 w-5" /> Ir para o pagamento
          </button>
        </form>
      </main>
    </div>
  );
}

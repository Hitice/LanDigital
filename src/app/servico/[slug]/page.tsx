import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { services } from "@/lib/services";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ipvaUrl, UFS } from "@/lib/ipva";
import { Header } from "@/components/Header";
import { LoginGate } from "@/components/LoginGate";
import { salvarUf } from "../actions";
import { ArrowLeft, ExternalLink, ShieldCheck, CheckCircle2, MapPin } from "lucide-react";

function getRedirectService(slug: string) {
  return services.find((s) => s.id === slug && s.mode === "redirect");
}

// Lê a UF salva do usuário (para serviços estaduais).
async function getUserUf(email: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin().from("app_users").select("uf").eq("email", email).single();
    return (data?.uf as string) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const service = getRedirectService(slug);
  if (!service) return { title: "Serviço não encontrado · LanhouseDigital" };
  return {
    title: `${service.title} · LanhouseDigital`,
    description: service.description,
  };
}

export default async function ServicoRedirectPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const service = getRedirectService(slug);
  // Precisa de URL oficial OU ser estadual (que resolve a URL pela UF).
  if (!service || (!service.officialUrl && !service.requiresUf)) notFound();

  // Serviço gratuito exige login (captura de usuários).
  const session = await auth();
  if (!session?.user?.email) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoginGate next={`/servico/${slug}`} title={service.title} />
      </div>
    );
  }

  const Icon = service.icon;

  // Serviço estadual: resolve a URL pela UF do usuário; se não houver, pede a UF.
  const uf = service.requiresUf ? await getUserUf(session.user.email) : null;
  const needUf = !!service.requiresUf && !uf;
  const targetUrl = service.requiresUf ? (uf ? ipvaUrl(uf) : null) : service.officialUrl ?? null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-xl px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos serviços
        </Link>

        <div className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">{service.title}</h1>
          </div>

          <p className="text-muted-foreground leading-relaxed">{service.description}</p>

          {service.requirements && service.requirements.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-foreground">Tenha em mãos:</p>
              <ul className="mt-2 space-y-1.5">
                {service.requirements.map((req) => (
                  <li key={req} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {needUf ? (
            <div className="mt-6">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-primary" /> Selecione seu estado:
              </p>
              <form action={salvarUf}>
                <input type="hidden" name="slug" value={slug} />
                <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-9">
                  {UFS.map((sigla) => (
                    <button
                      key={sigla}
                      name="uf"
                      value={sigla}
                      type="submit"
                      className="rounded-lg border border-border bg-secondary py-2 text-sm font-bold hover:border-primary hover:bg-primary hover:text-white transition-colors"
                    >
                      {sigla}
                    </button>
                  ))}
                </div>
              </form>
            </div>
          ) : (
            <>
              <a
                href={targetUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white transition-colors hover:bg-primary/90"
              >
                Abrir portal oficial <ExternalLink className="h-5 w-5" />
              </a>
              {service.requiresUf && uf && (
                <form action={salvarUf} className="mt-2 text-center">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="uf" value="" />
                  <button type="submit" className="text-xs text-muted-foreground hover:text-primary">
                    Estado: {uf}. Trocar
                  </button>
                </form>
              )}
            </>
          )}

          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Este é um serviço público gratuito. Você será levado ao site oficial, onde faz o login
            e conclui com segurança. A LanhouseDigital não pede sua senha gov.br.
          </p>
        </div>
      </main>
    </div>
  );
}

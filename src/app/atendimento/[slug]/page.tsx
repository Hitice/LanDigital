import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ATENDIMENTOS } from "@/lib/atendimento/config";
import { AtendimentoBot } from "./AtendimentoBot";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const config = ATENDIMENTOS[slug];
  if (!config) return { title: "Atendimento não encontrado · LanhouseDigital" };
  return { title: `${config.title} · LanhouseDigital`, description: config.intro };
}

export default async function AtendimentoPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const config = ATENDIMENTOS[slug];
  if (!config) notFound();

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Header />
      <AtendimentoBot slug={config.id} />
    </div>
  );
}

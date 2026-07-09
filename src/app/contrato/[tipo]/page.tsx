import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { CONTRATOS } from "@/lib/contratos/config";
import { ContratoBot } from "./ContratoBot";

export async function generateMetadata(
  { params }: { params: Promise<{ tipo: string }> },
): Promise<Metadata> {
  const { tipo } = await params;
  const config = CONTRATOS[tipo];
  if (!config) return { title: "Contrato não encontrado · LanhouseDigital" };
  return { title: `${config.title} · LanhouseDigital`, description: config.intro };
}

export default async function ContratoPage(
  { params }: { params: Promise<{ tipo: string }> },
) {
  const { tipo } = await params;
  const config = CONTRATOS[tipo];
  if (!config) notFound();

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Header />
      <ContratoBot tipo={config.id} />
    </div>
  );
}

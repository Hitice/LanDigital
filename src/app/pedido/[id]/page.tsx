import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PedidoTracker } from "./PedidoTracker";

export const metadata: Metadata = { title: "Acompanhar pedido · LanhouseDigital" };

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PedidoTracker id={id} />
    </div>
  );
}

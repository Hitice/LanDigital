import { NextResponse } from "next/server";
import { getPedidoStatus } from "@/lib/pedidos";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = await getPedidoStatus(id);
  if (!status) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json(status);
}

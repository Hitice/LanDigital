import { NextRequest, NextResponse } from "next/server";
import { hasPaidAccess } from "@/lib/access";
import { criarPedido } from "@/lib/pedidos";

export async function POST(req: NextRequest) {
  try {
    const { serviceId, dados, orderId } = await req.json();
    if (!(await hasPaidAccess(orderId))) {
      return NextResponse.json({ error: "pagamento necessário" }, { status: 402 });
    }
    if (!serviceId || !dados || typeof dados !== "object") {
      return NextResponse.json({ error: "dados inválidos" }, { status: 400 });
    }
    const id = await criarPedido(serviceId, dados);
    return NextResponse.json({ id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/pedidos]", msg);
    return NextResponse.json({ error: "falha ao criar pedido" }, { status: 500 });
  }
}

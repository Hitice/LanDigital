import { NextRequest, NextResponse } from "next/server";
import { concluirPedido, falharPedido, marcarProcessando } from "@/lib/pedidos";

function autorizado(req: NextRequest): boolean {
  const token = process.env.WORKER_TOKEN;
  return !!token && req.headers.get("x-worker-token") === token;
}

// O worker reporta o resultado do processamento de um pedido.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!autorizado(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { acao, pdf_base64, erro } = await req.json();
    if (acao === "processando") await marcarProcessando(id);
    else if (acao === "concluir") await concluirPedido(id, pdf_base64);
    else if (acao === "erro") await falharPedido(id, erro || "Falha ao emitir o documento.");
    else return NextResponse.json({ error: "ação inválida" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/fila/id]", msg);
    return NextResponse.json({ error: "falha" }, { status: 500 });
  }
}

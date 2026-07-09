import { NextRequest, NextResponse } from "next/server";
import { listarPendentes } from "@/lib/pedidos";

function autorizado(req: NextRequest): boolean {
  const token = process.env.WORKER_TOKEN;
  return !!token && req.headers.get("x-worker-token") === token;
}

// O worker consulta esta fila para pegar pedidos pendentes.
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const serviceId = new URL(req.url).searchParams.get("serviceId") ?? "antecedentes-criminais";
  return NextResponse.json(await listarPendentes(serviceId));
}

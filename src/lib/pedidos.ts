import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

export type PedidoStatus = "pending" | "processing" | "done" | "error";

export interface Pedido {
  id: string;
  service_id: string;
  status: PedidoStatus;
  dados: Record<string, string>;
  pdf_base64: string | null;
  erro: string | null;
  created_at: string;
}

export async function criarPedido(serviceId: string, dados: Record<string, string>): Promise<string> {
  const { data, error } = await supabaseAdmin()
    .from("pedidos")
    .insert({ service_id: serviceId, dados, status: "pending" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// Status para o cliente acompanhar (sem expor o PDF inteiro).
export async function getPedidoStatus(id: string): Promise<{ status: PedidoStatus; erro: string | null } | null> {
  const { data } = await supabaseAdmin()
    .from("pedidos")
    .select("status, erro")
    .eq("id", id)
    .single();
  return data ? { status: data.status as PedidoStatus, erro: data.erro } : null;
}

export async function getPedidoPdf(id: string): Promise<string | null> {
  const { data } = await supabaseAdmin().from("pedidos").select("pdf_base64, status").eq("id", id).single();
  return data?.status === "done" ? (data.pdf_base64 as string) : null;
}

// Fila para o worker: pedidos pendentes de um serviço.
export async function listarPendentes(serviceId: string, limite = 5): Promise<Pedido[]> {
  const { data } = await supabaseAdmin()
    .from("pedidos")
    .select("*")
    .eq("service_id", serviceId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limite);
  return (data as Pedido[]) ?? [];
}

export async function marcarProcessando(id: string): Promise<void> {
  await supabaseAdmin().from("pedidos").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", id);
}

export async function concluirPedido(id: string, pdfBase64: string): Promise<void> {
  await supabaseAdmin()
    .from("pedidos")
    .update({ status: "done", pdf_base64: pdfBase64, erro: null, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function falharPedido(id: string, erro: string): Promise<void> {
  await supabaseAdmin()
    .from("pedidos")
    .update({ status: "error", erro, updated_at: new Date().toISOString() })
    .eq("id", id);
}

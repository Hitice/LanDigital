// Integração com o Asaas (cobrança recorrente e PIX avulso).
import "server-only";
import { BUSINESS } from "@/lib/config";

const BASE = process.env.ASAAS_BASE_URL ?? "https://api-sandbox.asaas.com/v3";

function apiKey(): string {
  const k = process.env.ASAAS_API_KEY;
  if (!k) throw new Error("ASAAS_API_KEY ausente.");
  return k;
}

async function asaas<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Asaas ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function createCustomer(input: { name: string; email: string; cpfCnpj?: string }): Promise<{ id: string }> {
  return asaas("/customers", { method: "POST", body: JSON.stringify(input) });
}

// Cliente único de recebimento (CNPJ do negócio). O Asaas exige CPF/CNPJ na
// cobrança; como o QR PIX é dinâmico e qualquer pessoa paga, usamos um só.
let receiverPromise: Promise<string> | null = null;
async function getReceiverCustomerId(): Promise<string> {
  if (process.env.ASAAS_CUSTOMER_ID) return process.env.ASAAS_CUSTOMER_ID;
  if (!receiverPromise) {
    receiverPromise = createCustomer({
      name: BUSINESS.name,
      email: "financeiro@lanhousedigital.app",
      cpfCnpj: BUSINESS.cnpj,
    }).then((c) => {
      console.log(`[asaas] cliente de recebimento criado: ${c.id} — defina ASAAS_CUSTOMER_ID no .env.local para reutilizar.`);
      return c.id;
    }).catch((e) => { receiverPromise = null; throw e; });
  }
  return receiverPromise;
}

export async function createSubscription(input: {
  customerId: string;
  value: number;
  cycle: string;                 // MONTHLY | YEARLY | ...
  billingType?: string;          // CREDIT_CARD | PIX | UNDEFINED
  description?: string;
}): Promise<{ id: string }> {
  const nextDueDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  return asaas("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: input.billingType ?? "UNDEFINED",
      value: input.value,
      nextDueDate,
      cycle: input.cycle,
      description: input.description ?? "Assinatura LanhouseDigital",
    }),
  });
}

// Pagamento único (PIX) em nome do próprio usuário, com checkout hospedado.
export async function createUserPixPayment(input: {
  customerId: string;
  value: number;
  description: string;
}): Promise<{ paymentId: string; invoiceUrl: string }> {
  const dueDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  const p = await asaas<{ id: string; invoiceUrl: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: "PIX",
      value: input.value,
      dueDate,
      description: input.description,
    }),
  });
  return { paymentId: p.id, invoiceUrl: p.invoiceUrl };
}

// URL do checkout do primeiro pagamento da assinatura.
// O Asaas gera o pagamento com um pequeno atraso, então tentamos algumas vezes.
export async function firstPaymentUrl(subscriptionId: string): Promise<string | undefined> {
  for (let i = 0; i < 4; i++) {
    const data = await asaas<{ data?: Array<{ invoiceUrl?: string }> }>(`/subscriptions/${subscriptionId}/payments`);
    const url = data.data?.[0]?.invoiceUrl;
    if (url) return url;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return undefined;
}

// ─── PIX avulso (cobrança por serviço) ──────────────────────────────────────
export interface PixCharge {
  paymentId: string;
  payload: string;        // PIX copia e cola
  encodedImage: string;   // QR Code em base64 (PNG)
}

// Cria uma cobrança PIX dinâmica e devolve o QR. A própria cobrança é o "pedido".
export async function createPixCharge(input: {
  value: number;
  description: string;
}): Promise<PixCharge> {
  const customerId = await getReceiverCustomerId();

  const dueDate = new Date().toISOString().slice(0, 10);
  const payment = await asaas<{ id: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: input.value,
      dueDate,
      description: input.description,
    }),
  });

  const qr = await asaas<{ encodedImage: string; payload: string }>(`/payments/${payment.id}/pixQrCode`);
  return { paymentId: payment.id, payload: qr.payload, encodedImage: qr.encodedImage };
}

// Consulta se a cobrança foi paga.
export async function getPaymentStatus(id: string): Promise<{ status: string; paid: boolean }> {
  const p = await asaas<{ status: string }>(`/payments/${id}`);
  const paid = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(p.status);
  return { status: p.status, paid };
}

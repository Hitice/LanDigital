import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ACCESS_DAYS } from "@/lib/plans";

// Recebe eventos do Asaas e atualiza o status da assinatura no Supabase.
export async function POST(req: NextRequest) {
  const token = req.headers.get("asaas-access-token");
  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const event = body.event as string;
    const payment = body.payment ?? {};
    const subscriptionId = payment.subscription as string | undefined;
    const paymentId = payment.id as string | undefined;

    let status: string | null = null;
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") status = "active";
    else if (event === "PAYMENT_OVERDUE") status = "overdue";
    else if (event === "SUBSCRIPTION_DELETED" || event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") status = "canceled";

    if (!status) return NextResponse.json({ ok: true });

    const sb = supabaseAdmin();

    // Idempotência: ignora eventos repetidos (o Asaas pode reenviar).
    const eventKey = `${event}:${paymentId ?? subscriptionId ?? "x"}`;
    const { error: dupErr } = await sb.from("processed_webhooks").insert({ key: eventKey });
    if (dupErr?.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };

    if (subscriptionId) {
      // Plano anual (recorrente)
      await sb.from("subscriptions").update(update).eq("asaas_subscription_id", subscriptionId);
    } else if (paymentId) {
      // Plano mensal (PIX avulso): ao confirmar, dá 30 dias de acesso.
      if (status === "active") {
        update.current_period_end = new Date(Date.now() + ACCESS_DAYS * 24 * 3600 * 1000).toISOString();
      }
      await sb.from("subscriptions").update(update).eq("asaas_payment_id", paymentId);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/webhooks/asaas]", msg);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}

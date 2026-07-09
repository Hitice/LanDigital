"use server";

import { redirect } from "next/navigation";
import { signIn, signOut, auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { createCustomer, createSubscription, createUserPixPayment, firstPaymentUrl } from "@/lib/asaas";
import { PLANS, ACCESS_DAYS, type PlanId } from "@/lib/plans";
import { isPaymentBypass } from "@/lib/payments";

export async function loginGoogle() {
  await signIn("google", { redirectTo: "/conta" });
}

// Login que retorna para a página de origem (campo oculto "next").
export async function loginGoogleTo(formData: FormData) {
  const next = String(formData.get("next") ?? "/conta");
  await signIn("google", { redirectTo: next.startsWith("/") ? next : "/conta" });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

// Fluxo: usuário escolhe o plano e informa nome + CPF; criamos o cliente no
// Asaas e abrimos o checkout. O Asaas exige nome e CPF/CNPJ no cliente.
export async function subscribe(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/conta");

  const planId = String(formData.get("plan") ?? "") as PlanId;
  const plan = PLANS[planId];
  const nome = String(formData.get("nome") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").replace(/\D/g, "");

  if (!plan) redirect("/conta/assinar?erro=plano");
  if (nome.length < 3) redirect(`/conta/assinar?erro=nome&plan=${planId}`);
  if (cpf.length !== 11 && cpf.length !== 14) redirect(`/conta/assinar?erro=cpf&plan=${planId}`);

  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("app_users")
    .select("id, asaas_customer_id")
    .eq("email", session.user.email)
    .single();
  if (!user) redirect("/conta");

  // Bypass de teste: ativa a assinatura na hora, sem pagamento real.
  if (isPaymentBypass()) {
    const periodEnd =
      plan.kind === "pix-onetime"
        ? new Date(Date.now() + ACCESS_DAYS * 24 * 3600 * 1000).toISOString()
        : null;
    await sb.from("subscriptions").insert({
      user_id: user.id,
      plan: plan.id,
      status: "active",
      current_period_end: periodEnd,
    });
    redirect("/conta");
  }

  let checkoutUrl: string | undefined;
  try {
    let customerId = user.asaas_customer_id as string | null;
    if (!customerId) {
      const c = await createCustomer({ name: nome, email: session.user.email, cpfCnpj: cpf });
      customerId = c.id;
    }
    await sb.from("app_users").update({ asaas_customer_id: customerId, name: nome }).eq("id", user.id);

    if (plan.kind === "pix-onetime") {
      const pay = await createUserPixPayment({
        customerId,
        value: plan.charge,
        description: "Plano Mensal LanhouseDigital",
      });
      await sb.from("subscriptions").insert({
        user_id: user.id,
        plan: plan.id,
        asaas_payment_id: pay.paymentId,
        status: "pending",
      });
      checkoutUrl = pay.invoiceUrl;
    } else {
      const sub = await createSubscription({
        customerId,
        value: plan.charge,
        cycle: "YEARLY",
        billingType: "CREDIT_CARD",
        description: "Plano Anual LanhouseDigital",
      });
      await sb.from("subscriptions").insert({
        user_id: user.id,
        plan: plan.id,
        asaas_subscription_id: sub.id,
        status: "pending",
      });
      checkoutUrl = await firstPaymentUrl(sub.id);
    }
  } catch (e) {
    console.error("[subscribe]", e);
    redirect(`/conta/assinar?erro=asaas&plan=${planId}`);
  }

  redirect(checkoutUrl ?? `/conta/assinar?erro=checkout&plan=${planId}`);
}

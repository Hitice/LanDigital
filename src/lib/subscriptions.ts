import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

export interface Entitlement {
  subscribed: boolean;
  status: string;   // active | overdue | canceled | pending | none | error
}

// Verifica, pelo e-mail, se o usuário tem assinatura ativa.
export async function getEntitlementByEmail(email: string): Promise<Entitlement> {
  try {
    const sb = supabaseAdmin();
    const { data: user } = await sb.from("app_users").select("id").eq("email", email).single();
    if (!user) return { subscribed: false, status: "none" };

    const { data: sub } = await sb
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const status = sub?.status ?? "none";
    // Ativo: status "active" e, se houver validade (plano mensal), ainda não expirou.
    const notExpired = !sub?.current_period_end || new Date(sub.current_period_end) > new Date();
    return { subscribed: status === "active" && notExpired, status };
  } catch {
    return { subscribed: false, status: "error" };
  }
}

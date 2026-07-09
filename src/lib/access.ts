import "server-only";
import { auth } from "@/auth";
import { getEntitlementByEmail } from "@/lib/subscriptions";
import { getPaymentStatus } from "@/lib/asaas";
import { isPaymentBypass } from "@/lib/payments";

/**
 * Autoriza a entrega de um serviço pago, verificando no servidor:
 *   1. bypass de teste (somente fora de produção);
 *   2. assinante com plano ativo (sessão logada);
 *   3. cobrança avulsa efetivamente paga (orderId do Asaas).
 *
 * Centraliza a regra de monetização num único ponto, fácil de evoluir e testar.
 */
export async function hasPaidAccess(orderId?: string): Promise<boolean> {
  if (isPaymentBypass()) return true;

  const session = await auth();
  if (session?.user?.email) {
    const { subscribed } = await getEntitlementByEmail(session.user.email);
    if (subscribed) return true;
  }

  if (orderId && orderId !== "bypass") {
    try {
      const { paid } = await getPaymentStatus(orderId);
      if (paid) return true;
    } catch {
      /* falha de consulta não concede acesso */
    }
  }

  return false;
}

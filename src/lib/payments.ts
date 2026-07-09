import "server-only";

/**
 * Bypass de pagamento para ambiente de teste.
 *
 * Defesa em profundidade: além de exigir a flag explícita `PAYMENT_BYPASS=true`,
 * nunca ativa quando `NODE_ENV === "production"`. Assim, mesmo que a variável
 * vaze para o ambiente de produção por engano, o bypass permanece desligado.
 */
export function isPaymentBypass(): boolean {
  return process.env.PAYMENT_BYPASS === "true" && process.env.NODE_ENV !== "production";
}

// Planos de assinatura.
export type PlanId = "mensal" | "anual";

export interface Plan {
  id: PlanId;
  label: string;
  charge: number;          // valor realmente cobrado no Asaas
  priceLabel: string;      // como o preço aparece para o usuário
  sublabel: string;        // explicação curta
  kind: "pix-onetime" | "card-yearly";
}

export const PLANS: Record<PlanId, Plan> = {
  mensal: {
    id: "mensal",
    label: "Mensal",
    charge: 9.99,
    priceLabel: "R$ 9,99",
    sublabel: "Pagamento único via PIX, 30 dias de acesso.",
    kind: "pix-onetime",
  },
  anual: {
    id: "anual",
    label: "Anual",
    charge: 83.88,                 // 6,99 x 12
    priceLabel: "R$ 6,99/mês",
    sublabel: "No cartão de crédito, cobrado R$ 83,88 por ano.",
    kind: "card-yearly",
  },
};

export const ACCESS_DAYS = 30;     // duração do plano mensal avulso

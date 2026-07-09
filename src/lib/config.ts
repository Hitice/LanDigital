// Configuração central do negócio.
export const BUSINESS = {
  name: "LanhouseDigital",
  cnpj: "39914870000101",
  // WhatsApp oficial do balcão (formato internacional, só dígitos: DDI + DDD + número).
  // Defina NEXT_PUBLIC_BUSINESS_WHATSAPP no .env.local. O valor abaixo é só placeholder.
  whatsapp: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP ?? "5511999999999",
};

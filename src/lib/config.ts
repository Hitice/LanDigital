// Configuração central do negócio.
export const BUSINESS = {
  name: "LanhouseDigital",
  // CNPJ do recebedor usado nas cobranças do Asaas (só dígitos).
  // Defina BUSINESS_CNPJ no .env.local. O valor abaixo é só placeholder.
  cnpj: process.env.BUSINESS_CNPJ ?? "00000000000000",
  // Razão social mostrada no rodapé. Defina BUSINESS_LEGAL_NAME no .env.local.
  legalName: process.env.BUSINESS_LEGAL_NAME ?? "Sua Empresa Ltda",
  // WhatsApp oficial do balcão (formato internacional, só dígitos: DDI + DDD + número).
  // Defina NEXT_PUBLIC_BUSINESS_WHATSAPP no .env.local. O valor abaixo é só placeholder.
  whatsapp: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP ?? "5511999999999",
};

// CNPJ só dígitos -> 00.000.000/0000-00. Devolve como veio se não tiver 14 dígitos.
export function formatCnpj(digits: string): string {
  return /^\d{14}$/.test(digits) ? digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : digits;
}

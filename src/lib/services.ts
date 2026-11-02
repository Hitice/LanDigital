import {
  FileText, Landmark, Receipt, Car, TriangleAlert,
  FileBadge2, Home, Building2, Handshake, AlignLeft, ScanLine,
  Briefcase, FileSignature, Wrench, Fingerprint,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Como o serviço é entregue:
// - "instant"  : software gera a entrega na hora (currículo, contrato, organizador)
// - "redirect" : nós só levamos o cliente ao portal oficial, ele loga e resolve
// - "assisted" : o bot coleta os dados, cobra o PIX e encaminha ao balcão (WhatsApp)
export type ServiceMode = "instant" | "redirect" | "assisted";

export type ServiceCategory =
  | "curriculo"
  | "contratos"
  | "documentos"
  | "cpf"
  | "inss"
  | "veiculos";

export interface ServiceCategoryInfo {
  id: ServiceCategory;
  label: string;
  icon: LucideIcon;
}

// Ordem em que as seções aparecem na home
export const serviceCategories: ServiceCategoryInfo[] = [
  { id: "curriculo",  label: "Currículo e carreira",      icon: Briefcase },
  { id: "contratos",  label: "Contratos e documentos",    icon: FileSignature },
  { id: "documentos", label: "Ferramentas de documento",  icon: Wrench },
  { id: "cpf",        label: "CPF e Receita",             icon: Fingerprint },
  { id: "inss",       label: "INSS e Previdência",        icon: Landmark },
  { id: "veiculos",   label: "Veículos",                  icon: Car },
];

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number | null;          // null = serviço oficial gratuito (só redirecionamos)
  icon: LucideIcon;
  href: string;
  category: ServiceCategory;
  mode: ServiceMode;
  available: boolean;            // false = aparece como "Em breve"
  officialUrl?: string;          // usado quando mode === "redirect"
  requirements?: string[];       // o que o cliente precisa ter em mãos
  requiresUf?: boolean;          // serviço estadual: pede a UF antes de redirecionar
}

export const services: Service[] = [
  // ── Currículo ──────────────────────────────────────────────────────────────
  {
    id: "curriculo",
    title: "Criador de Currículo",
    description: "Responda o passo a passo e a IA monta seu currículo profissional em PDF.",
    price: 5.0,
    icon: FileText,
    href: "/curriculo",
    category: "curriculo",
    mode: "instant",
    available: true,
  },

  // ── Contratos (mesmo molde do currículo: bot pergunta, IA gera no final) ─────
  {
    id: "contrato-locacao-residencial",
    title: "Contrato de Locação Residencial",
    description: "Responda os dados do imóvel e das partes; a IA gera o contrato pronto em PDF.",
    price: 5.0,
    icon: Home,
    href: "/contrato/locacao-residencial",
    category: "contratos",
    mode: "instant",
    available: true,
  },
  {
    id: "contrato-locacao-comercial",
    title: "Contrato de Locação Comercial",
    description: "Aluguel de ponto ou sala comercial, com cláusulas próprias, gerado por IA.",
    price: 5.0,
    icon: Building2,
    href: "/contrato/locacao-comercial",
    category: "contratos",
    mode: "instant",
    available: true,
  },
  {
    id: "contrato-prestacao-servicos",
    title: "Contrato de Prestação de Serviços",
    description: "Defina serviço, prazo e valor; a IA monta o contrato entre as partes.",
    price: 5.0,
    icon: Handshake,
    href: "/contrato/prestacao-servicos",
    category: "contratos",
    mode: "instant",
    available: true,
  },

  // ── Ferramentas de documento ────────────────────────────────────────────────
  {
    id: "formatacao-abnt",
    title: "Formatação ABNT",
    description: "Envie seu texto e receba o trabalho formatado nas normas ABNT em PDF.",
    price: 5.0,
    icon: AlignLeft,
    href: "/abnt",
    category: "documentos",
    mode: "instant",
    available: true,
  },
  {
    id: "organizador-documentos",
    title: "Organizador de Documentos",
    description: "Fotografe um documento; a IA endireita, lê os dados e gera um PDF pronto para imprimir.",
    price: 5.0,
    icon: ScanLine,
    href: "/organizador",
    category: "documentos",
    mode: "instant",
    available: true,
  },

  // ── CPF e Receita (redirecionamento ao portal oficial) ──────────────────────
  {
    id: "2-via-cpf",
    title: "2ª via / Comprovante de CPF",
    description: "Informe seus dados e baixe uma ficha em PDF da 2ª via / situação cadastral do CPF.",
    price: 10.0,
    icon: FileText,
    href: "/atendimento/2-via-cpf",
    category: "cpf",
    mode: "assisted",
    available: true,
  },

  // ── INSS e Previdência ──────────────────────────────────────────────────────
  {
    id: "extrato-cnis",
    title: "Extrato CNIS",
    description: "Acesse o Meu INSS com sua conta gov.br e baixe o extrato CNIS.",
    price: null,
    icon: Landmark,
    href: "/servico/extrato-cnis",
    category: "inss",
    mode: "redirect",
    officialUrl: "https://meu.inss.gov.br/",
    available: true,
    requirements: ["Conta gov.br (login e senha)"],
  },
  {
    id: "emissao-gps",
    title: "Emissão de GPS",
    description: "Gere a Guia da Previdência Social para contribuição no portal da Receita.",
    price: null,
    icon: Receipt,
    href: "/servico/emissao-gps",
    category: "inss",
    mode: "redirect",
    officialUrl: "https://www8.receita.fazenda.gov.br/SimuladorGPS/",
    available: true,
    requirements: ["Número de inscrição (NIT/PIS/PASEP)", "Código de pagamento", "Competência"],
  },

  // ── Veículos ────────────────────────────────────────────────────────────────
  {
    id: "ipva",
    title: "Consulta e Emissão de IPVA",
    description: "Consulte e emita o IPVA no portal da Secretaria da Fazenda do seu estado.",
    price: null,
    icon: Car,
    href: "/servico/ipva",
    category: "veiculos",
    mode: "redirect",
    requiresUf: true,            // pergunta o estado e leva ao portal da Sefaz correta
    available: true,
    requirements: ["Renavam", "Placa do veículo"],
  },
  {
    id: "consulta-multas",
    title: "Consulta de Multas",
    description: "Consulte multas e pontuação no portal oficial de trânsito (Senatran).",
    price: null,
    icon: TriangleAlert,
    href: "/servico/consulta-multas",
    category: "veiculos",
    mode: "redirect",
    officialUrl: "https://portalservicos.senatran.serpro.gov.br/",
    available: true,
    requirements: ["Conta gov.br", "Renavam ou placa"],
  },
  {
    id: "crlv-digital",
    title: "CRLV Digital",
    description: "Emita o documento digital do veículo (CRLV-e) pela Carteira Digital de Trânsito.",
    price: null,
    icon: FileBadge2,
    href: "/servico/crlv-digital",
    category: "veiculos",
    mode: "redirect",
    officialUrl: "https://www.gov.br/pt-br/servicos/emitir-certificado-de-registro-e-licenciamento-de-veiculo-digital",
    available: true,
    requirements: ["Conta gov.br", "Renavam", "Licenciamento do ano pago"],
  },
];

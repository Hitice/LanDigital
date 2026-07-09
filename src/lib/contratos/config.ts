import type { BotStep } from "@/components/SimpleBot";
import { validateDoc, validateFullName } from "@/lib/validators";

export interface ContratoConfig {
  id: string;
  title: string;
  price: number;
  intro: string;
  steps: BotStep[];
}

// Passo de CPF/CNPJ com validação (rejeita documento inválido).
const docStep = (id: string, ask: string, placeholder = "000.000.000-00"): BotStep =>
  ({ id, ask, kind: "text", placeholder, validate: validateDoc });

// Passos comuns de endereço do imóvel (CEP via ViaCEP + número + complemento).
const enderecoImovel: BotStep[] = [
  { id: "imovel", ask: "Qual o **CEP do imóvel**?", kind: "cep", placeholder: "Ex: 38400-000" },
  {
    id: "imovel_numero", ask: "Qual o **número** do imóvel? ({imovel_logradouro})", kind: "text", placeholder: "Ex: 123",
    validate: (v) => /\d/.test(v) || /^s\/?n$/i.test(v.trim()) ? null : "Digite o número (ex: 123) ou S/N.",
  },
  { id: "imovel_complemento", ask: "Algum **complemento**? (apto, bloco) (opcional)", kind: "text", placeholder: "Ex: Apto 22", optional: true },
];

const garantia: BotStep = {
  id: "garantia",
  ask: "Qual a **garantia** do contrato?",
  kind: "options",
  options: [
    "Caução de 1 aluguel",
    "Caução de 2 aluguéis",
    "Caução de 3 aluguéis",
    "Fiador",
    "Seguro-fiança",
    "Sem garantia",
  ],
};

// Dados do fiador, perguntados apenas quando a garantia é "Fiador".
const fiador: BotStep[] = [
  {
    id: "fiador_nome", ask: "Nome completo do **fiador**?", kind: "text",
    placeholder: "Ex: Pedro Santos", validate: validateFullName, skipIf: (a) => a.garantia !== "Fiador",
  },
  {
    id: "fiador_doc", ask: "CPF ou CNPJ do **fiador**?", kind: "text",
    placeholder: "000.000.000-00", validate: validateDoc, skipIf: (a) => a.garantia !== "Fiador",
  },
];

const observacoes: BotStep = {
  id: "observacoes",
  ask: "Alguma **observação** ou cláusula especial? (opcional)",
  kind: "textarea",
  placeholder: "Ex: imóvel mobiliado, animais permitidos...",
  optional: true,
};

export const CONTRATOS: Record<string, ContratoConfig> = {
  "locacao-residencial": {
    id: "locacao-residencial",
    title: "Contrato de Locação Residencial",
    price: 5.0,
    intro: "Vou montar seu **contrato de locação residencial**. Responda os dados das partes e do imóvel, e geramos o contrato pronto em PDF.",
    steps: [
      { id: "locador_nome", ask: "Nome completo do **locador** (dono do imóvel)?", kind: "text", placeholder: "Ex: João da Silva" },
      docStep("locador_doc", "CPF ou CNPJ do **locador**?"),
      { id: "locatario_nome", ask: "Nome completo do **locatário** (quem vai morar)?", kind: "text", placeholder: "Ex: Maria Souza" },
      docStep("locatario_doc", "CPF do **locatário**?"),
      ...enderecoImovel,
      { id: "valor", ask: "Valor do **aluguel mensal**?", kind: "money" },
      { id: "vencimento", ask: "**Dia do vencimento** do aluguel? (ex: 5)", kind: "text", placeholder: "5" },
      { id: "prazo", ask: "**Prazo** do contrato em meses? (ex: 30)", kind: "text", placeholder: "30" },
      { id: "inicio", ask: "**Data de início** da locação?", kind: "date" },
      garantia,
      ...fiador,
      observacoes,
    ],
  },

  "locacao-comercial": {
    id: "locacao-comercial",
    title: "Contrato de Locação Comercial",
    price: 5.0,
    intro: "Vou montar seu **contrato de locação comercial**. Responda os dados das partes, do ponto e da atividade, e geramos o contrato em PDF.",
    steps: [
      { id: "locador_nome", ask: "Nome ou razão social do **locador**?", kind: "text", placeholder: "Ex: Imobiliária Central LTDA" },
      docStep("locador_doc", "CPF ou CNPJ do **locador**?", "00.000.000/0001-00"),
      { id: "locatario_nome", ask: "Nome ou razão social do **locatário** (empresa ou pessoa)?", kind: "text", placeholder: "Ex: Padaria do Bairro LTDA" },
      docStep("locatario_doc", "CPF ou CNPJ do **locatário**?", "00.000.000/0001-00"),
      { id: "atividade", ask: "Qual **atividade** será exercida no imóvel?", kind: "text", placeholder: "Ex: comércio de alimentos" },
      ...enderecoImovel,
      { id: "valor", ask: "Valor do **aluguel mensal**?", kind: "money" },
      { id: "vencimento", ask: "**Dia do vencimento** do aluguel? (ex: 10)", kind: "text", placeholder: "10" },
      { id: "prazo", ask: "**Prazo** do contrato em meses? (ex: 36)", kind: "text", placeholder: "36" },
      { id: "inicio", ask: "**Data de início** da locação?", kind: "date" },
      garantia,
      ...fiador,
      observacoes,
    ],
  },

  "prestacao-servicos": {
    id: "prestacao-servicos",
    title: "Contrato de Prestação de Serviços",
    price: 5.0,
    intro: "Vou montar seu **contrato de prestação de serviços**. Responda as partes, o serviço e o valor, e geramos o contrato em PDF.",
    steps: [
      { id: "contratante_nome", ask: "Nome ou razão social de quem **contrata** o serviço?", kind: "text", placeholder: "Ex: Loja ABC LTDA" },
      docStep("contratante_doc", "CPF ou CNPJ do **contratante**?"),
      { id: "contratado_nome",  ask: "Nome ou razão social de quem vai **prestar** o serviço?", kind: "text", placeholder: "Ex: Carlos Eletricista" },
      docStep("contratado_doc", "CPF ou CNPJ do **prestador**?"),
      { id: "servico", ask: "Descreva o **serviço** a ser prestado.", kind: "textarea", placeholder: "Ex: instalação elétrica completa do imóvel" },
      { id: "valor", ask: "**Valor total** do serviço?", kind: "money" },
      { id: "pagamento", ask: "Como será o **pagamento**?", kind: "options", options: ["À vista", "Parcelado", "Por etapas", "Mensal"] },
      { id: "prazo", ask: "**Prazo de execução**? (ex: 30 dias)", kind: "text", placeholder: "30 dias" },
      { id: "inicio", ask: "**Data de início**?", kind: "date" },
      { id: "foro", ask: "Qual o **CEP** da cidade que será o foro do contrato?", kind: "cep", placeholder: "Ex: 38400-000" },
      observacoes,
    ],
  },
};

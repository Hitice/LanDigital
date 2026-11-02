import type { BotStep } from "@/components/SimpleBot";
import { validateDoc, validateFullName, formatDoc } from "@/lib/validators";

const FIELD_LABELS: Record<string, string> = {
  nome: "Nome", cpf: "CPF", nascimento: "Nascimento", contato: "Telefone",
};

// Formata valores específicos (CPF pontuado, data em DD/MM/AAAA).
function formatValor(key: string, value: string): string {
  if (key === "cpf") return formatDoc(value);
  if (key === "nascimento") {
    const [y, m, d] = value.split("-");
    return y && m && d ? `${d}/${m}/${y}` : value;
  }
  return value;
}

// Lista de campos rotulados e formatados, para gerar a ficha em PDF.
export function formatAnswers(answers: Record<string, string>): { label: string; valor: string }[] {
  return Object.entries(answers).map(([k, v]) => ({ label: FIELD_LABELS[k] ?? k, valor: formatValor(k, v) }));
}

export interface AtendimentoConfig {
  id: string;
  title: string;
  price: number;
  intro: string;
  steps: BotStep[];
}

const contato: BotStep = {
  id: "contato",
  ask: "Um **telefone** para contato? (opcional)",
  kind: "text",
  placeholder: "(11) 99999-9999",
  optional: true,
};

export const ATENDIMENTOS: Record<string, AtendimentoConfig> = {
  "2-via-cpf": {
    id: "2-via-cpf",
    title: "2ª via / Comprovante de CPF",
    price: 10.0,
    intro: "Vou coletar seus dados da **2ª via / situação cadastral do CPF** e gerar uma ficha em PDF para você baixar.",
    steps: [
      { id: "nome", ask: "Qual é o seu **nome completo**?", kind: "text", placeholder: "Ex: Maria da Silva", validate: validateFullName },
      { id: "cpf", ask: "Qual é o seu **CPF**?", kind: "text", placeholder: "000.000.000-00", validate: validateDoc },
      { id: "nascimento", ask: "Qual é a sua **data de nascimento**?", kind: "date" },
      contato,
    ],
  },
};

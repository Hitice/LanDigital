import { describe, it, expect } from "vitest";
import { CONTRATOS } from "./config";
import { gerarContratoBody } from "./modelos";
import type { BotStep, BotAnswers } from "@/components/SimpleBot";

// Preenche um passo do bot com um valor plausível conforme o tipo de campo.
function fillStep(step: BotStep, answers: BotAnswers, override?: string): void {
  if (step.kind === "cep") {
    answers[`${step.id}_logradouro`] = "Rua das Flores";
    answers[`${step.id}_bairro`] = "Centro";
    answers[`${step.id}_cidade`] = "Uberlândia";
    answers[`${step.id}_uf`] = "MG";
    answers[`${step.id}_cep`] = "38400-000";
    answers[step.id] = "38400-000";
    return;
  }
  if (override !== undefined) answers[step.id] = override;
  else if (step.kind === "options") answers[step.id] = step.options?.[0] ?? "";
  else if (step.kind === "money") answers[step.id] = "1.000,00";
  else if (step.kind === "date") answers[step.id] = "2026-01-01";
  else if (step.validate) answers[step.id] = "52998224725"; // campo de documento
  else answers[step.id] = "Exemplo";
}

// Simula o usuário respondendo o bot inteiro, respeitando os passos condicionais.
function simulate(steps: BotStep[], overrides: BotAnswers = {}): BotAnswers {
  const answers: BotAnswers = {};
  for (const step of steps) {
    if (step.skipIf?.(answers)) continue;
    fillStep(step, answers, overrides[step.id]);
  }
  return answers;
}

describe("integração: todo contrato gera sem placeholder vazio", () => {
  for (const [tipo, config] of Object.entries(CONTRATOS)) {
    it(tipo, () => {
      const html = gerarContratoBody(tipo, simulate(config.steps));
      expect(html).not.toContain("undefined");
      expect(html).not.toContain("[object Object]");
      expect(html).toContain("Testemunhas:");
    });
  }
});

describe("integração: variações de garantia na locação residencial", () => {
  const garantias = [
    "Caução de 1 aluguel", "Caução de 2 aluguéis", "Caução de 3 aluguéis",
    "Fiador", "Seguro-fiança", "Sem garantia",
  ];
  for (const g of garantias) {
    it(`garantia: ${g}`, () => {
      const answers = simulate(CONTRATOS["locacao-residencial"].steps, { garantia: g });
      const html = gerarContratoBody("locacao-residencial", answers);
      expect(html).not.toContain("undefined");
      if (g === "Fiador") {
        expect(html).toContain("FIADOR");
        expect(html).toContain("responsável solidário");
      } else {
        expect(html).not.toContain("FIADOR");
      }
    });
  }
});

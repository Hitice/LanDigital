import { describe, it, expect } from "vitest";
import { gerarContratoBody } from "./modelos";
import type { BotAnswers } from "@/components/SimpleBot";

const locacao: BotAnswers = {
  locador_nome: "João Silva", locador_doc: "52998224725",
  locatario_nome: "Maria Souza", locatario_doc: "52998224725",
  imovel_logradouro: "Rua A", imovel_numero: "10", imovel_bairro: "Centro",
  imovel_cidade: "Uberlândia", imovel_uf: "MG", imovel_cep: "38400-000",
  valor: "1.500,00", vencimento: "5", prazo: "30", inicio: "2026-01-01",
  garantia: "Caução (depósito)",
};

describe("gerarContratoBody (locação residencial)", () => {
  const html = gerarContratoBody("locacao-residencial", locacao);

  it("inclui as partes, foro e testemunhas", () => {
    expect(html).toContain("Contrato de Locação Residencial");
    expect(html).toContain("LOCADOR");
    expect(html).toContain("LOCATÁRIO");
    expect(html).toContain("Testemunhas:");
    expect(html).toContain("Comarca de Uberlândia/MG");
  });

  it("formata os documentos com pontos", () => {
    expect(html).toContain("529.982.247-25");
  });

  it("não deixa placeholder vazio (undefined) escapar", () => {
    expect(html).not.toContain("undefined");
  });

  it("calcula o término somando o prazo ao início", () => {
    expect(html).toContain("01/07/2028"); // 2026-01-01 + 30 meses
  });
});

describe("gerarContratoBody (locação com fiador)", () => {
  const comFiador: BotAnswers = {
    ...locacao,
    garantia: "Fiador",
    fiador_nome: "Pedro Santos", fiador_doc: "11222333000181",
  };
  const html = gerarContratoBody("locacao-residencial", comFiador);

  it("inclui os dados e a assinatura do fiador", () => {
    expect(html).toContain("Pedro Santos");
    expect(html).toContain("FIADOR");
    expect(html).toContain("11.222.333/0001-81");
    expect(html).toContain("responsável solidário");
  });
});

describe("gerarContratoBody (tipo desconhecido)", () => {
  it("não quebra", () => {
    expect(gerarContratoBody("inexistente", {})).toContain("não reconhecido");
  });
});

import { describe, it, expect } from "vitest";
import {
  isValidCPF, isValidCNPJ, formatCPF, formatCNPJ, formatDoc, validateDoc,
} from "./validators";

describe("CPF", () => {
  it("aceita CPF válido", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
  });
  it("rejeita dígitos repetidos e checksum errado", () => {
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("123.456.789-00")).toBe(false);
    expect(isValidCPF("529.982.247-20")).toBe(false);
  });
  it("formata", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
  });
});

describe("CNPJ", () => {
  it("aceita CNPJ válido", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
  });
  it("rejeita checksum errado", () => {
    expect(isValidCNPJ("11.222.333/0001-00")).toBe(false);
    expect(isValidCNPJ("00.000.000/0000-00")).toBe(false);
  });
  it("formata", () => {
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
  });
});

describe("formatDoc / validateDoc", () => {
  it("formata conforme o tamanho", () => {
    expect(formatDoc("52998224725")).toBe("529.982.247-25");
    expect(formatDoc("11222333000181")).toBe("11.222.333/0001-81");
  });
  it("valida ou retorna mensagem", () => {
    expect(validateDoc("529.982.247-25")).toBeNull();
    expect(validateDoc("11.222.333/0001-81")).toBeNull();
    expect(validateDoc("123")).toMatch(/CPF.*CNPJ/);
    expect(validateDoc("111.111.111-11")).toMatch(/CPF inválido/);
  });
});

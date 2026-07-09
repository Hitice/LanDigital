// Validação e formatação de documentos brasileiros. Módulo puro (sem efeitos),
// reutilizável no cliente e no servidor, e fácil de testar.

export function onlyDigits(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (sliceLen: number): number => {
    let sum = 0;
    for (let i = 0; i < sliceLen; i++) {
      sum += parseInt(cpf[i], 10) * (sliceLen + 1 - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  return digit(9) === parseInt(cpf[9], 10) && digit(10) === parseInt(cpf[10], 10);
}

export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digit = (sliceLen: number): number => {
    const weights = sliceLen === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < sliceLen; i++) sum += parseInt(cnpj[i], 10) * weights[i];
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  return digit(12) === parseInt(cnpj[12], 10) && digit(13) === parseInt(cnpj[13], 10);
}

export function formatCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Formata como CPF ou CNPJ conforme a quantidade de dígitos. Se não bater, devolve o original.
export function formatDoc(value: string): string {
  const d = onlyDigits(value);
  if (d.length === 11) return formatCPF(d);
  if (d.length === 14) return formatCNPJ(d);
  return value;
}

// Valida nome completo (ao menos nome e sobrenome). Retorna erro ou null.
export function validateFullName(value: string): string | null {
  const parts = value.trim().split(/\s+/).filter((w) => w.length >= 2);
  return parts.length < 2 ? "Digite o nome completo (nome e sobrenome)." : null;
}

// Valida CPF (11 dígitos) ou CNPJ (14). Retorna mensagem de erro ou null se válido.
export function validateDoc(value: string): string | null {
  const d = onlyDigits(value);
  if (d.length === 11) return isValidCPF(d) ? null : "CPF inválido. Confira os números.";
  if (d.length === 14) return isValidCNPJ(d) ? null : "CNPJ inválido. Confira os números.";
  return "Digite um CPF (11 dígitos) ou CNPJ (14 dígitos).";
}

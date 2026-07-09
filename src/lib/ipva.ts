export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

// URLs oficiais de IPVA por estado. Quando não houver mapeamento direto, cai
// numa busca, evitando divulgar um link incorreto.
// TODO: completar com as URLs oficiais das Secretarias de Fazenda de cada estado.
const IPVA_URLS: Partial<Record<string, string>> = {
  SP: "https://www.ipva.fazenda.sp.gov.br/IPVANET_Consulta/Consulta.aspx",
};

export function ipvaUrl(uf: string): string {
  return IPVA_URLS[uf] ?? `https://www.google.com/search?q=${encodeURIComponent(`IPVA ${uf} Sefaz consulta oficial`)}`;
}

import { emitirCac } from "./emitir-cac.mjs";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const TOKEN = process.env.WORKER_TOKEN || "";
const PROXY = process.env.PROXY_URL;

const headers = { "Content-Type": "application/json", "x-worker-token": TOKEN };

async function reportar(id, body) {
  await fetch(`${APP_URL}/api/fila/${id}`, { method: "POST", headers, body: JSON.stringify(body) });
}

// Busca os pedidos pendentes de antecedentes e processa cada um.
// Em modo headful, o operador clica no Cloudflare a cada janela que abre.
export async function processarFila() {
  const res = await fetch(`${APP_URL}/api/fila?serviceId=antecedentes-criminais`, { headers });
  if (!res.ok) throw new Error(`fila: ${res.status} ${await res.text()}`);
  const pendentes = await res.json();

  const resultados = [];
  for (const p of pendentes) {
    await reportar(p.id, { acao: "processando" });
    try {
      const d = p.dados || {};
      const pdf = await emitirCac(
        { nome: d.nome, cpf: d.cpf, nascimento: d.nascimento, nomeMae: d.nome_mae, nomePai: d.nome_pai },
        { proxy: PROXY },
      );
      await reportar(p.id, { acao: "concluir", pdf_base64: pdf.toString("base64") });
      resultados.push({ id: p.id, ok: true });
    } catch (e) {
      const msg = String(e?.message ?? e);
      // PF_VALIDACAO: mensagem da PF para o cliente corrigir; senão, erro técnico genérico.
      const paraCliente = msg.startsWith("PF_VALIDACAO:")
        ? msg.replace("PF_VALIDACAO:", "").trim()
        : "Não foi possível emitir. Confira se os dados estão exatamente como nos documentos.";
      await reportar(p.id, { acao: "erro", erro: paraCliente });
      resultados.push({ id: p.id, ok: false, erro: msg });
    }
  }
  return { processados: resultados.length, resultados };
}

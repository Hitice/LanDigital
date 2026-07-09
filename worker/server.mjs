import express from "express";
import { emitirCac, inspectForm } from "./emitir-cac.mjs";
import { processarFila } from "./fila.mjs";

const app = express();
app.use(express.json({ limit: "1mb" }));

const TOKEN = process.env.WORKER_TOKEN;   // mesmo token configurado no app Next
const PROXY = process.env.PROXY_URL;      // proxy residencial BR (opcional, se a PF bloquear o IP)

app.get("/health", (_req, res) => res.json({ ok: true }));

// Processa a fila de pedidos pendentes (o operador abre isto e clica no Cloudflare
// a cada janela). Roda no PC do operador.
app.get("/processar", async (_req, res) => {
  try {
    res.json(await processarFila());
  } catch (e) {
    console.error("[processar]", e);
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

// Diagnóstico: lista os campos do formulário da PF (para acertar os seletores).
app.get("/inspect", async (_req, res) => {
  try {
    res.json(await inspectForm({ proxy: PROXY }));
  } catch (e) {
    res.status(502).json({ error: String(e?.message ?? e) });
  }
});

app.post("/emitir-cac", async (req, res) => {
  if (TOKEN && req.headers["x-worker-token"] !== TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const pdf = await emitirCac(req.body, { proxy: PROXY });
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdf);
  } catch (e) {
    console.error("[emitir-cac]", e);
    res.status(502).json({ error: String(e?.message ?? e) });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`worker ouvindo na porta ${port}`));

// Auto-processamento: se POLL_MS estiver definido, o worker puxa a fila sozinho
// nesse intervalo, sem precisar abrir /processar. Ex: POLL_MS=15000 (15s).
const POLL_MS = parseInt(process.env.POLL_MS || "0", 10);
if (POLL_MS > 0) {
  console.log(`auto-processamento ligado: a cada ${POLL_MS}ms`);
  let rodando = false;
  setInterval(async () => {
    if (rodando) return;            // evita sobreposição de execuções
    rodando = true;
    try {
      const r = await processarFila();
      if (r.processados > 0) console.log(`[poll] processados: ${r.processados}`);
    } catch (e) {
      console.error("[poll]", e?.message ?? e);
    } finally {
      rodando = false;
    }
  }, POLL_MS);
}

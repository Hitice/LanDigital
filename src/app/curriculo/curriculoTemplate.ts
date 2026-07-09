import type { CurriculoData } from "./pdfGenerator";

function esc(s?: string) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escPara(s?: string) {
  return esc(s).replace(/\n/g, "<br>");
}

function calcIdade(nasc: string): number {
  if (!nasc) return 0;
  const [d, m, y] = nasc.split("/").map(Number);
  if (!d || !m || !y) return 0;
  const hoje = new Date();
  let age = hoje.getFullYear() - y;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) age--;
  return Math.max(0, age);
}

function categoriaFormacao(nivel: string): "academica" | "curso" {
  const n = nivel.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return /tecnico|tecnica|curso|qualifica|profissional/.test(n) ? "curso" : "academica";
}

function limparData(d?: string): string {
  const s = (d ?? "").trim();
  return !s || /nao lembro|não lembro/i.test(s) ? "" : s;
}

function formatPeriod(inicio: string, fim: string): string {
  const i = limparData(inicio);
  const f = limparData(fim);
  if (!i && !f) return "";
  if (!f || /hoje/i.test(f)) return `${i} - Atual`;
  if (!i) return `Até ${f}`;
  return `${i} - ${f}`;
}

export function buildCurriculoHTML(data: CurriculoData): string {
  const idade = calcIdade(data.nascimento);

  // ── Linha de identificação ────────────────────────────────────────────────
  const idParts: string[] = [];
  if (idade > 0) idParts.push(`${idade} anos`);
  if (data.estadoCivil && !/prefiro/i.test(data.estadoCivil)) idParts.push(esc(data.estadoCivil));
  if (data.cnh) idParts.push(`CNH ${esc(data.cnh)}`);

  let endLinha = "";
  if (data.logradouro) {
    endLinha = esc(data.logradouro);
    if (data.numero) endLinha += `, ${esc(data.numero)}`;
  }
  const cidadeUF = [esc(data.cidade), esc(data.estado)].filter(Boolean).join(", ");
  const locParts = [cidadeUF, data.bairro ? esc(data.bairro) : "", endLinha].filter(Boolean);
  // join with · instead of em-dash

  // ── Experiências ──────────────────────────────────────────────────────────
  const validExp = (data.experiencias ?? []).filter(e => e.empresa || e.cargo);
  const expHTML = validExp.map(e => {
    const periodo = formatPeriod(e.inicio, e.fim);
    return `
    <div class="item">
      <div class="item-header">
        <span class="item-left">
          <span class="item-bold">${esc(e.cargo)}</span>
          ${periodo ? `<span class="item-sep">·</span><span class="item-period">${periodo}</span>` : ""}
        </span>
        <span class="item-muted">${esc(e.empresa)}</span>
      </div>
      ${e.descricao ? `<div class="item-desc">${esc(e.descricao)}</div>` : ""}
    </div>`;
  }).join("");

  // ── Formações ─────────────────────────────────────────────────────────────
  const validForm = (data.formacoes ?? []).filter(f => f.nivel || f.instituicao);
  const formAcad  = validForm.filter(f => categoriaFormacao(f.nivel) === "academica");
  const formCurso = validForm.filter(f => categoriaFormacao(f.nivel) === "curso");

  function renderForm(list: typeof validForm) {
    return list.map(f => {
      const titulo = [esc(f.nivel), esc(f.curso)].filter(Boolean).join(" · ") || "Formação";
      const conc   = limparData(f.conclusao);
      return `
      <div class="item">
        <div class="item-header">
          <span class="item-bold">${titulo}</span>
          ${conc ? `<span class="item-muted">${esc(conc)}</span>` : ""}
        </div>
        ${f.instituicao ? `<div class="item-inst">${esc(f.instituicao)}</div>` : ""}
      </div>`;
    }).join("");
  }

  // ── Habilidades / Idiomas ─────────────────────────────────────────────────
  const habItems = (data.habilidades ?? "")
    .split(",").map(h => h.trim()).filter(Boolean)
    .map(h => `<li>${esc(h)}</li>`).join("");

  const idiomaItems = (data.idiomas ?? "")
    .split("\n").map(l => l.trim()).filter(Boolean)
    .map(l => `<li>${esc(l)}</li>`).join("");

  // ── Montar seções ─────────────────────────────────────────────────────────
  const secObjeto = data.objetivo ? `
  <section>
    <div class="sec-title">Objetivo Profissional</div>
    <p class="obj-text">${escPara(data.objetivo)}</p>
  </section>` : "";

  const secExp = validExp.length > 0 ? `
  <section>
    <div class="sec-title">Experiência Profissional</div>
    ${expHTML}
  </section>` : `
  <section>
    <div class="sec-title">Experiência Profissional</div>
    <p class="sem-exp">Sem experiência formal, em busca da primeira oportunidade.</p>
  </section>`;

  const secAcad = formAcad.length > 0 ? `
  <section>
    <div class="sec-title">Formação Acadêmica</div>
    ${renderForm(formAcad)}
  </section>` : "";

  const secCursos = formCurso.length > 0 ? `
  <section>
    <div class="sec-title">Cursos e Qualificações</div>
    ${renderForm(formCurso)}
  </section>` : "";

  const secBottom = (habItems || idiomaItems) ? `
  <section class="row-2col">
    ${habItems ? `<div><div class="sec-title">Habilidades</div><ul class="checklist">${habItems}</ul></div>` : ""}
    ${idiomaItems ? `<div><div class="sec-title">Idiomas</div><ul class="checklist">${idiomaItems}</ul></div>` : ""}
  </section>` : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Currículo · ${esc(data.nome)}</title>
<style>
  /* ── Reset ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Tela: fundo cinza com folha A4 centralizada ── */
  body {
    background: #cbd5e1;
    padding: 32px 16px 48px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    color: #1a1a1a;
    line-height: 1.55;
  }

  /* ── Folha A4 ── */
  .sheet {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #fff;
    padding: 2cm 2cm 1.8cm;
    box-shadow: 0 4px 24px rgba(0,0,0,0.25);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .content { flex: 1; }
  @media screen and (max-width: 220mm) {
    .sheet { width: 100%; min-height: 100vh; padding: 1.2cm 1cm 1cm; box-shadow: none; }
    body { background: #fff; padding: 0; }
    .toolbar { width: 100%; border-radius: 0; }
  }

  /* ── Barra de ação (some na impressão) ── */
  .toolbar {
    width: 210mm;
    margin: 0 auto 12px;
    background: #e2e8f0;
    color: #374151;
    padding: 10px 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    border: 1px solid #cbd5e1;
  }
  .toolbar button {
    background: #b45309;
    color: #fff;
    border: none;
    padding: 6px 16px;
    border-radius: 6px;
    font-weight: bold;
    font-size: 12px;
    cursor: pointer;
  }
  .toolbar-hint { opacity: 0.7; font-size: 11px; }

  /* ── Cabeçalho ── */
  .header { margin-bottom: 14pt; }
  .name {
    font-size: 23pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
  }
  .rule-thick {
    height: 2.5px;
    background: #1a1a1a;
    margin: 6pt 0 8pt;
  }
  .contact-block {
    font-size: 9.5pt;
    color: #333;
    line-height: 1.85;
  }
  .contact-block div { display: flex; align-items: baseline; gap: 5pt; }
  .contact-id { font-style: italic; color: #555; }
  .ico {
    color: #b45309;
    font-size: 8pt;
    line-height: 1;
    width: 10pt;
    display: inline-block;
    text-align: center;
    flex-shrink: 0;
  }

  /* ── Seções ── */
  section { margin-bottom: 13pt; }
  .sec-title {
    font-size: 8.5pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.9pt;
    color: #b45309;
    padding-bottom: 3pt;
    border-bottom: 0.75px solid #d1d5db;
    margin-bottom: 8pt;
  }

  /* ── Items ── */
  .item { margin-bottom: 9pt; }
  .item:last-child { margin-bottom: 0; }
  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10pt;
  }
  .item-left { display: inline-flex; align-items: baseline; gap: 5pt; flex-wrap: wrap; }
  .item-bold  { font-weight: bold; font-size: 10.5pt; }
  .item-muted { font-size: 9.5pt; color: #555; white-space: nowrap; }
  .item-period { font-size: 9pt; color: #888; font-style: italic; }
  .item-sep   { font-size: 9pt; color: #bbb; }
  .item-desc   { font-size: 10pt; color: #444; margin-top: 3pt; line-height: 1.5; word-break: break-word; }
  .item-inst   { font-size: 10pt; color: #555; margin-top: 2pt; }

  /* ── Sem experiência ── */
  .sem-exp {
    font-size: 9.5pt;
    color: #888;
    font-style: italic;
  }

  /* ── Objetivo ── */
  .obj-text {
    font-size: 10pt;
    color: #333;
    line-height: 1.65;
    word-break: break-word;
  }

  /* ── Linha dupla: hab + idiomas ── */
  .row-2col {
    display: flex;
    gap: 20pt;
    margin-bottom: 0;
  }
  .row-2col > div { flex: 1; }
  .checklist {
    list-style: none;
    padding: 0;
    margin: 3pt 0 0;
  }
  .checklist li {
    display: flex;
    align-items: baseline;
    gap: 5pt;
    font-size: 10pt;
    color: #374151;
    padding: 1.5pt 0;
  }
  .checklist li::before {
    content: "✓";
    color: #b45309;
    font-size: 9.5pt;
    flex-shrink: 0;
  }

  /* ── Rodapé ── */
  .footer {
    margin-top: 12pt;
    padding-top: 6pt;
    border-top: 0.5px solid #e2e8f0;
    font-size: 7.5pt;
    color: #b0b8c4;
    text-align: center;
  }

  /* ── Impressão: mantém padding do .sheet como margem do conteúdo ── */
  @page { size: A4; margin: 0; }
  @media print {
    body { background: white; padding: 0; }
    .sheet {
      width: 100%; min-height: auto;
      margin: 0;
      /* espaço extra embaixo para o conteúdo não passar por baixo do rodapé fixo */
      padding: 1.8cm 1.6cm 2cm;
      box-shadow: none;
    }
    /* Rodapé fixo no fim de cada página impressa */
    .footer {
      position: fixed;
      bottom: 0.7cm; left: 1.6cm; right: 1.6cm;
      margin: 0;
      background: white;
    }
    .toolbar { display: none !important; }
    a { color: inherit; text-decoration: none; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="toolbar">
  <strong>Currículo pronto!</strong>
  <button onclick="window.print()">Imprimir | Salvar PDF</button>
  <span class="toolbar-hint">Escolha "Salvar como PDF" na impressora</span>
  <button onclick="recomecar()" style="margin-left:auto;background:#4b5563;">Recomeçar</button>
</div>
<script>
  function recomecar() {
    if (window.opener && !window.opener.closed) {
      try { window.opener.location.href = "/curriculo"; } catch(e) {}
    }
    window.close();
  }
  window.addEventListener("load", function() {
    var el = document.querySelector(".name");
    var max = el.parentElement.clientWidth;
    var size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > max && size > 10) {
      size -= 0.5;
      el.style.fontSize = size + "px";
    }
  });
</script>

<div class="sheet">
  <div class="content">

    <!-- CABEÇALHO -->
    <header class="header">
      <div class="name">${esc(data.nome)}</div>
      <div class="rule-thick"></div>
      <div class="contact-block">
        ${idParts.length ? `<div class="contact-id">${idParts.join(" &nbsp;·&nbsp; ")}</div>` : ""}
        ${data.email    ? `<div><span class="ico">&#x25B8;</span><span>${esc(data.email)}</span></div>` : ""}
        ${data.telefone ? `<div><span class="ico">&#x25B8;</span><span>${esc(data.telefone)}</span></div>` : ""}
        ${locParts.length ? `<div><span class="ico">&#x25B8;</span><span>${locParts.join(" · ")}</span></div>` : ""}
      </div>
    </header>

    ${secObjeto}
    ${secExp}
    ${secAcad}
    ${secCursos}
    ${secBottom}

  </div>

  <div class="footer">Currículo gerado em LanhouseDigital &nbsp;·&nbsp; lanhousedigital.com.br</div>
</div>

</body>
</html>`;
}

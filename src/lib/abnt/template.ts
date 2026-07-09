export interface AbntMeta {
  titulo: string;
  autor: string;
  instituicao: string;
  curso: string;
  cidade: string;
  ano: string;
}

// Documento ABNT: capa + corpo formatado (margens 3-2-2-3, Times 12, espaço 1,5, justificado).
export function buildAbntHTML(meta: AbntMeta, bodyHtml: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(meta.titulo)}</title>
<style>
  /* Margem ABNT (3cm esq/topo, 2cm dir/baixo) pelo @page, aplicada a TODA página
     impressa. O padding da .page é só para a visualização na tela. */
  @page { size: A4; margin: 3cm 2cm 2cm 3cm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { font-family: "Times New Roman", Georgia, serif; font-size: 12pt; line-height: 1.5; color: #000; background: #fff; }
  .page { max-width: 21cm; margin: 0 auto; padding: 3cm 2cm 2cm 3cm; }
  .capa { min-height: 24cm; display: flex; flex-direction: column; align-items: center; text-align: center; page-break-after: always; }
  .capa .topo { text-transform: uppercase; font-weight: bold; }
  .capa .meio { margin: auto 0; }
  .capa .meio h1 { font-size: 14pt; text-transform: uppercase; }
  .capa .base { text-transform: uppercase; }
  .corpo { text-align: justify; }
  .corpo h2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 1.5rem 0 .6rem; }
  .corpo h3 { font-size: 12pt; font-weight: bold; margin: 1.2rem 0 .5rem; }
  .corpo p { text-indent: 1.25cm; margin: .4rem 0; }
  @media print { .page { padding: 0; } .no-print { display: none; } }
  .no-print { text-align: center; padding: 1rem; }
  .no-print button { background: #ea580c; color: #fff; border: 0; padding: .6rem 1.4rem; border-radius: .5rem; font: inherit; cursor: pointer; }
</style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">Salvar / Imprimir PDF</button></div>
  <div class="page">
    <div class="capa">
      <div class="topo">${esc(meta.instituicao)}<br>${esc(meta.curso)}</div>
      <div class="meio">
        <p>${esc(meta.autor)}</p>
        <h1>${esc(meta.titulo)}</h1>
      </div>
      <div class="base">${esc(meta.cidade)}<br>${esc(meta.ano)}</div>
    </div>
    <div class="corpo">${bodyHtml}</div>
  </div>
</body>
</html>`;
}

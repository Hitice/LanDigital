// Envolve o corpo do contrato num documento A4 paginado para impressão/PDF.
//
// Margens: vêm do `@page margin`, que se aplica a TODAS as páginas (inclusive
// as seguintes numa impressão multipágina). O paged.js adiciona o rodapé
// "Página X de Y"; se ele não carregar (offline), as margens do @page ainda
// valem, só não aparece a numeração.
export function buildContratoHTML(bodyHtml: string, titulo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${titulo}</title>
<style>
  @page {
    size: A4;
    margin: 2.5cm 2cm;
    @bottom-center {
      content: "Página " counter(page) " de " counter(pages);
      font-family: Arial, sans-serif;
      font-size: 9pt;
      color: #666;
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; }
  body { font-family: "Times New Roman", Georgia, serif; font-size: 12pt; line-height: 1.6; color: #111; text-align: justify; }

  h1 { font-size: 14pt; text-align: center; text-transform: uppercase; margin: 0 0 1.5rem; break-after: avoid; }
  h2 { font-size: 12pt; margin: 1.3rem 0 .3rem; break-after: avoid; break-inside: avoid; }
  p { margin: .5rem 0; }

  .local-data { margin-top: 2.5rem; break-before: avoid; }
  /* Assinaturas não podem se partir entre páginas. */
  .assinaturas { display: flex; gap: 2rem; margin-top: 2.5rem; break-inside: avoid; }
  .assina { flex: 1; text-align: center; break-inside: avoid; }
  .assina .risco { display: block; border-top: 1px solid #111; margin-bottom: .3rem; height: 2.2rem; }
  .assina strong { display: block; }
  .assina small { color: #333; font-size: 10pt; }
  .testemunhas-titulo { margin-top: 2.5rem; font-weight: bold; break-before: avoid; }

  .no-print { text-align: center; padding: 1rem 0; }
  .no-print button { background: #ea580c; color: #fff; border: 0; padding: .6rem 1.4rem; border-radius: .5rem; font: inherit; cursor: pointer; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">Salvar / Imprimir PDF</button></div>
  ${bodyHtml}
  <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
</body>
</html>`;
}

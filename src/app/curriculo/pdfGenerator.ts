export interface CurriculoData {
  nome: string;
  nascimento: string;     // DD/MM/YYYY
  estadoCivil: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  linkedin: string;
  github: string;
  objetivo: string;
  experiencias: Array<{
    empresa: string;
    cargo: string;
    inicio: string;
    fim: string;
    descricao: string;
  }>;
  formacoes: Array<{
    nivel: string;
    curso: string;
    instituicao: string;
    conclusao: string;
  }>;
  habilidades: string;
  idiomas: string;
  cnh?: string;
}

// Remove emoji e caracteres que jsPDF não consegue renderizar — mantém apenas ASCII e Latin-1
function stripEmoji(s: string): string {
  return s.replace(/[^\x20-\x7EÀ-ÿ]/g, "").replace(/\s+/g, " ").trim();
}

function calcIdade(nasc: string): number {
  if (!nasc) return 0;
  const [d, m, y] = nasc.split("/").map(Number);
  if (!d || !m || !y) return 0;
  const hoje = new Date();
  let idade = hoje.getFullYear() - y;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade--;
  return Math.max(0, idade);
}

// Heurística simples para nomes brasileiros — nomes terminados em 'a' = feminino
function detectarGenero(nome: string): "M" | "F" {
  const primeiro = nome.trim().split(/\s+/)[0].toLowerCase();
  const semAcento = primeiro.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const excecoesMasc = ["luca", "joshua", "ezra", "nikita", "yoga", "mica", "erick", "erick"];
  if (excecoesMasc.includes(semAcento)) return "M";
  if (/[aã]$/.test(primeiro)) return "F";
  if (/(elle|ene|ane|ine|isse|ice)$/.test(semAcento)) return "F";
  return "M";
}

// Aplica gênero em construções como "Autônomo(a)" → "Autônoma" (F) ou "Autônomo" (M)
function aplicarGenero(s: string, gen: "M" | "F"): string {
  if (gen === "F") {
    return s.replace(/o\(a\)/g, "a").replace(/\(a\)/g, "a").replace(/\s{2,}/g, " ").trim();
  }
  return s.replace(/o\(a\)/g, "o").replace(/\(a\)/g, "").replace(/\s{2,}/g, " ").trim();
}

// "Não lembro" não deve aparecer no currículo
const DATAS_INVALIDAS = new Set(["Não lembro", "nao lembro", ""]);

function limparData(d: string): string {
  return DATAS_INVALIDAS.has((d ?? "").trim()) ? "" : (d ?? "").trim();
}

function formatPeriod(inicio: string, fim: string): string {
  const i = limparData(inicio);
  const f = limparData(fim);
  if (!i && !f) return "";
  if (!i) return `Até ${f}`;
  if (!f) return `A partir de ${i}`;
  return `${i} – ${f}`;
}

// Categoriza formação: técnico/cursos → "curso"; demais → "academica"
function categoriaFormacao(nivel: string): "academica" | "curso" {
  const n = nivel.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/tecnico|tecnica|curso|qualifica|profissional/.test(n)) return "curso";
  return "academica";
}

function gerarObjetivoProfissional(data: CurriculoData, gen: "M" | "F"): string {
  const temExp = data.experiencias.filter(e => e.empresa).length > 0;
  const cargo  = (data.experiencias[0]?.cargo || "").toLowerCase();
  const exp    = cargo ? ` com experiência em ${cargo}` : "";
  const o      = gen === "F" ? "a" : "o";
  const obj    = data.objetivo.toLowerCase();

  if (!temExp || obj.includes("primeiro"))
    return `Jovem em busca da primeira oportunidade profissional. Comprometid${o}, assídu${o} e com grande disposição para aprender e crescer na empresa.`;
  if (obj.includes("área"))
    return `Profissional em transição de carreira${exp}. Determinad${o} a aplicar competências adquiridas em novos desafios, com rápida adaptação e comprometimento.`;
  if (obj.includes("voltar"))
    return `Profissional${exp} retornando ao mercado de trabalho. Proativ${o}, comprometid${o} e dispost${o} a contribuir com os objetivos da empresa.`;
  return `Profissional${exp} buscando nova oportunidade para aplicar e desenvolver suas competências. Comprometid${o}, pontual e com facilidade para trabalhar em equipe.`;
}

export async function generateCurriculoPDF(data: CurriculoData): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc   = new jsPDF({ unit: "mm", format: "a4" });
  const PAGE_W = 210;
  const ML     = 20;   // margin left
  const MR     = 20;   // margin right
  const cW     = PAGE_W - ML - MR;
  let   y      = 0;

  const GEN = detectarGenero(data.nome);

  // Palette — apenas preto e cinzas (impressão econômica)
  const C_BLACK: [number, number, number] = [15,  15,  15 ];
  const C_DARK:  [number, number, number] = [50,  50,  50 ];
  const C_MID:   [number, number, number] = [100, 100, 100];
  const C_LIGHT: [number, number, number] = [170, 170, 170];

  // Aplica gênero e limpa emojis em toda string vinda do bot
  function clean(s: string): string {
    return stripEmoji(aplicarGenero(s ?? "", GEN));
  }

  function checkPage(needed: number) {
    if (y + needed > 278) { doc.addPage(); y = 18; }
  }

  function rule(lw = 0.25, color = C_LIGHT) {
    doc.setDrawColor(...color);
    doc.setLineWidth(lw);
    doc.line(ML, y, ML + cW, y);
  }

  function sectionTitle(title: string) {
    checkPage(14);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...C_BLACK);
    doc.text(title.toUpperCase(), ML, y);
    y += 2.5;
    rule(0.3, C_LIGHT);
    y += 5;
  }

  // ── CABEÇALHO ──────────────────────────────────────────────────────────────
  y = 18;

  // Nome
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...C_BLACK);
  doc.text(clean(data.nome.toUpperCase()), ML, y);
  y += 4;

  // Linha grossa sob o nome
  doc.setDrawColor(...C_BLACK);
  doc.setLineWidth(0.8);
  doc.line(ML, y, ML + cW, y);
  y += 5;

  // Linha: idade · estado civil · email · telefone
  const idade = calcIdade(data.nascimento);
  const infoLine: string[] = [];
  if (idade > 0) infoLine.push(`${idade} anos`);
  if (data.estadoCivil && data.estadoCivil !== "Prefiro não informar")
    infoLine.push(clean(data.estadoCivil));
  if (data.email)    infoLine.push(data.email.trim());
  if (data.telefone) infoLine.push(data.telefone.trim());

  if (infoLine.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...C_DARK);
    const infoStr   = infoLine.join("  ·  ");
    const infoLines = doc.splitTextToSize(infoStr, cW);
    doc.text(infoLines, ML, y);
    y += infoLines.length * 4 + 2;
  }

  // Endereço
  const endParts: string[] = [];
  if (data.logradouro) {
    let rua = clean(data.logradouro);
    if (data.numero) rua += `, ${data.numero}`;
    if (data.bairro) rua += ` — ${clean(data.bairro)}`;
    endParts.push(rua);
  }
  if (data.cidade || data.estado)
    endParts.push(`${data.cidade}/${data.estado}`);

  if (endParts.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C_MID);
    const addrLines = doc.splitTextToSize(endParts.join("  ·  "), cW);
    doc.text(addrLines, ML, y);
    y += addrLines.length * 4 + 2;
  }

  y += 6; // respiro antes das seções

  // ── OBJETIVO PROFISSIONAL ──────────────────────────────────────────────────
  const objetivoFinal =
    data.objetivo.length >= 80
      ? clean(data.objetivo)
      : gerarObjetivoProfissional(data, GEN);

  sectionTitle("Objetivo Profissional");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C_DARK);
  const objLines = doc.splitTextToSize(objetivoFinal, cW);
  checkPage(objLines.length * 4.5 + 6);
  doc.text(objLines, ML, y);
  y += objLines.length * 4.5 + 8;

  // ── EXPERIÊNCIA PROFISSIONAL ───────────────────────────────────────────────
  const validExp = data.experiencias.filter(e => e.empresa || e.cargo);
  if (validExp.length > 0) {
    sectionTitle("Experiência Profissional");
    for (const exp of validExp) {
      checkPage(18);

      const cargo   = clean(exp.cargo);
      const empresa = clean(exp.empresa);
      const periodo = formatPeriod(exp.inicio, exp.fim);

      // Cargo (bold) ←→ Empresa (right, normal)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...C_BLACK);
      doc.text(cargo, ML, y);

      if (empresa) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C_DARK);
        doc.text(empresa, ML + cW, y, { align: "right" });
      }
      y += 4.5;

      if (periodo) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(...C_MID);
        doc.text(periodo, ML, y);
        y += 4;
      }

      if (exp.descricao) {
        const descClean = clean(exp.descricao);
        const dLines    = doc.splitTextToSize(descClean, cW);
        checkPage(dLines.length * 4.5 + 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C_DARK);
        doc.text(dLines, ML, y);
        y += dLines.length * 4.5;
      }
      y += 5;
    }
    y += 2;
  }

  // ── FORMAÇÃO ACADÊMICA ─────────────────────────────────────────────────────
  const validForm   = data.formacoes.filter(f => f.nivel || f.curso || f.instituicao);
  const formAcad    = validForm.filter(f => categoriaFormacao(f.nivel) === "academica");
  const formCursos  = validForm.filter(f => categoriaFormacao(f.nivel) === "curso");

  function renderFormList(list: typeof validForm) {
    for (const f of list) {
      checkPage(14);

      // Combina nivel + curso como título
      const partes  = [stripEmoji(f.nivel), stripEmoji(f.curso)].filter(Boolean);
      const titulo  = partes.join(" — ") || "Formação";
      const concStr = limparData(f.conclusao);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...C_BLACK);
      doc.text(titulo, ML, y);

      if (concStr) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C_MID);
        doc.text(concStr, ML + cW, y, { align: "right" });
      }
      y += 4.5;

      if (f.instituicao) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C_DARK);
        doc.text(stripEmoji(f.instituicao), ML, y);
        y += 4;
      }
      y += 4;
    }
  }

  if (formAcad.length > 0) {
    sectionTitle("Formação Acadêmica");
    renderFormList(formAcad);
    y += 2;
  }

  if (formCursos.length > 0) {
    sectionTitle("Cursos e Qualificações");
    renderFormList(formCursos);
    y += 2;
  }

  // ── HABILIDADES ────────────────────────────────────────────────────────────
  if (data.habilidades) {
    sectionTitle("Habilidades");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C_DARK);
    const habLines = doc.splitTextToSize(clean(data.habilidades), cW);
    checkPage(habLines.length * 4.5 + 6);
    doc.text(habLines, ML, y);
    y += habLines.length * 4.5 + 8;
  }

  // ── IDIOMAS ────────────────────────────────────────────────────────────────
  if (data.idiomas) {
    sectionTitle("Idiomas");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C_DARK);
    const idiomasStr   = data.idiomas.replace(/\n/g, "  |  ");
    const idiomasLines = doc.splitTextToSize(stripEmoji(idiomasStr), cW);
    checkPage(idiomasLines.length * 4.5 + 6);
    doc.text(idiomasLines, ML, y);
  }

  // ── RODAPÉ ─────────────────────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C_LIGHT);
    doc.text(
      `Curriculo gerado em LanhouseDigital  ·  Pagina ${i} de ${total}`,
      PAGE_W / 2, 290, { align: "center" }
    );
  }

  const slug = data.nome.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  doc.save(`curriculo_${slug}.pdf`);
}

import { jsPDF } from "jspdf";
import { formatAnswers, type AtendimentoConfig } from "./config";

// Gera uma ficha em PDF com os dados informados. É um documento da LanhouseDigital,
// NÃO o documento oficial (que é emitido no portal do órgão competente).
export function buildFichaPdf(config: AtendimentoConfig, answers: Record<string, string>) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const right = 190;
  let y = margin;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("LanhouseDigital", margin, y);
  y += 8;

  pdf.setFontSize(13);
  pdf.text(config.title, margin, y);
  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(120);
  pdf.text("Ficha de dados para solicitação", margin, y);
  y += 8;

  pdf.setDrawColor(220);
  pdf.line(margin, y, right, y);
  y += 10;

  pdf.setTextColor(0);
  pdf.setFontSize(12);
  for (const { label, valor } of formatAnswers(answers)) {
    const text = `${label}: `;
    pdf.setFont("helvetica", "bold");
    pdf.text(text, margin, y);
    const w = pdf.getTextWidth(text);
    pdf.setFont("helvetica", "normal");
    pdf.text(valor || "-", margin + w, y);
    y += 9;
  }

  y += 4;
  pdf.setDrawColor(220);
  pdf.line(margin, y, right, y);
  y += 8;

  const hoje = new Date().toLocaleDateString("pt-BR");
  pdf.setFontSize(9);
  pdf.setTextColor(90);
  pdf.text(`Emitida em ${hoje}.`, margin, y);
  y += 8;

  pdf.setFontSize(8);
  pdf.setTextColor(120);
  const nota = pdf.splitTextToSize(
    "Este documento é uma ficha de dados gerada pela LanhouseDigital e NÃO substitui o documento oficial, que deve ser emitido no portal do órgão competente (Receita Federal, Polícia Federal).",
    right - margin,
  );
  pdf.text(nota, margin, y);

  const filename = `${config.title.replace(/[\\/:*?"<>|]/g, "").trim()}.pdf`;
  const blob = pdf.output("blob");
  return { blob, filename, save: () => pdf.save(filename) };
}

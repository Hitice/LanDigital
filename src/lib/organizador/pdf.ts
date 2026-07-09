import { jsPDF } from "jspdf";

export interface DocCampo {
  label: string;
  valor: string;
}

export interface DocAnalise {
  titulo: string;
  tipo: string;
  rotationDeg: number;
  campos: DocCampo[];
}

export interface DocInput {
  imageDataUrl: string;
  analise: DocAnalise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Gira a imagem (sentido horário) e devolve dataURL JPEG endireitado.
function rotateImage(img: HTMLImageElement, deg: number) {
  const canvas = document.createElement("canvas");
  const swap = deg === 90 || deg === 270;
  canvas.width = swap ? img.height : img.width;
  canvas.height = swap ? img.width : img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return { url: canvas.toDataURL("image/jpeg", 0.92), w: canvas.width, h: canvas.height };
}

function sanitizeFilename(name: string): string {
  return (name || "documento").replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 80) || "documento";
}

// Monta um PDF com um documento por página: foto endireitada + dados extraídos.
export async function buildDocumentosPdf(docs: DocInput[]) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210, pageH = 297, margin = 15;
  const maxW = pageW - margin * 2;

  for (let i = 0; i < docs.length; i++) {
    if (i > 0) pdf.addPage();
    const { imageDataUrl, analise } = docs[i];

    const img = await loadImage(imageDataUrl);
    const rotated = rotateImage(img, analise.rotationDeg || 0);

    const maxImgH = 130;
    let imgW = maxW;
    let imgH = (rotated.h / rotated.w) * imgW;
    if (imgH > maxImgH) { imgH = maxImgH; imgW = (rotated.w / rotated.h) * imgH; }
    pdf.addImage(rotated.url, "JPEG", (pageW - imgW) / 2, margin, imgW, imgH);

    let y = margin + imgH + 12;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(analise.tipo || analise.titulo || "Documento", margin, y);
    y += 9;

    pdf.setFontSize(11);
    for (const campo of analise.campos ?? []) {
      if (y > pageH - margin) { pdf.addPage(); y = margin; }
      const label = `${campo.label}: `;
      pdf.setFont("helvetica", "bold");
      pdf.text(label, margin, y);
      const labelW = pdf.getTextWidth(label);
      pdf.setFont("helvetica", "normal");
      const lines = pdf.splitTextToSize(campo.valor ?? "", maxW - labelW);
      pdf.text(lines, margin + labelW, y);
      y += Math.max(1, lines.length) * 6 + 1.5;
    }
  }

  const filename = docs.length === 1
    ? `${sanitizeFilename(docs[0].analise.titulo)}.pdf`
    : `Documentos (${docs.length}).pdf`;
  const blob = pdf.output("blob");
  return { blob, filename, save: () => pdf.save(filename) };
}

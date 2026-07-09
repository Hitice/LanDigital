"use client";

import { useState, useRef } from "react";
import { PixModal } from "@/components/PixModal";
import { buildDocumentosPdf, type DocAnalise, type DocInput } from "@/lib/organizador/pdf";
import { useEntitlement, SUBSCRIBER_ORDER } from "@/lib/useEntitlement";
import { Loader2, ScanLine, Upload, Download, Share2, X } from "lucide-react";

const PRICE = 5.0;

interface Foto { url: string; mime: string }
interface Result { blob: Blob; filename: string; titulo: string; save: () => void }

export function OrganizadorTool() {
  const { subscribed } = useEntitlement();
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [showPix, setShowPix] = useState(false);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState({ atual: 0, total: 0 });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const imagens = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (imagens.length === 0) {
      setError("Envie arquivos de imagem (foto do documento).");
      return;
    }
    setError("");
    setResult(null);
    imagens.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setFotos((prev) => [...prev, { url: reader.result as string, mime: file.type || "image/jpeg" }]);
      reader.readAsDataURL(file);
    });
  }

  function removeFoto(i: number) {
    setFotos((prev) => prev.filter((_, idx) => idx !== i));
    setResult(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  // Assinante gera direto; senão, abre o pagamento.
  function proceed() {
    if (fotos.length === 0) return;
    if (subscribed) handlePaid(SUBSCRIBER_ORDER);
    else setShowPix(true);
  }

  async function handlePaid(orderId: string) {
    setShowPix(false);
    setWorking(true);
    setError("");
    setProgress({ atual: 0, total: fotos.length });
    try {
      const docs: DocInput[] = [];
      for (let i = 0; i < fotos.length; i++) {
        setProgress({ atual: i + 1, total: fotos.length });
        const res = await fetch("/api/organizador", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: fotos[i].url, mime: fotos[i].mime, orderId }),
        });
        if (!res.ok) throw new Error("falha");
        const analise = (await res.json()) as DocAnalise;
        docs.push({ imageDataUrl: fotos[i].url, analise });
      }
      const { blob, filename, save } = await buildDocumentosPdf(docs);
      setResult({ blob, filename, titulo: docs[0].analise.titulo, save });
    } catch {
      setError("Não consegui processar. Tente fotos mais nítidas e bem enquadradas.");
    } finally {
      setWorking(false);
    }
  }

  async function shareWhatsApp() {
    if (!result) return;
    const file = new File([result.blob], result.filename, { type: "application/pdf" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file], title: result.titulo }); return; } catch { /* cancelado */ }
    }
    result.save();
    window.open("https://wa.me/", "_blank");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      {working && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl mx-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="font-bold text-lg">Lendo e organizando...</p>
            {progress.total > 1 && (
              <p className="text-sm text-muted-foreground">Documento {progress.atual} de {progress.total}</p>
            )}
          </div>
        </div>
      )}

      {showPix && (
        <PixModal serviceId="organizador-documentos" amount={PRICE} description="Organizador de Documentos - LanhouseDigital"
          onClose={() => setShowPix(false)} onConfirm={handlePaid} />
      )}

      <div className="mb-6 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <ScanLine className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Organizador de Documentos</h1>
          <p className="text-sm text-muted-foreground">Envie um ou vários documentos; a IA lê os dados e gera um PDF organizado.</p>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={(e) => addFiles(e.target.files)} className="hidden" />

      <button
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`w-full rounded-2xl border-2 border-dashed py-10 flex flex-col items-center gap-2 text-muted-foreground transition-colors ${
          dragOver ? "border-primary bg-primary/10" : "border-primary/40 bg-secondary/40 hover:border-primary hover:bg-primary/5"
        }`}
      >
        <Upload className="h-7 w-7 text-primary" />
        <span className="font-semibold text-foreground">Adicionar documento(s)</span>
        <span className="text-xs">Arraste as imagens aqui, ou toque para fotografar ou escolher</span>
      </button>

      {fotos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {fotos.map((f, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={`Documento ${i + 1}`} className="h-24 w-full rounded-lg border border-border object-cover bg-gray-50" />
              <button onClick={() => removeFoto(i)} aria-label="Remover"
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!result ? (
        <button
          onClick={proceed}
          disabled={fotos.length === 0}
          className="mt-5 w-full py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          {subscribed
            ? `Gerar ${fotos.length || ""} documento(s) (incluído no seu plano)`
            : `Gerar e pagar R$ ${PRICE.toFixed(2).replace(".", ",")}`}
        </button>
      ) : (
        <div className="mt-5 space-y-2">
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium">
            Pronto! <strong>{result.filename}</strong> gerado.
          </div>
          <div className="flex gap-2">
            <button onClick={() => result.save()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border font-semibold hover:border-primary hover:text-primary transition-colors">
              <Download className="h-4 w-4" /> Baixar
            </button>
            <button onClick={shareWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors">
              <Share2 className="h-4 w-4" /> Enviar no WhatsApp
            </button>
          </div>
        </div>
      )}

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {subscribed ? "Você é assinante, sem cobrança." : "O PDF é gerado após a confirmação do PIX."}
      </p>
    </div>
  );
}

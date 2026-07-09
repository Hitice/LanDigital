"use client";

import { useState } from "react";
import { PixModal } from "@/components/PixModal";
import { buildAbntHTML, type AbntMeta } from "@/lib/abnt/template";
import { useEntitlement, SUBSCRIBER_ORDER } from "@/lib/useEntitlement";
import { Loader2, FileText } from "lucide-react";

const PRICE = 5.0;
const emptyMeta: AbntMeta = { titulo: "", autor: "", instituicao: "", curso: "", cidade: "", ano: String(new Date().getFullYear()) };

export function AbntForm() {
  const { subscribed } = useEntitlement();
  const [meta, setMeta] = useState<AbntMeta>(emptyMeta);
  const [texto, setTexto] = useState("");
  const [showPix, setShowPix] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Assinante gera direto; senão, abre o pagamento.
  function proceed() {
    if (subscribed) handlePaid(SUBSCRIBER_ORDER);
    else setShowPix(true);
  }


  const set = (k: keyof AbntMeta) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setMeta(m => ({ ...m, [k]: e.target.value }));

  const ready = meta.titulo.trim() && meta.autor.trim() && texto.trim().length >= 20;

  async function handlePaid(orderId: string) {
    setShowPix(false);
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/abnt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, orderId }),
      });
      if (!res.ok) throw new Error("falha");
      const { html } = await res.json();
      const full = buildAbntHTML(meta, html);
      const blob = new Blob([full], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setError("Não consegui formatar agora. Tente novamente em instantes.");
    } finally {
      setGenerating(false);
    }
  }

  const inp = "w-full rounded-xl border border-input bg-secondary px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {generating && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl mx-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="font-bold text-lg">Formatando nas normas ABNT...</p>
          </div>
        </div>
      )}

      {showPix && (
        <PixModal serviceId="formatacao-abnt" amount={PRICE} description="Formatação ABNT - LanhouseDigital"
          onClose={() => setShowPix(false)} onConfirm={handlePaid} />
      )}

      <div className="mb-6 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Formatação ABNT</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados, cole o texto e receba o PDF formatado.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input className={inp} placeholder="Título do trabalho *" value={meta.titulo} onChange={set("titulo")} />
        <input className={inp} placeholder="Autor *" value={meta.autor} onChange={set("autor")} />
        <input className={inp} placeholder="Instituição" value={meta.instituicao} onChange={set("instituicao")} />
        <input className={inp} placeholder="Curso" value={meta.curso} onChange={set("curso")} />
        <input className={inp} placeholder="Cidade" value={meta.cidade} onChange={set("cidade")} />
        <input className={inp} placeholder="Ano" value={meta.ano} onChange={set("ano")} />
      </div>

      <textarea
        className="mt-3 w-full rounded-xl border border-input bg-secondary px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-y min-h-[240px]"
        placeholder="Cole aqui o texto do seu trabalho (introdução, desenvolvimento, conclusão, referências)..."
        value={texto} onChange={e => setTexto(e.target.value)} />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={proceed}
        disabled={!ready}
        className="mt-4 w-full py-3.5 rounded-xl bg-primary text-white font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
      >
        {subscribed ? "Formatar (incluído no seu plano)" : `Formatar e pagar R$ ${PRICE.toFixed(2).replace(".", ",")}`}
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {subscribed ? "Você é assinante, sem cobrança." : "O PDF é gerado após a confirmação do PIX."}
      </p>
    </div>
  );
}

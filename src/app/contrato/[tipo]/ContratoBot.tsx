"use client";

import { useState } from "react";
import { SimpleBot, type BotAnswers } from "@/components/SimpleBot";
import { PixModal } from "@/components/PixModal";
import { buildContratoHTML } from "@/lib/contratos/template";
import { gerarContratoBody } from "@/lib/contratos/modelos";
import { CONTRATOS } from "@/lib/contratos/config";
import { useEntitlement, SUBSCRIBER_ORDER } from "@/lib/useEntitlement";
import { Loader2 } from "lucide-react";

// Recebe só o `tipo` (string serializável); a config (que contém funções de
// validação) é resolvida aqui no cliente.
export function ContratoBot({ tipo }: { tipo: string }) {
  const config = CONTRATOS[tipo];
  const { subscribed } = useEntitlement();
  const [answers, setAnswers] = useState<BotAnswers | null>(null);
  const [showPix, setShowPix] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Assinante gera direto; senão, abre o pagamento.
  function handleComplete(data: BotAnswers) {
    setAnswers(data);
    if (subscribed) gerar(data, SUBSCRIBER_ORDER);
    else setShowPix(true);
  }

  // Revisa os dados com IA (capitaliza nomes, corrige typos) e gera o contrato
  // a partir do modelo padrão. As cláusulas são determinísticas; a IA só limpa
  // os dados. Se a revisão falhar, gera com os dados originais.
  async function gerar(data: BotAnswers, orderId: string) {
    setShowPix(false);
    setGenerating(true);
    setError("");
    try {
      let dados = data;
      try {
        const res = await fetch("/api/contrato/revisar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: data, orderId }),
        });
        if (res.ok) {
          const revised = await res.json();
          if (revised && typeof revised === "object") dados = revised;
        }
      } catch {
        /* segue com os dados originais */
      }

      const body = gerarContratoBody(config.id, dados);
      const full = buildContratoHTML(body, config.title);
      const blob = new Blob([full], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setError("Não consegui gerar o contrato agora. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      {generating && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl mx-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="font-bold text-lg">Gerando seu contrato...</p>
          </div>
        </div>
      )}

      {showPix && answers && (
        <PixModal
          serviceId={`contrato-${config.id}`}
          amount={config.price}
          description={`${config.title} - LanhouseDigital`}
          onClose={() => setShowPix(false)}
          onConfirm={(orderId) => gerar(answers, orderId)}
        />
      )}

      {error && (
        <div className="bg-red-50 text-red-700 text-sm text-center py-2 px-4">{error}</div>
      )}

      <SimpleBot
        intro={config.intro}
        steps={config.steps}
        onComplete={handleComplete}
      />
    </>
  );
}

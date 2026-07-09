"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SimpleBot, type BotAnswers } from "@/components/SimpleBot";
import { PixModal } from "@/components/PixModal";
import { ATENDIMENTOS } from "@/lib/atendimento/config";
import { buildFichaPdf } from "@/lib/atendimento/pdf";
import { CheckCircle2, Download, Loader2 } from "lucide-react";

// Recebe só o `slug`; a config (que contém funções de validação) é resolvida
// aqui no cliente, evitando passar funções do servidor para o componente.
export function AtendimentoBot({ slug }: { slug: string }) {
  const config = ATENDIMENTOS[slug];
  const router = useRouter();
  const [answers, setAnswers] = useState<BotAnswers | null>(null);
  const [showPix, setShowPix] = useState(false);
  const [done, setDone] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  function handleComplete(data: BotAnswers) {
    setAnswers(data);
    setShowPix(true);
  }

  // Após o pagamento: "fila" cria um pedido (worker emite); "ficha" gera o PDF local.
  async function handlePaid(orderId: string) {
    if (!answers) return;
    setShowPix(false);

    if (config.mode === "ficha") {
      buildFichaPdf(config, answers).save();
      setDone(true);
      return;
    }

    setEnviando(true);
    setErro("");
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: config.id, dados: answers, orderId }),
      });
      if (!res.ok) throw new Error("falha");
      const { id } = await res.json();
      router.push(`/pedido/${id}`);
    } catch {
      setErro("Não consegui registrar seu pedido agora. Tente novamente.");
      setEnviando(false);
    }
  }

  if (enviando) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 font-semibold">Registrando seu pedido...</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
        <h1 className="mt-4 text-xl font-bold">Ficha gerada!</h1>
        <p className="mt-2 text-muted-foreground">
          O download do PDF começou. Se não baixou, toque no botão abaixo.
        </p>
        <button
          onClick={() => answers && buildFichaPdf(config, answers).save()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary/90 transition-colors"
        >
          <Download className="h-5 w-5" /> Baixar PDF
        </button>
      </div>
    );
  }

  return (
    <>
      {showPix && answers && (
        <PixModal
          serviceId={config.id}
          amount={config.price}
          description={`${config.title} - LanhouseDigital`}
          onClose={() => setShowPix(false)}
          onConfirm={handlePaid}
        />
      )}
      {erro && <div className="bg-red-50 text-red-700 text-sm text-center py-2 px-4">{erro}</div>}
      <SimpleBot
        intro={config.intro}
        steps={config.steps}
        onComplete={handleComplete}
      />
    </>
  );
}

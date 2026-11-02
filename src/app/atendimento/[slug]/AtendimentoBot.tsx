"use client";

import { useState } from "react";
import { SimpleBot, type BotAnswers } from "@/components/SimpleBot";
import { PixModal } from "@/components/PixModal";
import { ATENDIMENTOS } from "@/lib/atendimento/config";
import { buildFichaPdf } from "@/lib/atendimento/pdf";
import { CheckCircle2, Download } from "lucide-react";

// Recebe só o `slug`; a config (que contém funções de validação) é resolvida
// aqui no cliente, evitando passar funções do servidor para o componente.
export function AtendimentoBot({ slug }: { slug: string }) {
  const config = ATENDIMENTOS[slug];
  const [answers, setAnswers] = useState<BotAnswers | null>(null);
  const [showPix, setShowPix] = useState(false);
  const [done, setDone] = useState(false);

  function handleComplete(data: BotAnswers) {
    setAnswers(data);
    setShowPix(true);
  }

  // Após o pagamento, gera a ficha em PDF localmente (jsPDF) e oferece o download.
  function handlePaid() {
    if (!answers) return;
    setShowPix(false);
    buildFichaPdf(config, answers).save();
    setDone(true);
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
      <SimpleBot
        intro={config.intro}
        steps={config.steps}
        onComplete={handleComplete}
      />
    </>
  );
}

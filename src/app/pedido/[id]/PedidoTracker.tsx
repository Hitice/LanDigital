"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Download, CheckCircle2, AlertTriangle } from "lucide-react";

type Status = "pending" | "processing" | "done" | "error";

export function PedidoTracker({ id }: { id: string }) {
  const [status, setStatus] = useState<Status | "loading">("loading");
  const [erro, setErro] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch(`/api/pedidos/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setStatus(data.status);
        setErro(data.erro ?? null);
        if (data.status === "done" || data.status === "error") {
          if (timer.current) clearInterval(timer.current);
        }
      } catch { /* tenta de novo no próximo tick */ }
    };
    check();
    timer.current = setInterval(check, 4000);
    return () => { active = false; if (timer.current) clearInterval(timer.current); };
  }, [id]);

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      {(status === "loading" || status === "pending" || status === "processing") && (
        <>
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h1 className="mt-4 text-xl font-bold">Pedido em processamento</h1>
          <p className="mt-2 text-muted-foreground">
            Estamos emitindo seu documento. Pode deixar esta página aberta, ela atualiza sozinha.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Pedido {id.slice(0, 8)}</p>
        </>
      )}

      {status === "done" && (
        <>
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
          <h1 className="mt-4 text-xl font-bold">Documento pronto!</h1>
          <p className="mt-2 text-muted-foreground">Baixe seu PDF abaixo.</p>
          <a
            href={`/api/pedidos/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-white hover:bg-primary/90 transition-colors"
          >
            <Download className="h-5 w-5" /> Baixar PDF
          </a>
        </>
      )}

      {status === "error" && (
        <>
          <AlertTriangle className="mx-auto h-14 w-14 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold">Não foi possível emitir</h1>
          <p className="mt-2 text-muted-foreground">
            {erro || "Houve um problema ao emitir o documento."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Confira se os dados (nome, CPF, nome da mãe) estão exatamente como nos documentos e refaça o pedido.
          </p>
          <Link href="/" className="mt-6 inline-block rounded-xl border border-border px-6 py-3 font-semibold hover:border-primary hover:text-primary transition-colors">
            Voltar ao início
          </Link>
        </>
      )}
    </main>
  );
}

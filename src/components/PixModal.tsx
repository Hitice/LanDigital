"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, X, Loader2 } from "lucide-react";

interface PixModalProps {
  serviceId: string;
  amount: number;
  description: string;
  onClose: () => void;
  onConfirm: (orderId: string) => void;   // orderId da cobrança paga (ou "bypass")
}

type Phase = "loading" | "waiting" | "paid" | "error";

export function PixModal({ serviceId, amount, description, onClose, onConfirm }: PixModalProps) {
  const [payload, setPayload] = useState("");
  const [image, setImage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cria a cobrança ao abrir.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/pix/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceId, description }),
        });
        if (!res.ok) throw new Error("create failed");
        const data = await res.json();
        if (!active) return;
        setPayload(data.payload || "");
        setImage(data.encodedImage || "");
        setOrderId(data.orderId);
        setPhase("waiting");
      } catch {
        if (active) setPhase("error");
      }
    })();
    return () => { active = false; };
  }, [serviceId, description]);

  // Polling do status enquanto aguarda pagamento.
  useEffect(() => {
    if (phase !== "waiting" || !orderId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pix/status/${orderId}`);
        const data = await res.json();
        if (data.paid) {
          if (pollRef.current) clearInterval(pollRef.current);
          setPhase("paid");
          setTimeout(() => onConfirm(orderId), 1000);
        }
      } catch { /* segue tentando */ }
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, orderId, onConfirm]);

  async function copyPayload() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(payload);
      } else {
        const ta = document.createElement("textarea");
        ta.value = payload;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-5">
          <h2 className="text-xl font-bold text-foreground">Pagamento via PIX</h2>
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
          <Badge className="mt-2 bg-primary text-white text-base px-4 py-1">
            R$ {amount.toFixed(2).replace(".", ",")}
          </Badge>
        </div>

        {phase === "loading" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Gerando seu PIX...</p>
          </div>
        )}

        {phase === "error" && (
          <div className="py-8 text-center">
            <p className="text-sm text-red-600">Não consegui gerar o PIX agora. Feche e tente de novo.</p>
          </div>
        )}

        {phase === "paid" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="font-bold text-green-700">Pagamento confirmado!</p>
            <p className="text-xs text-muted-foreground">Preparando sua entrega...</p>
          </div>
        )}

        {phase === "waiting" && (
          <>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white border-2 border-primary/30 rounded-xl">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`data:image/png;base64,${image}`} alt="QR Code PIX" width={180} height={180} />
                ) : (
                  <QRCode value={payload} size={180} />
                )}
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground mb-3">
              Escaneie o QR Code ou copie o código PIX abaixo
            </p>

            <Button
              variant="outline"
              className="w-full mb-3 font-mono text-xs truncate border-primary/40 hover:border-primary"
              onClick={copyPayload}
            >
              {copied ? (
                <><Check className="mr-2 h-4 w-4 text-green-600" /> Copiado!</>
              ) : (
                <><Copy className="mr-2 h-4 w-4" /> Copiar código PIX</>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Aguardando o pagamento...
            </div>
            <p className="text-[11px] text-center text-muted-foreground mt-2">
              A entrega é liberada automaticamente assim que o PIX cair.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

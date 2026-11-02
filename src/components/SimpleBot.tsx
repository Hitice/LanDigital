"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, Check, Loader2 } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type FieldKind = "text" | "textarea" | "options" | "money" | "date" | "cep";

export interface BotStep {
  id: string;
  ask: string;                 // pergunta; aceita {campo} para interpolar respostas anteriores
  kind: FieldKind;
  options?: string[];
  placeholder?: string;
  optional?: boolean;
  validate?: (raw: string) => string | null;       // retorna mensagem de erro ou null
  skipIf?: (answers: BotAnswers) => boolean;        // pula o passo conforme respostas anteriores
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export type BotAnswers = Record<string, string>;

interface Msg { from: "bot" | "user"; text: string }

interface SimpleBotProps {
  intro: string;
  steps: BotStep[];
  finishLabel?: string;        // texto da bolha final antes do onComplete
  onComplete: (answers: BotAnswers) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function interpolate(text: string, answers: BotAnswers): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => answers[k] ?? "");
}

const formatMoney = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const n = parseInt(digits, 10) / 100;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatCEP = (raw: string): string => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
};

const formatDateMask = (raw: string): string => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  let out = d.slice(0, 2);
  if (d.length >= 3) out += "/" + d.slice(2, 4);
  if (d.length >= 5) out += "/" + d.slice(4, 8);
  return out;
};

function BotText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, li) => (
        <span key={li}>
          {li > 0 && <br />}
          {line.split(/\*\*(.*?)\*\*/g).map((chunk, ci) =>
            ci % 2 === 1 ? <strong key={ci}>{chunk}</strong> : chunk,
          )}
        </span>
      ))}
    </>
  );
}

// ─── Componente ────────────────────────────────────────────────────────────────
export function SimpleBot({ intro, steps, finishLabel, onComplete }: SimpleBotProps) {
  const [msgs, setMsgs]         = useState<Msg[]>([{ from: "bot", text: intro }]);
  const [answers, setAns]       = useState<BotAnswers>({});
  const [index, setIndex]       = useState(-1);   // -1 = intro ainda não confirmada
  const [inputVal, setVal]      = useState("");
  const [sending, setSend]      = useState(false);
  const [cepLoading, setCep]    = useState(false);
  const [history, setHistory]   = useState<number[]>([]);   // passos já respondidos (para voltar)

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const taRef     = useRef<HTMLTextAreaElement>(null);

  const step = index >= 0 && index < steps.length ? steps[index] : null;
  const progress = index < 0 ? 0 : Math.round((index / steps.length) * 100);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => {
    if (step?.kind === "text" || step?.kind === "money" || step?.kind === "date" || step?.kind === "cep")
      setTimeout(() => inputRef.current?.focus(), 360);
    else if (step?.kind === "textarea")
      setTimeout(() => taRef.current?.focus(), 360);
  }, [index, step?.kind]);

  // Avança para o próximo passo (ou finaliza), aplicando um patch de respostas.
  const commit = useCallback((display: string, patch: BotAnswers) => {
    setSend(true);
    setHistory(h => [...h, index]);   // guarda o passo atual para permitir voltar
    const newData = { ...answers, ...patch };
    setAns(newData);
    setMsgs(p => [...p, { from: "user", text: display }]);
    setVal("");

    // Pula passos condicionais (ex: dados do fiador, só quando há fiador).
    let nextIndex = index + 1;
    while (nextIndex < steps.length && steps[nextIndex].skipIf?.(newData)) nextIndex++;

    if (nextIndex >= steps.length) {
      if (finishLabel) setMsgs(p => [...p, { from: "bot", text: finishLabel }]);
      setTimeout(() => onComplete(newData), 400);
      return;
    }
    setIndex(nextIndex);
    setTimeout(() => {
      setMsgs(p => [...p, { from: "bot", text: interpolate(steps[nextIndex].ask, newData) }]);
      setSend(false);
    }, 360);
  }, [answers, index, steps, finishLabel, onComplete]);

  const advance = useCallback((raw: string) => {
    if (sending) return;
    if (index < 0) {   // confirma a intro
      setSend(true);
      setVal("");
      setMsgs(p => [...p, { from: "user", text: raw }]);
      setIndex(0);
      setTimeout(() => {
        setMsgs(p => [...p, { from: "bot", text: interpolate(steps[0].ask, answers) }]);
        setSend(false);
      }, 360);
      return;
    }
    if (!step) return;
    const value = raw.trim();
    if (!value && !step.optional) return;

    // Validação do campo (ex: CPF/CNPJ). Mostra o erro e mantém o usuário no passo.
    if (value && step.validate) {
      const err = step.validate(value);
      if (err) {
        setSend(true);
        setMsgs(p => [...p, { from: "user", text: value }]);
        setVal("");
        setTimeout(() => {
          setMsgs(p => [...p, { from: "bot", text: `Atenção: ${err}` }]);
          setSend(false);
        }, 300);
        return;
      }
    }

    commit(value || "(pulado)", { [step.id]: value });
  }, [sending, index, step, answers, steps, commit]);

  // Busca o CEP no ViaCEP e preenche logradouro, bairro, cidade e UF.
  const lookupCep = useCallback(async () => {
    if (sending || cepLoading || !step) return;
    const digits = inputVal.replace(/\D/g, "");
    if (digits.length !== 8) {
      setMsgs(p => [...p, { from: "bot", text: "O CEP precisa ter 8 números." }]);
      return;
    }
    setCep(true);
    setMsgs(p => [...p, { from: "user", text: formatCEP(digits) }]);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setMsgs(p => [...p, { from: "bot", text: "CEP não encontrado. Confira e digite de novo." }]);
        setCep(false);
        return;
      }
      const id = step.id;
      const patch: BotAnswers = {
        [`${id}_logradouro`]: data.logradouro ?? "",
        [`${id}_bairro`]: data.bairro ?? "",
        [`${id}_cidade`]: data.localidade ?? "",
        [`${id}_uf`]: data.uf ?? "",
        [`${id}_cep`]: formatCEP(digits),
      };
      setCep(false);
      setMsgs(p => [...p, { from: "bot", text: `Encontrei: ${data.logradouro || "(sem logradouro)"}, ${data.bairro}, ${data.localidade}/${data.uf}` }]);
      commit(formatCEP(digits), patch);
    } catch {
      setMsgs(p => [...p, { from: "bot", text: "Não consegui buscar o CEP agora. Tente de novo." }]);
      setCep(false);
    }
  }, [sending, cepLoading, step, inputVal, commit]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = inputVal.trim();
    if (v || step?.optional) advance(v);
  }

  // Data: guarda no formato ISO (AAAA-MM-DD), mostra DD/MM/AAAA na conversa.
  function commitDate(iso: string) {
    if (!step) return;
    const [y, m, d] = iso.split("-");
    commit(`${d}/${m}/${y}`, { [step.id]: iso });
  }
  function submitDate() {
    if (sending || !step) return;
    const v = inputVal.trim();
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const ok = m && +m[1] >= 1 && +m[1] <= 31 && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1900 && +m[3] <= new Date().getFullYear() + 5;
    if (!ok) {
      setSend(true);
      setMsgs(p => [...p, { from: "user", text: v || "(vazio)" }]);
      setVal("");
      setTimeout(() => {
        setMsgs(p => [...p, { from: "bot", text: "Atenção: data inválida. Use DD/MM/AAAA, ex: 12/06/1988." }]);
        setSend(false);
      }, 300);
      return;
    }
    commitDate(`${m![3]}-${m![2]}-${m![1]}`);
  }

  // Volta ao passo anterior para corrigir uma resposta.
  const voltar = useCallback(() => {
    if (sending || cepLoading || history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setIndex(prev);
    setVal("");
    setMsgs(p => [...p, { from: "bot", text: `Vamos corrigir. ${interpolate(steps[prev].ask, answers)}` }]);
  }, [sending, cepLoading, history, steps, answers]);

  // ─── Estilos (espelham o CurriculoBot) ────────────────────────────────────
  const btnOpt  = "w-full text-left bg-secondary hover:bg-primary/10 disabled:opacity-50 border border-border hover:border-primary/60 text-foreground text-[15px] font-semibold py-3 px-4 rounded-2xl transition-colors";
  const inpCls  = "flex-1 rounded-2xl border border-input bg-secondary px-4 py-3 text-base font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";
  const btnSend = "w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0";
  const btnSkip = "flex-1 text-[13px] font-medium py-2 rounded-xl border border-dashed border-muted-foreground/30 bg-transparent text-muted-foreground/70 hover:border-primary/50 hover:text-primary/80 disabled:opacity-40 transition-colors";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Progresso */}
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
          <span>Progresso</span>
          <span className="font-bold text-primary">{progress}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3 bg-gray-50">
        {msgs.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            {m.from === "bot" && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mb-0.5">
                <Bot className="h-4 w-4 text-white" />
              </div>
            )}
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
              m.from === "bot" ? "bg-white text-foreground rounded-bl-sm" : "bg-primary text-white rounded-br-sm"
            }`}>
              {m.from === "bot" ? <BotText text={m.text} /> : m.text}
            </div>
          </div>
        ))}
        {(sending || cepLoading) && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <span className="flex gap-1">
                {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 sm:px-4 py-3 bg-white border-t border-border space-y-2">
        {index >= 0 && history.length > 0 && (
          <button onClick={voltar} disabled={sending || cepLoading}
            className="text-xs font-medium text-muted-foreground hover:text-primary disabled:opacity-40 transition-colors">
            ← Voltar e corrigir
          </button>
        )}

        {index < 0 && (
          <button onClick={() => advance("Vamos lá!")} disabled={sending}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold text-base py-4 rounded-2xl transition-colors shadow-sm">
            Começar
          </button>
        )}

        {step?.kind === "options" && (
          <div className="flex flex-col gap-2">
            {step.options?.map(opt => (
              <button key={opt} onClick={() => advance(opt)} disabled={sending} className={btnOpt}>{opt}</button>
            ))}
          </div>
        )}

        {step?.kind === "cep" && (
          <form onSubmit={e => { e.preventDefault(); lookupCep(); }} className="flex gap-2">
            <input ref={inputRef} inputMode="numeric" value={inputVal}
              onChange={e => setVal(formatCEP(e.target.value))} maxLength={9}
              placeholder={step.placeholder ?? "Ex: 38400-000"} autoComplete="off" className={inpCls} />
            <button type="submit" disabled={cepLoading || sending || inputVal.replace(/\D/g, "").length < 8} className={btnSend}>
              {cepLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </form>
        )}

        {(step?.kind === "text" || step?.kind === "money") && (
          <>
            <form onSubmit={submit} className="flex gap-2">
              <input ref={inputRef}
                type="text"
                inputMode={step.kind === "money" ? "numeric" : undefined}
                value={inputVal}
                onChange={e => setVal(step.kind === "money" ? formatMoney(e.target.value) : e.target.value)}
                placeholder={step.kind === "money" ? "0,00" : step.placeholder}
                autoComplete="off" className={inpCls} />
              <button type="submit" disabled={(!inputVal.trim() && !step.optional) || sending} className={btnSend}>
                <Send className="h-5 w-5" />
              </button>
            </form>
            {step.optional && (
              <button onClick={() => advance("")} disabled={sending} className={btnSkip}>Pular</button>
            )}
          </>
        )}

        {step?.kind === "date" && (
          <>
            <form onSubmit={e => { e.preventDefault(); submitDate(); }} className="flex gap-2">
              <input ref={inputRef} type="text" inputMode="numeric" value={inputVal}
                onChange={e => setVal(formatDateMask(e.target.value))}
                placeholder={step.placeholder ?? "DD/MM/AAAA (ex: 12/06/1988)"} maxLength={10}
                autoComplete="off" className={inpCls} />
              <button type="submit" disabled={sending || inputVal.replace(/\D/g, "").length < 8} className={btnSend}>
                <Send className="h-5 w-5" />
              </button>
            </form>
            <button onClick={() => commitDate(todayISO())} disabled={sending} className={btnSkip}>Hoje</button>
          </>
        )}

        {step?.kind === "textarea" && (
          <form onSubmit={submit} className="flex flex-col gap-2">
            <textarea ref={taRef} rows={3} value={inputVal}
              onChange={e => setVal(e.target.value)} placeholder={step.placeholder}
              className="w-full rounded-2xl border border-input bg-secondary px-4 py-3 text-base font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
            <button type="submit" disabled={!inputVal.trim() && !step.optional}
              className="w-full py-3 rounded-2xl bg-primary text-white font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              <Check className="h-4 w-4" /> Enviar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

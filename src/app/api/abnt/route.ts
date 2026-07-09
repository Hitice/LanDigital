import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { hasPaidAccess } from "@/lib/access";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const client = new Anthropic();

const SYSTEM = `Você formata trabalhos acadêmicos nas normas ABNT. Recebe um JSON com o texto bruto do trabalho e gera o CORPO formatado.

REGRAS:
- Responda SOMENTE com HTML do corpo (sem <html>, <head>, <body>; sem markdown; sem crases).
- Identifique e estruture seções: use <h2> para seções principais (ex: "1 INTRODUÇÃO", "2 DESENVOLVIMENTO", "3 CONCLUSÃO", "REFERÊNCIAS") e <h3> para subseções.
- Numere as seções no padrão ABNT (1, 1.1, 2...). REFERÊNCIAS não recebe número.
- Cada parágrafo em <p>. Corrija ortografia e pontuação, sem mudar o sentido nem inventar conteúdo.
- Se houver referências, formate-as no padrão ABNT (sobrenome em maiúsculas, etc.) dentro da seção REFERÊNCIAS.
- Não use travessões (use vírgula ou hífen).`;

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`abnt:${clientIp(req)}`)) {
      return NextResponse.json({ error: "muitas requisições, tente em instantes" }, { status: 429 });
    }
    const { texto, orderId } = await req.json();
    if (!(await hasPaidAccess(orderId))) {
      return NextResponse.json({ error: "pagamento necessário" }, { status: 402 });
    }
    if (!texto || String(texto).trim().length < 20) {
      return NextResponse.json({ error: "texto muito curto" }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify({ texto }) }],
    });

    const html = (response.content[0] as Anthropic.Messages.TextBlock).text
      .trim()
      .replace(/^```html\s*/i, "")
      .replace(/```\s*$/, "");

    return NextResponse.json({ html });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/abnt]", msg);
    return NextResponse.json({ error: "falha ao formatar" }, { status: 500 });
  }
}

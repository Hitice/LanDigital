import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { hasPaidAccess } from "@/lib/access";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const client = new Anthropic();

const SYSTEM = `Você analisa a FOTO de um documento brasileiro e extrai apenas os dados úteis, devolvendo um JSON.

Responda SOMENTE com JSON válido (sem markdown, sem crases), neste formato:
{
  "titulo": "nome curto para o arquivo, ex: RG - João da Silva",
  "tipo": "tipo do documento, ex: RG, CPF, CNH, Comprovante de residência, Certidão",
  "rotationDeg": 0,
  "campos": [ { "label": "Nome", "valor": "João da Silva" }, { "label": "CPF", "valor": "529.982.247-25" } ]
}

REGRAS:
- Extraia APENAS os dados identificadores e úteis: nome, número do documento, CPF, RG, datas (nascimento, emissão, validade), filiação, naturalidade, órgão emissor, categoria (CNH). IGNORE textos decorativos, instruções, leis, avisos e rodapés.
- Formate os valores de forma limpa: datas como dd/mm/aaaa, CPF/CNPJ e documentos com a pontuação padrão. Capitalize nomes corretamente.
- "rotationDeg": 0, 90, 180 ou 270, quanto girar (horário) para deixar a imagem na vertical.
- Não invente dados ilegíveis: use "[ilegível]" no valor. Não use travessões. Sem nada fora do JSON.`;

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`organizador:${clientIp(req)}`)) {
      return NextResponse.json({ error: "muitas requisições, tente em instantes" }, { status: 429 });
    }
    const { image, mime, orderId } = await req.json();
    if (!(await hasPaidAccess(orderId))) {
      return NextResponse.json({ error: "pagamento necessário" }, { status: 402 });
    }
    if (!image) return NextResponse.json({ error: "imagem ausente" }, { status: 400 });

    const base64 = String(image).replace(/^data:[^;]+;base64,/, "");
    const mediaType = (mime || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Analise este documento e devolva o JSON." },
        ],
      }],
    });

    const text = (response.content[0] as Anthropic.Messages.TextBlock).text
      .trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/organizador]", msg);
    return NextResponse.json({ error: "falha ao analisar documento" }, { status: 500 });
  }
}

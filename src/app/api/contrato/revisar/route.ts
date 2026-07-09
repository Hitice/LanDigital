import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { hasPaidAccess } from "@/lib/access";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const client = new Anthropic();

// Revisa os DADOS do contrato (não gera cláusulas, que são determinísticas).
// Análise no mesmo nível do revisor de currículo.
const SYSTEM = `Você é um(a) revisor(a) jurídico de contratos brasileiros. Recebe os dados de um contrato em JSON e retorna o MESMO JSON, com as mesmas chaves, revisado.

REVISÃO A APLICAR:
- Nomes de pessoas, razão social, logradouro e bairro: capitalização correta. Ex: "joão da silva" -> "João da Silva", "rua dos andradas" -> "Rua dos Andradas". Mantenha siglas (LTDA, ME, EIRELI) em maiúsculas.
- Acentuação e ortografia: corrija em todos os campos de texto. Ex: "instalacao eletrica" -> "Instalação elétrica".
- Campos de texto livre (servico, atividade, observacoes): reescreva com linguagem clara e formal de contrato, corrigindo gramática e pontuação, SEM inventar fatos nem adicionar cláusulas. Mantenha o sentido original.
- Cidade/UF: capitalize a cidade corretamente.

NUNCA altere (copie igual ao input): documentos (CPF/CNPJ), números, datas, valores monetários, dia de vencimento, prazo, forma de pagamento, garantia, e as chaves terminadas em _cep, _uf, _numero, _complemento.

Não use travessões (use vírgula ou hífen). Responda SOMENTE com JSON válido, sem markdown.`;

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`contrato:${clientIp(req)}`)) {
      return NextResponse.json({ error: "muitas requisições, tente em instantes" }, { status: 429 });
    }
    const { answers, orderId } = await req.json();
    if (!(await hasPaidAccess(orderId))) {
      return NextResponse.json({ error: "pagamento necessário" }, { status: 402 });
    }
    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "dados inválidos" }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1536,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(answers) }],
    });

    const text = (response.content[0] as Anthropic.Messages.TextBlock).text
      .trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const normalized = JSON.parse(text);

    // Mescla: valores normalizados sobre os originais.
    return NextResponse.json({ ...answers, ...normalized });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/contrato/revisar]", msg);
    // Em caso de falha, devolve os dados originais para não travar a geração.
    return NextResponse.json(null, { status: 500 });
  }
}

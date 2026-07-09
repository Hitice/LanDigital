import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { hasPaidAccess } from "@/lib/access";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const client = new Anthropic();

const SYSTEM = `Você é um redator de RH brasileiro. Recebe dados de um currículo em JSON e retorna o JSON corrigido e aprimorado, com os MESMOS campos e estrutura do input.

CORREÇÕES GERAIS (aplique em todos os campos de texto):
- Corrija acentuação: "informatica"→"Informática", "manutencao"→"Manutenção", "ingles"→"Inglês", "administracao"→"Administração", "tecnico"→"Técnico", "grafico"→"Gráfico", "analise"→"Análise", "logistica"→"Logística", etc.
- Capitalize nomes próprios de pessoas, empresas, cidades, cursos e instituições. Ex: "algar tech"→"Algar Tech", "uniube"→"Uniube"
- Corrija erros de digitação óbvios. Ex: "Henriqeu"→"Henrique", "Supporte"→"Suporte"
- Mantenha siglas em maiúsculas: RPA, SQL, TI, CNH, MBA
- Não altere: datas, telefone, e-mail, CEP, campo "cnh"

CAMPO "nome": capitalize cada palavra corretamente

CAMPO "experiencias[].descricao" — reescreva cada descrição com linguagem profissional de currículo:
- Use verbos no passado impessoal: "Responsável por...", "Atuou em...", "Realizou...", "Executou...", "Desenvolveu...", "Operou..."
- Se a descrição for vaga ou sem sentido, reescreva com base no cargo e empresa. Ex: cargo "Vendedor" → "Responsável pelo atendimento a clientes e fechamento de vendas."
- Se a descrição já estiver boa, apenas corrija acentos e capitalize
- Máximo de 1 frase curta por descrição

CAMPO "objetivo": escreva exatamente 2 frases em 3ª pessoa, máximo 280 caracteres total
- Detecte gênero pelo primeiro nome (terminado em 'a'/'ã' = feminino)
- Baseie-se no cargo, área, formação e habilidades do perfil completo
- Tom direto e positivo — sem "busco oportunidade" ou "almejo crescimento"
- Sem exp: "Jovem em início de carreira com formação em [X]. Dedicado(a) e com disposição para aprender e crescer."
- Com exp: "Profissional com experiência em [área], atuando como [cargo]. Proativo(a) e comprometido(a) com resultados."

Responda SOMENTE com JSON válido. Sem markdown, sem explicações.`;

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`curriculo:${clientIp(req)}`)) {
      return NextResponse.json({ error: "muitas requisições, tente em instantes" }, { status: 429 });
    }
    const { data, orderId } = await req.json();
    if (!(await hasPaidAccess(orderId))) {
      return NextResponse.json({ error: "pagamento necessário" }, { status: 402 });
    }

    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1536,
      system:     SYSTEM,
      messages: [{
        role:    "user",
        content: JSON.stringify(data),
      }],
    });

    const text = (response.content[0] as Anthropic.Messages.TextBlock).text.trim();
    const corrected = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/, ""));

    // Merge corrected fields back, keeping original as fallback for any missing fields
    const merged = { ...data, ...corrected };

    return NextResponse.json(merged);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/curriculo-review]", msg);
    // On error, return original data so the flow doesn't break
    return NextResponse.json(null, { status: 500 });
  }
}

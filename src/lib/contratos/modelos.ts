import type { BotAnswers } from "@/components/SimpleBot";
import { formatDoc } from "@/lib/validators";

// Geração determinística de contratos a partir de modelos padrão.
// Não usa IA: documento jurídico não pode conter cláusula alucinada, e assim
// economizamos 100% dos tokens de geração.

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function esc(s?: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function dataBR(iso?: string): string {
  const [y, m, d] = (iso ?? "").split("-");
  return y && m && d ? `${d}/${m}/${y}` : "___/___/______";
}

function hojeExtenso(): string {
  const t = new Date();
  return `${t.getDate()} de ${MESES[t.getMonth()]} de ${t.getFullYear()}`;
}

function somarMeses(iso: string, meses: number): string {
  const [y, m, d] = (iso ?? "").split("-").map(Number);
  if (!y || !m || !d) return "___/___/______";
  const data = new Date(y, m - 1 + meses, d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return dataBR(`${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`);
}

function enderecoImovel(a: BotAnswers): string {
  const comp = a.imovel_complemento ? `, ${esc(a.imovel_complemento)}` : "";
  return `${esc(a.imovel_logradouro)}, nº ${esc(a.imovel_numero)}${comp}, bairro ${esc(a.imovel_bairro)}, ${esc(a.imovel_cidade)}/${esc(a.imovel_uf)}, CEP ${esc(a.imovel_cep)}`;
}

type Signatario = { label: string; nome: string; doc: string };

const linhaAssina = (nome: string, sub: string) =>
  `<div class="assina"><span class="risco"></span><strong>${esc(nome)}</strong><small>${sub}</small></div>`;

// Bloco de assinaturas: as duas partes, o fiador (se houver) e duas testemunhas.
function blocoAssinaturas(parte1: Signatario, parte2: Signatario, fiadorSig?: Signatario): string {
  const fiadorRow = fiadorSig
    ? `<div class="assinaturas">${linhaAssina(fiadorSig.nome, `${fiadorSig.label} (${esc(fiadorSig.doc)})`)}</div>`
    : "";
  return `
    <div class="assinaturas">
      ${linhaAssina(parte1.nome, `${parte1.label} (${esc(parte1.doc)})`)}
      ${linhaAssina(parte2.nome, `${parte2.label} (${esc(parte2.doc)})`)}
    </div>
    ${fiadorRow}
    <p class="testemunhas-titulo">Testemunhas:</p>
    <div class="assinaturas">
      <div class="assina"><span class="risco"></span><small>Nome:<br>CPF:</small></div>
      <div class="assina"><span class="risco"></span><small>Nome:<br>CPF:</small></div>
    </div>`;
}

function fecho(cidade: string, uf: string): string {
  return `<p class="local-data">${esc(cidade)}/${esc(uf)}, ${hojeExtenso()}.</p>`;
}

function clausulaObservacoes(obs?: string): string {
  return obs ? `<h2>CLÁUSULA DAS DISPOSIÇÕES GERAIS</h2><p>${esc(obs)}</p>` : "";
}

// ─── Modelos ────────────────────────────────────────────────────────────────
function locacao(a: BotAnswers, residencial: boolean): string {
  const fim = `fins ${residencial ? "exclusivamente residenciais" : "comerciais, destinado à atividade de " + esc(a.atividade)}`;
  return `
  <h1>${residencial ? "Contrato de Locação Residencial" : "Contrato de Locação Comercial"}</h1>
  <p>Por este instrumento particular, de um lado <strong>${esc(a.locador_nome)}</strong>, inscrito(a) no CPF/CNPJ sob o nº ${esc(formatDoc(a.locador_doc))}, doravante <strong>LOCADOR</strong>, e de outro lado <strong>${esc(a.locatario_nome)}</strong>, inscrito(a) no CPF/CNPJ sob o nº ${esc(formatDoc(a.locatario_doc))}, doravante <strong>LOCATÁRIO</strong>, têm entre si justo e contratado o seguinte:</p>

  <h2>CLÁUSULA PRIMEIRA - DO OBJETO</h2>
  <p>O LOCADOR dá em locação ao LOCATÁRIO, para ${fim}, o imóvel situado em ${enderecoImovel(a)}.</p>

  <h2>CLÁUSULA SEGUNDA - DO PRAZO</h2>
  <p>A locação vigorará por ${esc(a.prazo)} meses, iniciando-se em ${dataBR(a.inicio)} e encerrando-se em ${somarMeses(a.inicio, parseInt(a.prazo || "0", 10))}, quando o imóvel deverá ser devolvido nas condições em que foi recebido.</p>

  <h2>CLÁUSULA TERCEIRA - DO ALUGUEL</h2>
  <p>O aluguel mensal é de R$ ${esc(a.valor)}, a ser pago até o dia ${esc(a.vencimento)} de cada mês.</p>

  <h2>CLÁUSULA QUARTA - DO REAJUSTE</h2>
  <p>O aluguel será reajustado anualmente pela variação do IGP-M/FGV ou, na sua falta, por índice oficial que o substitua.</p>

  <h2>CLÁUSULA QUINTA - DA GARANTIA</h2>
  <p>${a.garantia === "Fiador"
      ? `A presente locação é garantida por fiador: <strong>${esc(a.fiador_nome)}</strong>, inscrito(a) no CPF/CNPJ sob o nº ${esc(formatDoc(a.fiador_doc))}, que assina ao final como responsável solidário pelas obrigações deste contrato.`
      : `A presente locação é garantida na modalidade: ${esc(a.garantia)}.`}</p>

  <h2>CLÁUSULA SEXTA - DAS OBRIGAÇÕES DO LOCATÁRIO</h2>
  <p>Compete ao LOCATÁRIO conservar o imóvel, pagar pontualmente o aluguel e as despesas de consumo (água, luz, gás), e restituí-lo ao final no estado em que o recebeu, salvo o desgaste natural do uso regular.</p>

  <h2>CLÁUSULA SÉTIMA - DAS OBRIGAÇÕES DO LOCADOR</h2>
  <p>Compete ao LOCADOR garantir ao LOCATÁRIO o uso pacífico do imóvel e responder pelos vícios ou defeitos anteriores à locação.</p>

  <h2>CLÁUSULA OITAVA - DA RESCISÃO</h2>
  <p>A rescisão antecipada e imotivada sujeitará a parte infratora ao pagamento de multa equivalente a 3 (três) aluguéis, reduzida proporcionalmente ao período já cumprido.</p>

  <h2>CLÁUSULA NONA - DO FORO</h2>
  <p>As partes elegem o foro da Comarca de ${esc(a.imovel_cidade)}/${esc(a.imovel_uf)} para dirimir quaisquer questões oriundas deste contrato.</p>

  ${clausulaObservacoes(a.observacoes)}
  ${fecho(a.imovel_cidade, a.imovel_uf)}
  ${blocoAssinaturas(
    { label: "LOCADOR", nome: a.locador_nome, doc: formatDoc(a.locador_doc) },
    { label: "LOCATÁRIO", nome: a.locatario_nome, doc: formatDoc(a.locatario_doc) },
    a.garantia === "Fiador" ? { label: "FIADOR", nome: a.fiador_nome, doc: formatDoc(a.fiador_doc) } : undefined,
  )}`;
}

function prestacaoServicos(a: BotAnswers): string {
  return `
  <h1>Contrato de Prestação de Serviços</h1>
  <p>Por este instrumento particular, de um lado <strong>${esc(a.contratante_nome)}</strong>, inscrito(a) no CPF/CNPJ sob o nº ${esc(formatDoc(a.contratante_doc))}, doravante <strong>CONTRATANTE</strong>, e de outro lado <strong>${esc(a.contratado_nome)}</strong>, inscrito(a) no CPF/CNPJ sob o nº ${esc(formatDoc(a.contratado_doc))}, doravante <strong>CONTRATADO</strong>, têm entre si justo e contratado o seguinte:</p>

  <h2>CLÁUSULA PRIMEIRA - DO OBJETO</h2>
  <p>O CONTRATADO prestará ao CONTRATANTE os seguintes serviços: ${esc(a.servico)}.</p>

  <h2>CLÁUSULA SEGUNDA - DO PRAZO</h2>
  <p>Os serviços serão executados no prazo de ${esc(a.prazo)}, com início em ${dataBR(a.inicio)}.</p>

  <h2>CLÁUSULA TERCEIRA - DO VALOR E PAGAMENTO</h2>
  <p>Pela prestação dos serviços, o CONTRATANTE pagará ao CONTRATADO o valor total de R$ ${esc(a.valor)}, na forma: ${esc(a.pagamento)}.</p>

  <h2>CLÁUSULA QUARTA - DAS OBRIGAÇÕES DO CONTRATADO</h2>
  <p>O CONTRATADO obriga-se a executar os serviços com zelo e técnica, dentro do prazo ajustado, respondendo pela qualidade do trabalho entregue.</p>

  <h2>CLÁUSULA QUINTA - DAS OBRIGAÇÕES DO CONTRATANTE</h2>
  <p>O CONTRATANTE obriga-se a fornecer as condições necessárias à execução e a efetuar o pagamento na forma pactuada.</p>

  <h2>CLÁUSULA SEXTA - DA RESCISÃO</h2>
  <p>O contrato poderá ser rescindido por descumprimento de qualquer cláusula, respondendo a parte que der causa por perdas e danos.</p>

  <h2>CLÁUSULA SÉTIMA - DO FORO</h2>
  <p>As partes elegem o foro da Comarca de ${esc(a.foro_cidade)}/${esc(a.foro_uf)} para dirimir quaisquer questões oriundas deste contrato.</p>

  ${clausulaObservacoes(a.observacoes)}
  ${fecho(a.foro_cidade, a.foro_uf)}
  ${blocoAssinaturas(
    { label: "CONTRATANTE", nome: a.contratante_nome, doc: formatDoc(a.contratante_doc) },
    { label: "CONTRATADO", nome: a.contratado_nome, doc: formatDoc(a.contratado_doc) },
  )}`;
}

// Dispatcher por tipo (id do ContratoConfig).
export function gerarContratoBody(tipo: string, a: BotAnswers): string {
  switch (tipo) {
    case "locacao-residencial": return locacao(a, true);
    case "locacao-comercial":   return locacao(a, false);
    case "prestacao-servicos":  return prestacaoServicos(a);
    default:                    return "<h1>Contrato</h1><p>Tipo de contrato não reconhecido.</p>";
  }
}

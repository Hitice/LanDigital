"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PixModal } from "@/components/PixModal";
import { useEntitlement, SUBSCRIBER_ORDER } from "@/lib/useEntitlement";
import { buildCurriculoHTML } from "./curriculoTemplate";
import type { CurriculoData } from "./pdfGenerator";
import { Send, Bot, Check, RotateCcw, Loader2 } from "lucide-react";

// Campos que a IA pode corrigir na revisão (os demais vêm dos dados crus).
type ReviewFix = Partial<{
  nome: string; estadoCivil: string; cidade: string; estado: string;
  logradouro: string; bairro: string; objetivo: string;
  habilidades: string; idiomas: string;
  experiencias: CurriculoData["experiencias"]; formacoes: CurriculoData["formacoes"];
}>;

// ─── Constantes ───────────────────────────────────────────────────────────────
const UF = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
            "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const MESES = [
  { v:"01",l:"Janeiro" },{ v:"02",l:"Fevereiro" },{ v:"03",l:"Março" },
  { v:"04",l:"Abril" },  { v:"05",l:"Maio" },     { v:"06",l:"Junho" },
  { v:"07",l:"Julho" },  { v:"08",l:"Agosto" },   { v:"09",l:"Setembro" },
  { v:"10",l:"Outubro" },{ v:"11",l:"Novembro" }, { v:"12",l:"Dezembro" },
];
const DIAS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const ANOS_NASC: string[] = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 65 }, (_, i) => String(y - 14 - i));
})();
const ANOS_EXP: string[] = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 55 }, (_, i) => String(y - i));
})();
const ANOS_CONC: string[] = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: y + 4 - 1980 }, (_, i) => String(y + 3 - i));
})();
const CARGOS = [
  "Atendente","Auxiliar Administrativo","Auxiliar de Produção","Caixa",
  "Cozinheiro(a)","Eletricista","Estoquista","Garçom | Garçonete",
  "Mecânico(a)","Motorista","Operador(a)","Recepcionista",
  "Segurança","Serviços Gerais","Vendedor(a)",
];
const HAB_COMUNS = [
  // Administrativo & Comercial
  { l:"Atendimento ao cliente", v:"Atendimento ao cliente" },
  { l:"Vendas",                 v:"Vendas" },
  { l:"Caixa | PDV",            v:"Caixa e PDV" },
  { l:"Informática",            v:"Informática" },
  { l:"Excel e Planilhas",      v:"Excel e Planilhas" },
  { l:"Pacote Office",          v:"Pacote Office" },
  // Logística & Estoque
  { l:"Estoque e Logística",    v:"Estoque e Logística" },
  { l:"Embalagem e Expedição",  v:"Embalagem e Expedição" },
  { l:"Movimentação de Cargas", v:"Movimentação de Cargas" },
  { l:"Empilhadeira",           v:"Operação de Empilhadeira" },
  // Serviços Gerais
  { l:"Limpeza e Conservação",  v:"Limpeza e Conservação" },
  { l:"Portaria | Zeladoria",   v:"Portaria e Zeladoria" },
  { l:"Serviços Gerais",        v:"Serviços Gerais" },
  { l:"Jardinagem",             v:"Jardinagem" },
  // Chão de Fábrica
  { l:"Operação de Máquinas",   v:"Operação de Máquinas" },
  { l:"Linha de Produção",      v:"Linha de Produção" },
  { l:"Controle de Qualidade",  v:"Controle de Qualidade" },
  { l:"Manutenção em geral",    v:"Manutenção em geral" },
  { l:"Soldagem",               v:"Soldagem" },
  { l:"Pintura Industrial",     v:"Pintura Industrial" },
  // Soft Skills & Outros
  { l:"Trabalho em equipe",     v:"Trabalho em equipe" },
  { l:"Pontualidade",           v:"Pontualidade e assiduidade" },
  { l:"Liderança",              v:"Liderança de equipe" },
  { l:"Culinária",              v:"Culinária" },
  { l:"Costura",                v:"Costura" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toProperCase = (s: string) =>
  s.trim().toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());

const formatPhone = (raw: string): string => {
  const d = raw.replace(/\D/g,"").slice(0,11);
  if (!d.length) return "";
  if (d.length <= 2)  return `(${d}`;
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};
const formatCEP = (raw: string): string => {
  const d = raw.replace(/\D/g,"").slice(0,8);
  return d.length <= 5 ? d : `${d.slice(0,5)}-${d.slice(5)}`;
};
const formatDateTyped = (raw: string): string => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  let out = d.slice(0, 2);
  if (d.length >= 3) out += "/" + d.slice(2, 4);
  if (d.length >= 5) out += "/" + d.slice(4, 8);
  return out;
};
const appendIdioma = (d: BotData, idioma: string, nivel: string): BotData => {
  const e = `${idioma} - ${nivel}`;
  return { ...d, idiomas: d.idiomas ? `${d.idiomas}\n${e}` : e };
};

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Exp { empresa:string; cargo:string; inicio:string; fim:string; descricao:string }
interface Edu { nivel:string; curso:string; instituicao:string; conclusao:string }
interface BotData {
  nome:string; nascimento:string; estadoCivil:string;
  cep:string; logradouro:string; numero:string; bairro:string;
  email:string; telefone:string; cidade:string; estado:string;
  objetivo:string; experiencias:Exp[]; formacoes:Edu[];
  habilidades:string; idiomas:string; cnh:string;
  _exp:Partial<Exp>; _edu:Partial<Edu>; _idiomaAtual:string;
}
const freshData = (): BotData => ({
  nome:"", nascimento:"", estadoCivil:"",
  cep:"", logradouro:"", numero:"", bairro:"",
  email:"", telefone:"", cidade:"", estado:"",
  objetivo:"", experiencias:[], formacoes:[],
  habilidades:"", idiomas:"", cnh:"",
  _exp:{}, _edu:{}, _idiomaAtual:"",
});

type InputKind =
  | "text"|"email"|"tel"|"textarea"
  | "options"|"uf"|"action"
  | "month-year"|"year-pick"|"date-dmy"|"cep"|"multi-select"|"select-single";

interface Shortcut { label:string; value:string }
interface Step {
  ask: (d:BotData) => string;
  kind: InputKind;
  options?: string[];
  action?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  shortcuts?: Shortcut[] | ((d:BotData) => Shortcut[]);
  suggestions?: { label:string; value:string }[];
  monthYearOpts?: { today?:boolean; dontRemember?:boolean };
  validate?: (ans:string, d:BotData) => string|null;
  format?: (ans:string) => string;
  save?: (ans:string, d:BotData) => BotData;
  next: (ans:string, d:BotData) => string;
}

const PULAR = "__pular__";
const FIM   = "__fim__";

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS: Record<string, Step> = {

  intro: {
    ask: () => "Oi! Vou montar seu **currículo** com você, passo a passo.\n\nNo final, baixe o PDF por apenas **R$ 5,00**. Vamos?",
    kind:"action", action:"Vamos lá!",
    next: () => "nome",
  },

  nome: {
    ask: () => "Qual é o seu **nome completo**?",
    kind:"text", placeholder:"Ex: Maria da Silva",
    validate: v => {
      const p = v.trim().split(/\s+/).filter(w => w.length >= 2);
      return p.length < 2 ? "Digite seu nome completo!" : null;
    },
    format: toProperCase,
    save: (v,d) => ({ ...d, nome:v }),
    next: () => "nascimento",
  },

  nascimento: {
    ask: d => `Prazer, **${d.nome.split(" ")[0]}**! Qual é a sua **data de nascimento**?`,
    kind:"date-dmy",
    shortcuts:[{ label:"Pular", value:PULAR }],
    save: (v,d) => v === PULAR ? d : { ...d, nascimento:v },
    next: () => "estado_civil",
  },

  estado_civil: {
    ask: () => "Qual é o seu **estado civil**?",
    kind:"options",
    options:["Solteiro(a)","Casado(a)","União estável","Divorciado(a)","Viúvo(a)","Prefiro não informar"],
    save: (v,d) => v === "Prefiro não informar" ? d : { ...d, estadoCivil:v },
    next: () => "cep",
  },

  cep: {
    ask: () => "Qual é o seu **CEP**?",
    kind:"cep", placeholder:"Ex: 38408-123",
    shortcuts:[{ label:"Pular", value:PULAR }],
    save: (v,d) => v === PULAR ? d : d,
    next: v => v === PULAR ? "cidade" : "cep_numero",
  },

  cep_numero: {
    ask: d => `**${d.logradouro}**, ${d.bairro}, ${d.cidade} | ${d.estado}\n\nQual é o **número**?`,
    kind:"text", placeholder:"Ex: 123 ou S/N",
    shortcuts:[{ label:"Pular", value:PULAR }],
    validate: v => {
      const s = v.trim();
      if (/^s\/n$/i.test(s)) return null;
      if (/^\d/.test(s)) return null;
      return "Digite o número (ex: 123) ou S/N";
    },
    save: (v,d) => v === PULAR ? d : { ...d, numero:v },
    next: () => "email",
  },

  cidade: {
    ask: () => "Em qual **cidade** você mora?",
    kind:"text", placeholder:"Ex: Uberlândia",
    validate: v => v.trim().length < 2 ? "Escreve o nome da cidade!" : null,
    format: toProperCase,
    save: (v,d) => ({ ...d, cidade:v }),
    next: () => "estado",
  },

  estado: {
    ask: () => "Qual é o **estado**?",
    kind:"uf",
    save: (v,d) => ({ ...d, estado:v }),
    next: () => "email",
  },

  email: {
    ask: () => "Qual é o seu **e-mail**?",
    kind:"email", placeholder:"Ex: joao@gmail.com",
    validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : "E-mail inválido. Ex: nome@gmail.com",
    save: (v,d) => ({ ...d, email:v.trim().toLowerCase() }),
    next: () => "telefone",
  },

  telefone: {
    ask: () => "Qual é o seu **telefone** com DDD?",
    kind:"tel", placeholder:"Ex: (34) 9 9993-2167",
    validate: v => {
      const n = v.replace(/\D/g,"");
      if (n.length < 10) return "Coloque o DDD. Ex: (34) 9 9993-2167";
      if (n.length > 11) return "Número muito longo.";
      return null;
    },
    save: (v,d) => ({ ...d, telefone:v }),
    next: () => "objetivo",
  },

  objetivo: {
    ask: () => "É o seu **primeiro emprego**?",
    kind:"options", options:["Sim","Não"],
    save: (v,d) => ({ ...d, objetivo: v === "Sim" ? "Primeiro emprego" : "Mudar de emprego" }),
    next: v => v === "Sim" ? "edu_nivel" : "exp_empresa",
  },

  // ── Experiência ─────────────────────────────────────────────────────────────
  exp_empresa: {
    ask: d => {
      const n = d.experiencias.length;
      if (n === 0) return "Qual foi a **última empresa** onde você trabalhou?";
      if (n === 1) return "E a **empresa anterior** a essa?";
      return `E a **${n + 1}ª empresa**?`;
    },
    kind:"text", placeholder:"Ex: Supermercado Atacadão",
    shortcuts: d => d.experiencias.length > 0
      ? [{ label:"Não, só essas", value:PULAR }]
      : [],
    save: (v,d) => v === PULAR ? d : { ...d, _exp:{ empresa:v } },
    next: v => v === PULAR ? "edu_nivel" : "exp_cargo",
  },

  exp_cargo: {
    ask: () => "Qual era o seu **cargo**?",
    kind:"text", placeholder:"Ex: Vendedor, Caixa, Auxiliar...",
    suggestions: CARGOS.map(c => ({ label:c, value:c })),
    validate: v => v.trim().length < 2 ? "Escreve o cargo!" : null,
    format: toProperCase,
    save: (v,d) => ({ ...d, _exp:{ ...d._exp, cargo:v } }),
    next: () => "exp_inicio",
  },

  exp_inicio: {
    ask: () => "Em que **mês e ano** você começou?",
    kind:"month-year",
    monthYearOpts:{ dontRemember:true },
    save: (v,d) => ({ ...d, _exp:{ ...d._exp, inicio:v } }),
    next: () => "exp_fim",
  },

  exp_fim: {
    ask: () => "Quando você **saiu** (ou ainda está lá)?",
    kind:"month-year",
    monthYearOpts:{ today:true, dontRemember:true },
    save: (v,d) => ({ ...d, _exp:{ ...d._exp, fim:v } }),
    next: () => "exp_desc",
  },

  exp_desc: {
    ask: () => "O que você fazia no dia a dia?",
    kind:"textarea", placeholder:"Ex: Atendimento ao cliente, operação de caixa e controle de estoque",
    allowEmpty:true,
    shortcuts:[{ label:"Pular", value:PULAR }],
    save: (v,d) => {
      const desc = v === PULAR ? "" : v;
      return {
        ...d,
        experiencias:[ ...d.experiencias, { empresa:d._exp.empresa??"", cargo:d._exp.cargo??"", inicio:d._exp.inicio??"", fim:d._exp.fim??"", descricao:desc } ],
        _exp:{},
      };
    },
    next: (_, d) => d.experiencias.length >= 3 ? "edu_nivel" : "exp_empresa",
  },

  // ── Formação ────────────────────────────────────────────────────────────────
  edu_nivel: {
    ask: d => d.formacoes.length === 0
      ? "Qual é a sua **escolaridade**?"
      : "Tem **mais alguma formação**?",
    kind:"options",
    options:["Ensino Fundamental","Ensino Médio","Superior | Faculdade","Prefiro não informar"],
    save: (v,d) => {
      if (v === "Prefiro não informar") return d;
      return { ...d, _edu:{ ...d._edu, nivel:v } };
    },
    next: v => {
      if (v === "Prefiro não informar")                              return "curso_tecnico";
      if (v === "Ensino Fundamental" || v === "Ensino Médio")        return "edu_inst";
      return "edu_curso_nome";
    },
  },

  edu_curso_nome: {
    ask: d => {
      const n = d._edu.nivel ?? "";
      if (/tecnico/i.test(n)) return "Qual é o **nome do curso técnico**?";
      if (/pos|mba/i.test(n)) return "Qual é a **especialização ou MBA**?";
      return "Qual é o seu **curso**?";
    },
    kind:"text", placeholder:"Ex: Administração de Empresas",
    shortcuts:[{ label:"Pular", value:PULAR }],
    validate: v => v === PULAR ? null : v.trim().length < 2 ? "Escreve o nome do curso!" : null,
    format: v => v === PULAR ? v : toProperCase(v),
    save: (v,d) => v === PULAR ? d : { ...d, _edu:{ ...d._edu, curso:v } },
    next: () => "edu_inst",
  },

  edu_inst: {
    ask: d => {
      const n = d._edu.nivel ?? "";
      if (/superior|faculdade|pos|mba/i.test(n)) return "Em qual **faculdade**?";
      return "Em qual **escola** você estudou?";
    },
    kind:"text", placeholder:"Ex: Uniube, SENAI, Escola Estadual...",
    validate: v => v.trim().length < 2 ? "Escreve o nome da escola!" : null,
    format: toProperCase,
    save: (v,d) => ({ ...d, _edu:{ ...d._edu, instituicao:v } }),
    next: () => "edu_conclusao",
  },

  edu_conclusao: {
    ask: () => "Em que **ano** concluiu (ou vai concluir)?",
    kind:"year-pick",
    save: (v,d) => ({
      ...d,
      formacoes:[
        ...d.formacoes,
        { nivel:d._edu.nivel??"", curso:d._edu.curso??"", instituicao:d._edu.instituicao??"", conclusao:v },
      ],
      _edu:{},
    }),
    next: () => "edu_confirma",
  },

  edu_confirma: {
    ask: d => {
      const f = d.formacoes[d.formacoes.length - 1];
      const titulo = [f.nivel, f.curso].filter(Boolean).join(" - ");
      return `Anotado! **${f.instituicao}** - ${titulo} (${f.conclusao})\n\nTem **mais alguma formação**?`;
    },
    kind:"options", options:["Sim, tenho mais","Não, pode continuar"],
    next: v => v.startsWith("Sim") ? "edu_nivel" : "curso_tecnico",
  },

  // ── Cursos técnicos / profissionalizantes ────────────────────────────────────
  curso_tecnico: {
    ask: () => "Tem algum **curso técnico** ou profissionalizante?",
    kind:"options", options:["Sim, tenho","Não, próxima"],
    next: v => v.startsWith("Sim") ? "curso_nome" : "cnh",
  },

  curso_nome: {
    ask: () => "Qual é o nome do **curso**?",
    kind:"text", placeholder:"Ex: Técnico em Elétrica, Informática...",
    validate: v => v.trim().length < 2 ? "Escreve o nome do curso!" : null,
    format: toProperCase,
    save: (v,d) => ({ ...d, _edu:{ nivel:"Curso", curso:v } }),
    next: () => "curso_inst",
  },

  curso_inst: {
    ask: () => "Em qual **instituição**?",
    kind:"text", placeholder:"Ex: SENAI, SENAC, escola particular...",
    validate: v => v.trim().length < 2 ? "Escreve a instituição!" : null,
    format: toProperCase,
    save: (v,d) => ({ ...d, _edu:{ ...d._edu, instituicao:v } }),
    next: () => "curso_conclusao",
  },

  curso_conclusao: {
    ask: () => "Em que **ano** concluiu?",
    kind:"year-pick",
    save: (v,d) => ({
      ...d,
      formacoes:[...d.formacoes, { nivel:d._edu.nivel??"Curso", curso:d._edu.curso??"", instituicao:d._edu.instituicao??"", conclusao:v }],
      _edu:{},
    }),
    next: () => "curso_confirma",
  },

  curso_confirma: {
    ask: () => "Tem **mais algum curso**?",
    kind:"options", options:["Sim, tenho mais","Não, próxima"],
    next: v => v.startsWith("Sim") ? "curso_nome" : "cnh",
  },

  // ── CNH ─────────────────────────────────────────────────────────────────────
  cnh: {
    ask: () => "Você tem **CNH**?",
    kind:"options",
    options:[
      "Não tenho CNH",
      "Cat. A - moto",
      "Cat. B - carro",
      "Cat. AB - moto e carro",
      "Cat. C - caminhão",
      "Cat. D/E - ônibus ou carreta",
    ],
    save: (v,d) => v === "Não tenho CNH" ? d : { ...d, cnh: v },
    next: () => "habilidades",
  },

  // ── Habilidades ─────────────────────────────────────────────────────────────
  habilidades: {
    ask: () => "Quais são as suas **habilidades**?\nSelecione ou escreva.",
    kind:"multi-select", allowEmpty:true,
    save: (v,d) => {
      const parts = [d.habilidades, v].filter(Boolean);
      return { ...d, habilidades:parts.join(", ") };
    },
    next: () => "idioma_ingles",
  },

  // ── Idiomas ─────────────────────────────────────────────────────────────────
  idioma_ingles: {
    ask: () => "Você fala **inglês**?",
    kind:"options", options:["Sim, falo inglês","Não falo inglês"],
    next: v => v.startsWith("Sim") ? "idioma_ingles_nivel" : "idioma_outro",
  },

  idioma_ingles_nivel: {
    ask: () => "Qual é o seu **nível de inglês**?",
    kind:"options", options:["Básico","Intermediário","Avançado","Fluente"],
    save: (v,d) => appendIdioma(d,"Inglês",v),
    next: () => "idioma_outro",
  },

  idioma_outro: {
    ask: () => "Fala algum **outro idioma**?",
    kind:"options", options:["Sim, tenho outro","Não, só esse"],
    next: v => v.startsWith("Sim") ? "idioma_outro_nome" : FIM,
  },

  idioma_outro_nome: {
    ask: () => "Qual **idioma** é esse?",
    kind:"text", placeholder:"Ex: Italiano, Francês, Libras...",
    validate: v => v.trim().length < 2 ? "Escreve o nome do idioma!" : null,
    format: toProperCase,
    save: (v,d) => ({ ...d, _idiomaAtual:v }),
    next: () => "idioma_outro_nivel",
  },

  idioma_outro_nivel: {
    ask: d => `Qual é o seu **nível** de ${d._idiomaAtual || "idioma"}?`,
    kind:"options", options:["Básico","Intermediário","Avançado","Fluente"],
    save: (v,d) => appendIdioma(d,d._idiomaAtual,v),
    next: () => FIM,
  },
};

// ─── Progresso ────────────────────────────────────────────────────────────────
const STEP_ORDER = [
  "intro","nome","nascimento","estado_civil","cep","cep_numero","cidade","estado",
  "email","telefone","objetivo",
  "exp_empresa","exp_cargo","exp_inicio","exp_fim","exp_desc",
  "edu_nivel","edu_curso_nome","edu_inst","edu_conclusao","edu_confirma",
  "curso_tecnico","curso_nome","curso_inst","curso_conclusao","curso_confirma",
  "cnh","habilidades",
  "idioma_ingles","idioma_ingles_nivel","idioma_outro","idioma_outro_nome","idioma_outro_nivel",
];
const calcProgress = (id: string) => {
  const i = STEP_ORDER.indexOf(id);
  if (i <= 0) return 0;
  return Math.round((i / (STEP_ORDER.length - 1)) * 100);
};

// ─── Markdown simples ─────────────────────────────────────────────────────────
function BotText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, li) => (
        <span key={li}>
          {li > 0 && <br />}
          {line.replace(/^_|_$/g, "").split(/\*\*(.*?)\*\*/g).map((chunk, ci) =>
            ci % 2 === 1 ? <strong key={ci}>{chunk}</strong> : chunk
          )}
        </span>
      ))}
    </>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
interface Msg { from:"bot"|"user"; text:string }

export function CurriculoBot() {
  const fd = freshData();
  const { subscribed } = useEntitlement();
  const [msgs,       setMsgs]       = useState<Msg[]>([{ from:"bot", text:STEPS.intro.ask(fd) }]);
  const [data,       setData]       = useState<BotData>(fd);
  const [stepId,     setStepId]     = useState("intro");
  const [inputVal,   setInputVal]   = useState("");
  const [showPix,    setShowPix]    = useState(false);
  const [genPDF,     setGenPDF]     = useState(false);
  const [rawData,    setRawData]    = useState<BotData | null>(null);
  const [sending,    setSending]    = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [askRestart, setAskRestart] = useState(false);

  const [pickDay,      setPickDay]      = useState("01");
  const [pickMonth,    setPickMonth]    = useState("01");
  const [pickYear,     setPickYear]     = useState(String(new Date().getFullYear() - 25));
  const [pickExpMonth, setPickExpMonth] = useState("01");
  const [pickExpYear,  setPickExpYear]  = useState(String(new Date().getFullYear()));
  const [pickEduYear,  setPickEduYear]  = useState(String(new Date().getFullYear()));
  const [pickSingle,   setPickSingle]   = useState("");
  const [cepInput,     setCepInput]     = useState("");
  const [pickTyped,    setPickTyped]    = useState("");
  const [selHab,       setSelHab]       = useState<Set<string>>(new Set());
  const [customHab,    setCustomHab]    = useState("");

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const step     = STEPS[stepId] ?? STEPS.intro;
  const progress = calcProgress(stepId);
  const resolvedShortcuts = typeof step.shortcuts === "function"
    ? step.shortcuts(data)
    : (step.shortcuts ?? []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  useEffect(() => {
    if (step.kind === "text" || step.kind === "email" || step.kind === "tel")
      setTimeout(() => inputRef.current?.focus(), 460);
    else if (step.kind === "textarea")
      setTimeout(() => textareaRef.current?.focus(), 460);
  }, [stepId, step.kind]);

  // Reinicia os valores padrão dos seletores ao entrar num passo novo. Feito
  // durante a renderização (padrão recomendado do React), evitando setState em
  // efeito e o re-render extra que ele causaria.
  const prevStepId = useRef(stepId);
  if (prevStepId.current !== stepId) {
    prevStepId.current = stepId;
    if (step.kind === "month-year")   { setPickExpMonth("01"); setPickExpYear(String(new Date().getFullYear())); }
    if (step.kind === "year-pick")    { setPickEduYear(String(new Date().getFullYear())); }
    if (step.kind === "date-dmy")     { setPickDay("01"); setPickMonth("01"); setPickYear(String(new Date().getFullYear()-25)); setPickTyped(""); }
    if (step.kind === "cep")          { setCepInput(""); }
    if (step.kind === "multi-select") { setSelHab(new Set()); setCustomHab(""); }
    if (step.kind === "select-single"){ setPickSingle(step.options?.[0] ?? ""); }
  }

  function doRestart() {
    const f = freshData();
    setMsgs([{ from:"bot", text:STEPS.intro.ask(f) }]);
    setData(f); setStepId("intro"); setInputVal("");
    setSending(false); setAskRestart(false); setRawData(null);
  }

  // Monta o CurriculoData a partir dos dados crus, sobrepondo o que a IA corrigiu.
  function montarCurriculo(raw: BotData, fixed: ReviewFix = {}): CurriculoData {
    return {
      nome:        fixed.nome        || raw.nome,
      nascimento:  raw.nascimento,
      estadoCivil: fixed.estadoCivil || raw.estadoCivil,
      email:       raw.email,
      telefone:    raw.telefone,
      cidade:      fixed.cidade      || raw.cidade,
      estado:      fixed.estado      || raw.estado,
      logradouro:  fixed.logradouro  || raw.logradouro,
      numero:      raw.numero,
      bairro:      fixed.bairro      || raw.bairro,
      linkedin:    "",
      github:      "",
      objetivo:    fixed.objetivo    || "",
      experiencias: fixed.experiencias ?? raw.experiencias,
      formacoes:    fixed.formacoes   ?? raw.formacoes,
      habilidades:  fixed.habilidades  || raw.habilidades,
      idiomas:      fixed.idiomas      || raw.idiomas,
      cnh:          raw.cnh || undefined,
    };
  }

  // No fim do bot: guarda os dados e segue para pagamento (ou gera direto, se assinante).
  function finalizar(raw: BotData) {
    setRawData(raw);
    const primeiro = raw.nome.split(" ")[0];
    if (subscribed) {
      setMsgs(p => [...p, { from:"bot", text:`Pronto, **${primeiro}**! Como voce e assinante, vou gerar agora.` }]);
      setTimeout(() => entregar(raw, SUBSCRIBER_ORDER), 600);
    } else {
      setMsgs(p => [...p, { from:"bot", text:`Pronto, **${primeiro}**! Seu curriculo esta completo.\n\nPague **R$ 5,00** via PIX e o PDF fica disponivel na hora.` }]);
      setTimeout(() => setShowPix(true), 800);
    }
  }

  // Após o pagamento: a IA revisa os dados (agora protegida pelo orderId) e gera o PDF.
  async function entregar(raw: BotData, orderId: string) {
    setShowPix(false);
    setGenPDF(true);
    try {
      let currData = montarCurriculo(raw);
      try {
        const res = await fetch("/api/curriculo-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: raw, orderId }),
        });
        if (res.ok) {
          const fixed = await res.json();
          if (fixed && typeof fixed === "object") currData = montarCurriculo(raw, fixed);
        }
      } catch {
        /* usa os dados crus se a revisão falhar */
      }
      const html = buildCurriculoHTML(currData);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url  = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } finally {
      setGenPDF(false);
    }
  }

  const advance = useCallback((rawAnswer: string) => {
    if (sending) return;
    const answer = step.format ? step.format(rawAnswer) : rawAnswer;

    if (step.validate) {
      const err = step.validate(answer, data);
      if (err) {
        setSending(true);
        setMsgs(p => [...p, { from:"user", text:rawAnswer }]);
        setInputVal("");
        setTimeout(() => { setMsgs(p => [...p, { from:"bot", text:`Atencao: ${err}` }]); setSending(false); }, 300);
        return;
      }
    }

    setSending(true);
    const newData = step.save ? step.save(answer, data) : data;
    setData(newData);
    setMsgs(p => [...p, { from:"user", text:rawAnswer }]);
    setInputVal("");

    const nextId = step.next(answer, newData);

    if (nextId === FIM) {
      setSending(false);
      finalizar(newData);
      return;
    }

    setStepId(nextId);
    setTimeout(() => {
      setMsgs(p => [...p, { from:"bot", text:STEPS[nextId].ask(newData) }]);
      setSending(false);
    }, 380);
  }, [data, step, stepId, sending]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = inputVal.trim();
    if (v) advance(v);
    else if (step.allowEmpty) advance("");
  }

  async function handleCEPLookup() {
    const clean = cepInput.replace(/\D/g,"");
    if (clean.length !== 8) {
      setMsgs(p => [...p, { from:"user", text:formatCEP(cepInput) }, { from:"bot", text:"CEP invalido. Precisa ter 8 numeros." }]);
      setCepInput(""); return;
    }
    setCepLoading(true);
    setMsgs(p => [...p, { from:"user", text:formatCEP(clean) }]);
    setCepInput("");
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const json = await res.json();
      if (json.erro) {
        setTimeout(() => { setMsgs(p => [...p, { from:"bot", text:"CEP nao encontrado. Tenta outro ou clique em **Pular**." }]); setCepLoading(false); }, 300);
        return;
      }
      const nd: BotData = { ...data, cep:clean, logradouro:json.logradouro||"", bairro:json.bairro||"", cidade:json.localidade||"", estado:json.uf||"" };
      setData(nd);
      setStepId("cep_numero");
      setTimeout(() => { setMsgs(p => [...p, { from:"bot", text:STEPS.cep_numero.ask(nd) }]); setCepLoading(false); }, 500);
    } catch {
      setTimeout(() => { setMsgs(p => [...p, { from:"bot", text:"Nao consegui buscar o CEP. Verifica a internet ou clique em **Pular**." }]); setCepLoading(false); }, 300);
    }
  }

  function submitTypedDate() {
    const v = pickTyped.trim();
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const ok = m && +m[1] >= 1 && +m[1] <= 31 && +m[2] >= 1 && +m[2] <= 12
      && +m[3] >= 1900 && +m[3] <= new Date().getFullYear();
    if (!ok) {
      setSending(true);
      setMsgs(p => [...p, { from:"user", text: v || "(vazio)" }]);
      setPickTyped("");
      setTimeout(() => {
        setMsgs(p => [...p, { from:"bot", text:"Atencao: data invalida. Use DD/MM/AAAA, ex: 12/06/1988." }]);
        setSending(false);
      }, 300);
      return;
    }
    advance(v);
  }

  function handleHabilidadesSubmit() {
    const custom = customHab.trim().split(",").map(s=>s.trim()).filter(Boolean);
    const all    = [...Array.from(selHab), ...custom];
    advance(all.join(", "));
  }


  // ─── Estilos ──────────────────────────────────────────────────────────────
  const btnOpt  = "w-full text-left bg-secondary hover:bg-primary/10 disabled:opacity-50 border border-border hover:border-primary/60 text-foreground text-[15px] font-semibold py-3 px-4 rounded-2xl transition-colors";
  const inpCls  = "flex-1 rounded-2xl border border-input bg-secondary px-4 py-3 text-base font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";
  const selCls  = "flex-1 rounded-xl border border-input bg-secondary px-3 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
  const btnSend = "w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0";
  const btnSkip = "flex-1 text-[13px] font-medium py-2 rounded-xl border border-dashed border-muted-foreground/30 bg-transparent text-muted-foreground/70 hover:border-primary/50 hover:text-primary/80 disabled:opacity-40 transition-colors";
  const btnLink = "text-[13px] font-medium py-1.5 px-4 rounded-full border border-dashed border-muted-foreground/30 bg-transparent text-muted-foreground/70 hover:border-primary/50 hover:text-primary/80 disabled:opacity-40 transition-colors";

  return (
    <>
      {genPDF && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl mx-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="font-bold text-lg">Preparando seu curriculo...</p>
          </div>
        </div>
      )}

      {showPix && rawData && (
        <PixModal
          serviceId="curriculo"
          amount={5.00}
          description="Curriculo PDF - LanhouseDigital"
          onClose={() => setShowPix(false)}
          onConfirm={(orderId) => entregar(rawData, orderId)}
        />
      )}

      <div className="flex flex-col flex-1 min-h-0">

        {/* Barra de progresso */}
        <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Progresso</span>
              <span className="font-bold text-primary">{progress}%</span>
            </div>
            {stepId !== "intro" && (
              <div className="flex items-center gap-2">
                {askRestart ? (
                  <>
                    <span className="text-xs text-muted-foreground">Tem certeza?</span>
                    <button onClick={doRestart} className="text-xs font-bold text-red-500 hover:underline">Sim</button>
                    <button onClick={() => setAskRestart(false)} className="text-xs text-muted-foreground hover:underline">Nao</button>
                  </>
                ) : (
                  <button onClick={() => setAskRestart(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <RotateCcw className="h-3 w-3" /> Recomecar
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width:`${progress}%` }} />
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3 bg-gray-50 relative z-0">
          {msgs.map((msg, i) => (
            <div key={i} className={`flex items-end gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
              {msg.from === "bot" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mb-0.5">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
                msg.from === "bot" ? "bg-white text-foreground rounded-bl-sm" : "bg-primary text-white rounded-br-sm"
              }`}>
                {msg.from === "bot" ? <BotText text={msg.text} /> : msg.text}
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
                  {[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay:`${i*0.15}s` }} />)}
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Área de input */}
        <div className="px-3 sm:px-4 py-3 bg-white border-t border-border space-y-2 relative z-10">

          {step.kind === "action" && (
            <button onClick={() => advance(step.action ?? "ok")} disabled={sending}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold text-base py-4 rounded-2xl transition-colors shadow-sm">
              {step.action}
            </button>
          )}

          {step.kind === "options" && (
            <div className="flex flex-col gap-2">
              {step.options?.map(opt => (
                <button key={opt} onClick={() => advance(opt)} disabled={sending} className={btnOpt}>{opt}</button>
              ))}
            </div>
          )}

          {step.kind === "uf" && (
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
              {UF.map(uf => (
                <button key={uf} onClick={() => advance(uf)} disabled={sending}
                  className="bg-secondary hover:bg-primary hover:text-white disabled:opacity-50 border border-border hover:border-primary text-sm font-bold py-2 rounded-xl transition-colors">
                  {uf}
                </button>
              ))}
            </div>
          )}

          {step.kind === "date-dmy" && (
            <>
              <form onSubmit={e => { e.preventDefault(); submitTypedDate(); }} className="flex gap-2">
                <input type="text" inputMode="numeric" value={pickTyped}
                  onChange={e => setPickTyped(formatDateTyped(e.target.value))}
                  placeholder="Digite: 12/06/1988" maxLength={10} autoComplete="off" className={inpCls} />
                <button type="submit" disabled={sending || pickTyped.replace(/\D/g,"").length < 8} className={btnSend}>
                  <Send className="h-5 w-5" />
                </button>
              </form>
              <p className="text-center text-xs text-muted-foreground">ou selecione abaixo</p>
              <div className="flex gap-2">
                <select value={pickDay}   onChange={e => setPickDay(e.target.value)}   className={selCls}>
                  {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={pickMonth} onChange={e => setPickMonth(e.target.value)} className={selCls}>
                  {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
                <select value={pickYear}  onChange={e => setPickYear(e.target.value)}  className={selCls}>
                  {ANOS_NASC.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={() => advance(`${pickDay}/${pickMonth}/${pickYear}`)} disabled={sending} className={btnSend}>
                  <Check className="h-5 w-5" />
                </button>
              </div>
              {resolvedShortcuts.map(s => (
                <button key={s.label} onClick={() => advance(s.value)} disabled={sending} className={btnSkip}>{s.label}</button>
              ))}
            </>
          )}

          {step.kind === "select-single" && (
            <div className="flex gap-2">
              <select value={pickSingle} onChange={e => setPickSingle(e.target.value)} className={selCls}>
                {step.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <button onClick={() => advance(pickSingle)} disabled={sending || !pickSingle} className={btnSend}>
                <Check className="h-5 w-5" />
              </button>
            </div>
          )}

          {step.kind === "cep" && (
            <>
              <form onSubmit={e => { e.preventDefault(); handleCEPLookup(); }} className="flex gap-2">
                <input type="text" inputMode="numeric" value={cepInput}
                  onChange={e => setCepInput(formatCEP(e.target.value))}
                  placeholder={step.placeholder} maxLength={9} className={inpCls} />
                <button type="submit" disabled={cepLoading || sending || cepInput.replace(/\D/g,"").length < 8} className={btnSend}>
                  {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </form>
              {resolvedShortcuts.map(s => (
                <button key={s.label} onClick={() => advance(s.value)} disabled={sending || cepLoading} className={btnSkip}>{s.label}</button>
              ))}
            </>
          )}

          {step.kind === "month-year" && (
            <>
              <div className="flex gap-2">
                <select value={pickExpMonth} onChange={e => setPickExpMonth(e.target.value)} className={selCls}>
                  {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
                <select value={pickExpYear}  onChange={e => setPickExpYear(e.target.value)}  className={selCls}>
                  {ANOS_EXP.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={() => advance(`${pickExpMonth}/${pickExpYear}`)} disabled={sending} className={btnSend}>
                  <Check className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-2">
                {step.monthYearOpts?.today && (
                  <button onClick={() => advance("Ate hoje")} disabled={sending} className={btnSkip}>Até hoje</button>
                )}
                {step.monthYearOpts?.dontRemember && (
                  <button onClick={() => advance("Nao lembro")} disabled={sending} className={btnSkip}>Não lembro</button>
                )}
              </div>
            </>
          )}

          {step.kind === "year-pick" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select value={pickEduYear} onChange={e => setPickEduYear(e.target.value)} className={selCls}>
                  {ANOS_CONC.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={() => advance(pickEduYear)} disabled={sending} className={btnSend}>
                  <Check className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => advance("Cursando")}    disabled={sending} className={btnSkip}>Cursando</button>
                <button onClick={() => advance("Nao lembro")} disabled={sending} className={btnSkip}>Não lembro</button>
              </div>
            </div>
          )}

          {step.kind === "multi-select" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto rounded-2xl border border-border p-2.5 bg-secondary/30">
                {HAB_COMUNS.map(h => {
                  const on = selHab.has(h.v);
                  return (
                    <button key={h.v}
                      onClick={() => setSelHab(prev => { const n = new Set(prev); if (on) n.delete(h.v); else n.add(h.v); return n; })}
                      className={`text-left text-[13px] font-semibold px-3 py-2.5 rounded-xl border transition-colors leading-tight ${on ? "bg-primary text-white border-primary" : "bg-white border-border hover:border-primary/50"}`}>
                      {on ? "✓ " : ""}{h.l}
                    </button>
                  );
                })}
              </div>
              <input value={customHab} onChange={e => setCustomHab(e.target.value)}
                placeholder="Outros (ex: Libras, Eletricista...)"
                className="w-full rounded-2xl border border-input bg-secondary px-4 py-2.5 text-base font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              <button onClick={handleHabilidadesSubmit} disabled={sending}
                className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                <Check className="h-4 w-4" />
                {selHab.size > 0 || customHab.trim()
                  ? `Confirmar ${selHab.size + (customHab.trim() ? 1 : 0)} habilidade${(selHab.size + (customHab.trim() ? 1 : 0)) !== 1 ? "s" : ""}`
                  : "Pular"}
              </button>
            </div>
          )}

          {(step.kind === "text" || step.kind === "email" || step.kind === "tel") && (
            <>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input ref={inputRef}
                  type={step.kind === "text" ? "text" : step.kind}
                  inputMode={step.kind === "tel" ? "numeric" : undefined}
                  value={inputVal}
                  onChange={e => setInputVal(step.kind === "tel" ? formatPhone(e.target.value) : e.target.value)}
                  placeholder={step.placeholder} autoComplete="off" className={inpCls} />
                <button type="submit" disabled={!inputVal.trim() || sending} className={btnSend}>
                  <Send className="h-5 w-5" />
                </button>
              </form>
              {step.suggestions && (
                <div className="flex flex-wrap gap-1.5">
                  {step.suggestions.map(s => (
                    <button key={s.label} onClick={() => setInputVal(s.value)}
                      className="text-xs bg-secondary border border-border rounded-xl px-2.5 py-1.5 hover:border-primary/60 hover:bg-primary/5 transition-colors">
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              {resolvedShortcuts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {resolvedShortcuts.map(s => (
                    <button key={s.label} onClick={() => advance(s.value)} disabled={sending} className={btnLink}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step.kind === "textarea" && (
            <>
              <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <textarea ref={textareaRef} rows={3}
                  value={inputVal} onChange={e => setInputVal(e.target.value)}
                  placeholder={step.placeholder}
                  className="w-full rounded-2xl border border-input bg-secondary px-4 py-3 text-base font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
                <button type="submit" disabled={!inputVal.trim() && !step.allowEmpty} className="w-full py-3 rounded-2xl bg-primary text-white font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" /> Enviar
                </button>
              </form>
              {resolvedShortcuts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {resolvedShortcuts.map(s => (
                    <button key={s.label} onClick={() => advance(s.value)} disabled={sending}
                      className={btnSkip}>{s.label}</button>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}

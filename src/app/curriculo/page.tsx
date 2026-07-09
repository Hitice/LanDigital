import type { Metadata } from "next";
import { CurriculoBot } from "./CurriculoBot";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Criador de Currículo · LanhouseDigital",
  description: "Responda as perguntas e gere um currículo profissional em PDF por apenas R$ 5,00.",
};

export default function CurriculoPage() {
  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Header />
      <CurriculoBot />
    </div>
  );
}

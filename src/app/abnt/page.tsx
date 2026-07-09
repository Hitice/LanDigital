import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { AbntForm } from "./AbntForm";

export const metadata: Metadata = {
  title: "Formatação ABNT · LanhouseDigital",
  description: "Cole seu texto e receba o trabalho formatado nas normas ABNT em PDF.",
};

export default function AbntPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AbntForm />
    </div>
  );
}

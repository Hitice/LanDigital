import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { OrganizadorTool } from "./OrganizadorTool";

export const metadata: Metadata = {
  title: "Organizador de Documentos · LanhouseDigital",
  description: "Fotografe um documento e receba uma versão digital organizada em PDF, pronta para imprimir e enviar.",
};

export default function OrganizadorPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <OrganizadorTool />
    </div>
  );
}

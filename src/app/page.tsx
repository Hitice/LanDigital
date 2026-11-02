import { Header } from "@/components/Header";
import { ServicesAccordion } from "@/components/ServicesAccordion";
import { Monitor } from "lucide-react";
import { BUSINESS, formatCnpj } from "@/lib/config";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero enxuto */}
      <section className="border-b border-border bg-secondary/30 px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Lanhouse <span className="text-primary">Digital</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Escolha um serviço, pague com PIX e receba na hora.
          </p>
        </div>
      </section>

      {/* Serviços, em categorias expansíveis */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <ServicesAccordion />
        </div>
      </section>

      {/* Footer */}
      <footer
        id="contato"
        className="border-t border-border bg-secondary/40 px-4 py-8"
      >
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Monitor className="h-5 w-5 text-primary" />
            LanhouseDigital
          </div>
          <p>{BUSINESS.legalName} · CNPJ {formatCnpj(BUSINESS.cnpj)} · Pagamentos via PIX</p>
          <p>© {new Date().getFullYear()} Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}

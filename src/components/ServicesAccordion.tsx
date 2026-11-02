"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { services, serviceCategories } from "@/lib/services";
import { ServiceCard } from "@/components/ServiceCard";

export function ServicesAccordion() {
  // Conjunto de categorias abertas. Vazio = todas fechadas (padrão).
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {serviceCategories.map((cat) => {
        const items = services.filter((s) => s.category === cat.id);
        if (items.length === 0) return null;
        const isOpen = open.has(cat.id);
        const CatIcon = cat.icon;
        return (
          <div key={cat.id} className="rounded-2xl border border-border bg-white overflow-hidden">
            <button
              onClick={() => toggle(cat.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-secondary/40 transition-colors"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <CatIcon className="h-5 w-5 text-primary" />
              </span>
              <span className="flex-1">
                <span className="block font-bold text-foreground">{cat.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "serviço" : "serviços"}
                </span>
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen && (
              <div className="grid gap-4 px-4 pb-4 pt-1 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

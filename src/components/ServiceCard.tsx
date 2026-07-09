import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, ExternalLink, Clock, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Service } from "@/lib/services";

function priceLabel(price: number | null): string {
  if (price === null) return "Grátis";
  return `R$ ${price.toFixed(2).replace(".", ",")}`;
}

export function ServiceCard({ service }: { service: Service }) {
  const Icon = service.icon;
  const disabled = !service.available;

  const cta =
    service.mode === "redirect"
      ? { label: "Ir para o portal", icon: ExternalLink }
      : service.mode === "assisted"
        ? { label: "Solicitar", icon: MessageCircle }
        : { label: "Acessar serviço", icon: ArrowRight };
  const CtaIcon = cta.icon;

  return (
    <Card
      className={cn(
        "group flex flex-col transition-all duration-200",
        disabled ? "opacity-60" : "hover:shadow-lg hover:border-primary/40",
      )}
    >
      <CardHeader className="pb-3">
        <div className="mb-3 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{service.title}</CardTitle>
          <Badge variant="secondary" className="shrink-0 text-primary font-semibold">
            {priceLabel(service.price)}
          </Badge>
        </div>
        <CardDescription className="text-sm leading-relaxed">{service.description}</CardDescription>
      </CardHeader>

      <CardContent className="mt-auto pt-0">
        {disabled ? (
          <span className="flex items-center justify-center gap-2 w-full rounded-md border border-dashed border-muted-foreground/30 py-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" /> Em breve
          </span>
        ) : (
          <Link
            href={service.href}
            className={cn(
              buttonVariants({ variant: "default", size: "default" }),
              "w-full justify-center bg-primary hover:bg-primary/90 text-white",
            )}
          >
            {cta.label} <CtaIcon className="ml-2 h-4 w-4" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

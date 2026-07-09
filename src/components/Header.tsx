"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Monitor, User, Crown, ArrowLeft } from "lucide-react";

interface Me {
  authenticated: boolean;
  name?: string | null;
  subscribed?: boolean;
}

export function Header() {
  const [me, setMe] = useState<Me | null>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ authenticated: false }));
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {!isHome && (
            <Link href="/" aria-label="Voltar ao início"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-primary transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          <Link href="/" className="flex items-center gap-2 font-bold text-primary text-xl">
            <Monitor className="h-6 w-6" />
            <span>Lanhouse<span className="text-foreground">Digital</span></span>
          </Link>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/" className="hidden sm:inline hover:text-primary transition-colors">Serviços</Link>

          {me?.authenticated ? (
            <Link href="/conta" className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 hover:border-primary hover:text-primary transition-colors">
              {me.subscribed ? <Crown className="h-4 w-4 text-primary" /> : <User className="h-4 w-4" />}
              <span className="max-w-[120px] truncate">{me.name?.split(" ")[0] ?? "Conta"}</span>
            </Link>
          ) : (
            <Link href="/conta" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 font-semibold text-white hover:bg-primary/90 transition-colors">
              <User className="h-4 w-4" /> Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

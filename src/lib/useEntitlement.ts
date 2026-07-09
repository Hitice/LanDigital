"use client";

import { useEffect, useState } from "react";

export interface Entitlement {
  loading: boolean;
  authenticated: boolean;
  subscribed: boolean;
}

// Lê o status de assinatura do usuário (via /api/me) para o cliente decidir
// se mostra o pagamento ou libera direto (assinante).
export function useEntitlement(): Entitlement {
  const [state, setState] = useState<Entitlement>({
    loading: true,
    authenticated: false,
    subscribed: false,
  });

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (active) setState({ loading: false, authenticated: !!d.authenticated, subscribed: !!d.subscribed });
      })
      .catch(() => {
        if (active) setState({ loading: false, authenticated: false, subscribed: false });
      });
    return () => { active = false; };
  }, []);

  return state;
}

// orderId sentinela para quando a entrega é liberada pela assinatura (não por cobrança).
export const SUBSCRIBER_ORDER = "subscriber";

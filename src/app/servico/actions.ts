"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

// Salva a UF do usuário (serviços estaduais) e volta para a página do serviço.
export async function salvarUf(formData: FormData) {
  const uf = String(formData.get("uf") ?? "").toUpperCase().slice(0, 2);
  const slug = String(formData.get("slug") ?? "");
  const session = await auth();

  if (session?.user?.email) {
    try {
      // UF de 2 letras define; vazio limpa (botão "Trocar").
      await supabaseAdmin()
        .from("app_users")
        .update({ uf: uf.length === 2 ? uf : null })
        .eq("email", session.user.email);
    } catch (e) {
      console.error("[salvarUf]", e);
    }
  }

  redirect(`/servico/${slug}`);
}

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [Google],
  callbacks: {
    // No primeiro login, cria/atualiza o usuário no Supabase e guarda o id no token.
    async jwt({ token, account, profile }) {
      if (account && profile?.email) {
        try {
          const sb = supabaseAdmin();
          const { data } = await sb
            .from("app_users")
            .upsert(
              {
                email: profile.email,
                name: (profile.name as string) ?? null,
                google_id: (profile.sub as string) ?? null,
              },
              { onConflict: "email" },
            )
            .select("id")
            .single();
          if (data?.id) token.uid = data.id;
        } catch (e) {
          console.error("[auth] upsert app_users:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
});

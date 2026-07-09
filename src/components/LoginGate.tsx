import { loginGoogleTo } from "@/app/conta/actions";
import { LogIn, Lock } from "lucide-react";

// Tela exibida quando um serviço exige login. Volta para `next` após entrar.
export function LoginGate({ next, title }: { next: string; title?: string }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-2xl font-bold">{title ?? "Entre para acessar"}</h1>
      <p className="mt-2 text-muted-foreground">
        Crie sua conta gratuita para usar este serviço. Leva alguns segundos.
      </p>
      <form action={loginGoogleTo} className="mt-8">
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white py-3.5 font-semibold shadow-sm hover:border-primary hover:text-primary transition-colors"
        >
          <LogIn className="h-5 w-5" /> Entrar com Google
        </button>
      </form>
    </main>
  );
}

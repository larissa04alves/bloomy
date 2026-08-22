"use client";

import { GardenBloom } from "./components/GardenBloom";
import { GoogleIcon } from "./components/GoogleIcon";
import { useLogin } from "./hooks/useLogin";

export default function LoginPage() {
  const { pending, signInWithGoogle } = useLogin();

  return (
    <div
      className="flex min-h-dvh justify-center"
      style={{
        background: "radial-gradient(120% 55% at 50% 0%, #EFE6FA, #FBFAFE 62%)",
      }}
    >
      <div className="relative flex w-full max-w-sm flex-col items-center overflow-hidden px-8 pt-12 pb-52 text-center">
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <GardenBloom />
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center gap-3.5">
          <h1 className="animate-rise-in font-display text-6xl font-bold tracking-tight text-ink">
            Bloomy
          </h1>
          <p
            className="animate-rise-in max-w-56 text-sm font-semibold text-ink-read"
            style={{ animationDelay: "0.2s" }}
          >
            Seu dia a dia, com carinho. Corpo, treino e mente num só lugar.
          </p>
          <div
            className="animate-rise-in flex items-center gap-1.5"
            style={{ animationDelay: "0.35s" }}
          >
            <span className="size-2 rounded-full bg-lilac" />
            <span className="size-2 rounded-full bg-pink" />
            <span className="size-2 rounded-full bg-green" />
          </div>
        </div>

        <div className="relative flex w-full flex-col items-center gap-3">
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={pending}
            className="flex w-full items-center justify-center gap-3 rounded-control border border-[#E6DEF2] bg-white py-3.5 text-sm font-bold text-ink shadow-card-sm transition-opacity disabled:opacity-60"
          >
            <GoogleIcon />
            {pending ? "Continuando…" : "Continuar com Google"}
          </button>
          <p className="max-w-64 text-xs text-ink-faint">
            Ao continuar, você concorda com os Termos de Uso e a Política de
            Privacidade do Bloomy.
          </p>
        </div>
      </div>
    </div>
  );
}

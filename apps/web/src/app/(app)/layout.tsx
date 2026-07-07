import { TabBar } from "@/components/tab-bar";

// TODO(F10): reativar o auth-gate quando o login real existir. Enquanto o login
// não é implementado (F10), o gate fica desligado para permitir navegar as telas
// em dev sem sessão. Versão com gate:
//
//   const session = await auth.api.getSession({ headers: await headers() });
//   if (!session) redirect("/login");
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-2">{children}</main>
      <TabBar />
    </div>
  );
}

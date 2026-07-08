import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@bloomy/auth";

import { TabBar } from "@/components/tab-bar";

// TODO(F10): login real. Em desenvolvimento o gate fica desligado para navegar as
// telas sem sessão; em produção ele vale (não deixa as telas abertas até a F10
// entregar o login). Ao implementar a F10, remover o guard de ambiente.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-2">{children}</main>
      <TabBar />
    </div>
  );
}

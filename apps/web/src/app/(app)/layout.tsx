import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@bloomy/auth";
import { db } from "@bloomy/db";

import { TabBar } from "@/components/tab-bar";
import { isOnboarded } from "@/server/onboarding/service";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  // Segundo gate: quem nunca escolheu as metas passa pelo onboarding antes das abas.
  // `isOnboarded` só lê — `ensureProfile` viraria uma escrita a cada navegação.
  if (!(await isOnboarded(db, session.user.id))) redirect("/onboarding");

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col pb-2">{children}</main>
      <TabBar />
    </div>
  );
}

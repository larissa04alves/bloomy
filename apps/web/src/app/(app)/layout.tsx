import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@bloomy/auth";

import { TabBar } from "@/components/tab-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col pb-2">{children}</main>
      <TabBar />
    </div>
  );
}

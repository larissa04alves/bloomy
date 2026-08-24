import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@bloomy/auth";
import { db } from "@bloomy/db";

import { isOnboarded } from "@/server/onboarding/service";

import { FluxoOnboarding } from "./components/FluxoOnboarding";

/** Fora do grupo `(app)`: sem tab bar, porque o fluxo é linear. Gate próprio — sem ele,
 *  quem já concluiu poderia digitar a URL e sobrescrever as próprias metas sem querer. */
export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (await isOnboarded(db, session.user.id)) redirect("/home");

  return <FluxoOnboarding />;
}

import "server-only";

import type { Db } from "@bloomy/db";
import { profile, type Profile } from "@bloomy/db/schema/profile";
import { eq } from "drizzle-orm";

import { BIRTH_DATE_MIN, HEIGHT_CM_LIMITS } from "@/lib/body";
import { DAY_SCHEMA, dayFor } from "@/server/shared/day";

/** Faixa da porção de água. Mora aqui, não no zod da rota: o serviço é o dono da
 *  regra, e a rota valida a entrada com estes mesmos números (sem duplicá-los). */
export const PORTION_LIMITS = { min: 100, max: 2000 } as const;

export type ProfileUpdate = {
  restSeconds?: number;
  autoRest?: boolean;
  restAlert?: boolean;
  completeOnboarding?: boolean;
  waterPortionMl?: number;
  heightCm?: number;
  /** `YYYY-MM-DD`. */
  birthDate?: string;
};

export function heightWithinLimits(cm: number | undefined): boolean {
  return (
    cm === undefined ||
    (Number.isInteger(cm) &&
      cm >= HEIGHT_CM_LIMITS.min &&
      cm <= HEIGHT_CM_LIMITS.max)
  );
}

export function birthDateWithinLimits(
  iso: string | undefined,
  today: string = dayFor(),
): boolean {
  return (
    iso === undefined ||
    (DAY_SCHEMA.safeParse(iso).success && iso >= BIRTH_DATE_MIN && iso <= today)
  );
}

export function validProfileUpdate(
  input: ProfileUpdate,
  today: string = dayFor(),
): boolean {
  return (
    heightWithinLimits(input.heightCm) &&
    birthDateWithinLimits(input.birthDate, today)
  );
}

/** Cria o profile on-demand (1:1 com user) e retorna. */
export async function ensureProfile(db: Db, userId: string): Promise<Profile> {
  await db.insert(profile).values({ userId }).onConflictDoNothing();
  const [row] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, userId));
  return row;
}

export async function updateProfile(
  db: Db,
  userId: string,
  input: ProfileUpdate,
): Promise<Profile> {
  await ensureProfile(db, userId);
  const [updated] = await db
    .update(profile)
    .set({
      ...(input.restSeconds !== undefined && {
        restSeconds: input.restSeconds,
      }),
      ...(input.autoRest !== undefined && { autoRest: input.autoRest }),
      ...(input.restAlert !== undefined && { restAlert: input.restAlert }),
      ...(input.waterPortionMl !== undefined && {
        waterPortionMl: input.waterPortionMl,
      }),
      ...(input.heightCm !== undefined && { heightCm: input.heightCm }),
      ...(input.birthDate !== undefined && { birthDate: input.birthDate }),
      ...(input.completeOnboarding && { onboardingCompletedAt: new Date() }),
      updatedAt: new Date(),
    })
    .where(eq(profile.userId, userId))
    .returning();
  return updated;
}

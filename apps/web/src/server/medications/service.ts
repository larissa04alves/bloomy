import "server-only";

import type { Db } from "@bloomy/db";
import { medication, medicationIntake, type Medication } from "@bloomy/db/schema/body";
import { and, asc, eq, gt, sql } from "drizzle-orm";

export type IntakeSlot = {
  medicationId: string;
  name: string;
  dose: string | null;
  time: string;
  taken: boolean;
};

/** Tomas do dia derivam do cadastro; só a confirmação é fato (CONTEXT.md). */
export function deriveIntakes(
  meds: Pick<Medication, "id" | "name" | "dose" | "times">[],
  taken: { medicationId: string; time: string }[],
): IntakeSlot[] {
  const takenSet = new Set(taken.map((t) => `${t.medicationId}|${t.time}`));

  return meds
    .flatMap((med) =>
      med.times.map((time) => ({
        medicationId: med.id,
        name: med.name,
        dose: med.dose,
        time,
        taken: takenSet.has(`${med.id}|${time}`),
      })),
    )
    .sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
}

export type MedicationInput = {
  name: string;
  dose?: string;
  stock?: number;
  times: string[];
};

export async function createMedication(
  db: Db,
  userId: string,
  input: MedicationInput,
): Promise<Medication> {
  const [created] = await db
    .insert(medication)
    .values({
      userId,
      name: input.name,
      dose: input.dose ?? null,
      stock: input.stock ?? null,
      times: [...new Set(input.times)].sort(),
    })
    .returning();

  return created;
}

export async function updateMedication(
  db: Db,
  userId: string,
  medicationId: string,
  input: Partial<MedicationInput>,
): Promise<Medication | null> {
  const [updated] = await db
    .update(medication)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.dose !== undefined && { dose: input.dose }),
      ...(input.stock !== undefined && { stock: input.stock }),
      ...(input.times !== undefined && { times: [...new Set(input.times)].sort() }),
      updatedAt: new Date(),
    })
    .where(and(eq(medication.id, medicationId), eq(medication.userId, userId)))
    .returning();

  return updated ?? null;
}

export async function deactivateMedication(
  db: Db,
  userId: string,
  medicationId: string,
): Promise<boolean> {
  const updated = await db
    .update(medication)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(medication.id, medicationId), eq(medication.userId, userId)))
    .returning();

  return updated.length > 0;
}

export async function listMedications(db: Db, userId: string): Promise<Medication[]> {
  return db
    .select()
    .from(medication)
    .where(and(eq(medication.userId, userId), eq(medication.active, true)))
    .orderBy(asc(medication.name));
}

export async function getIntakesDay(
  db: Db,
  userId: string,
  day: string,
): Promise<IntakeSlot[]> {
  const meds = await listMedications(db, userId);
  const taken = await db
    .select({ medicationId: medicationIntake.medicationId, time: medicationIntake.time })
    .from(medicationIntake)
    .where(and(eq(medicationIntake.userId, userId), eq(medicationIntake.day, day)));

  return deriveIntakes(meds, taken);
}

export async function markIntake(
  db: Db,
  userId: string,
  input: { medicationId: string; time: string; day: string },
): Promise<"ok" | "duplicate" | "not_found"> {
  return db.transaction(async (tx) => {
    const [med] = await tx
      .select()
      .from(medication)
      .where(and(eq(medication.id, input.medicationId), eq(medication.userId, userId)));

    if (!med || !med.active) return "not_found";

    // Insert atômico: o UNIQUE(medication_id, day, time) decide a duplicata — sem select prévio (TOCTOU)
    const inserted = await tx
      .insert(medicationIntake)
      .values({ userId, ...input })
      .onConflictDoNothing()
      .returning({ id: medicationIntake.id });

    if (inserted.length === 0) return "duplicate";

    if (med.stock !== null) {
      // Decrementa só se havia estoque; registra na toma se descontou, p/ o unmark devolver com precisão
      const decremented = await tx
        .update(medication)
        .set({ stock: sql`${medication.stock} - 1` })
        .where(and(eq(medication.id, med.id), gt(medication.stock, 0)))
        .returning({ stock: medication.stock });

      if (decremented.length > 0) {
        await tx
          .update(medicationIntake)
          .set({ stockDecremented: true })
          .where(eq(medicationIntake.id, inserted[0].id));
      }
    }

    return "ok";
  });
}

export async function unmarkIntake(
  db: Db,
  userId: string,
  input: { medicationId: string; time: string; day: string },
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(medicationIntake)
      .where(
        and(
          eq(medicationIntake.userId, userId),
          eq(medicationIntake.medicationId, input.medicationId),
          eq(medicationIntake.day, input.day),
          eq(medicationIntake.time, input.time),
        ),
      )
      .returning();

    if (deleted.length === 0) return false;

    // Devolve estoque só se esta toma realmente descontou (evita unidade fantasma no clamp de 0)
    if (deleted[0].stockDecremented) {
      await tx
        .update(medication)
        .set({ stock: sql`${medication.stock} + 1` })
        .where(
          and(
            eq(medication.id, input.medicationId),
            sql`${medication.stock} is not null`,
          ),
        );
    }

    return true;
  });
}

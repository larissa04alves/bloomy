import "server-only";

import type { Db } from "@bloomy/db";
import {
  medication,
  medicationIntake,
  type DoseUnit,
  type Medication,
} from "@bloomy/db/schema/body";
import { and, asc, eq, sql } from "drizzle-orm";

export type IntakeSlot = {
  medicationId: string;
  name: string;
  doseAmount: number;
  doseUnit: DoseUnit;
  time: string;
  taken: boolean;
};

/** Tomas do dia derivam do cadastro; só a confirmação é fato (CONTEXT.md). */
export function deriveIntakes(
  meds: Pick<Medication, "id" | "name" | "doseAmount" | "doseUnit" | "times">[],
  taken: { medicationId: string; time: string }[],
): IntakeSlot[] {
  const takenSet = new Set(taken.map((t) => `${t.medicationId}|${t.time}`));

  return meds
    .flatMap((med) =>
      med.times.map((time) => ({
        medicationId: med.id,
        name: med.name,
        doseAmount: med.doseAmount,
        doseUnit: med.doseUnit,
        time,
        taken: takenSet.has(`${med.id}|${time}`),
      })),
    )
    .sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
}

export type MedicationInput = {
  name: string;
  doseAmount?: number;
  doseUnit?: DoseUnit;
  stock?: number | null;
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
      ...(input.doseAmount !== undefined && { doseAmount: input.doseAmount }),
      ...(input.doseUnit !== undefined && { doseUnit: input.doseUnit }),
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
      ...(input.doseAmount !== undefined && { doseAmount: input.doseAmount }),
      ...(input.doseUnit !== undefined && { doseUnit: input.doseUnit }),
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

    // Relido depois do insert: a transação já segura o lock de escrita, então o valor é o atual
    const [current] = await tx
      .select({ stock: medication.stock, doseAmount: medication.doseAmount })
      .from(medication)
      .where(eq(medication.id, med.id));

    // Desconta a dose, sem passar de zero; a toma guarda quanto saiu p/ o unmark devolver exato.
    // round(…, 4): doses decimais (0,1 ml) acumulariam resíduo de float no estoque
    const delta = current.stock === null ? 0 : Math.min(current.stock, current.doseAmount);
    if (delta > 0) {
      await tx
        .update(medication)
        .set({ stock: sql`round(${medication.stock} - ${delta}, 4)` })
        .where(eq(medication.id, med.id));
      await tx
        .update(medicationIntake)
        .set({ stockDelta: delta })
        .where(eq(medicationIntake.id, inserted[0].id));
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

    // Devolve só o que esta toma descontou (evita unidade fantasma no clamp de 0)
    const delta = deleted[0].stockDelta;
    if (delta) {
      await tx
        .update(medication)
        .set({ stock: sql`round(${medication.stock} + ${delta}, 4)` })
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

import { describe, expect, test } from "bun:test";

import {
  completeAppointment,
  createAppointment,
} from "@/server/health/service";
import { addMeal } from "@/server/meals/service";
import { createMedication, markIntake } from "@/server/medications/service";
import { updateProfile } from "@/server/profile/service";
import { upsertCheckin } from "@/server/mind/service";
import { dayFor } from "@/server/shared/day";
import { createTestDb, createTestUser } from "@/server/shared/test-db";
import { addWater } from "@/server/water/service";
import { createWorkout } from "@/server/workout/service";
import { completeSession, startSession } from "@/server/workout/session";

import { getToday } from "./service";

const USER = { id: "user-test", name: "Larissa Silva" };

describe("getToday", () => {
  test("banco vazio: metas default, tudo zerado e convites", async () => {
    const db = await createTestDb();
    await createTestUser(db);

    const today = await getToday(db, USER, dayFor());

    expect(today.name).toBe("Larissa");
    expect(today.day).toBe(dayFor());
    expect(today.checkin.mood).toBeNull();
    expect(today.water).toEqual({
      totalMl: 0,
      goalMl: 2000,
      done: 0,
      target: 4,
    });
    expect(today.meals).toEqual({ done: 0, target: 3 });
    expect(today.meds).toEqual({ taken: 0, total: 0 });
    expect(today.workout).toEqual({ state: "none" });
    expect(today.nextAppointment).toBeNull();
  });

  test("agrega água, refeições, tomas e humor do dia", async () => {
    const db = await createTestDb();
    await createTestUser(db);

    // 500 + 1500 ml (dois registros, mas 2000 ml ≠ 2 registros — cobre soma de ml, não contagem)
    await addWater(db, USER.id, 500);
    await addWater(db, USER.id, 1500);
    await addMeal(db, USER.id, {
      type: "breakfast",
      description: "café com pão",
    });
    await upsertCheckin(db, USER.id, { mood: "good" });
    const med = await createMedication(db, USER.id, {
      name: "Vitamina D",
      times: ["09:00", "21:00"],
    });
    await markIntake(db, USER.id, {
      medicationId: med.id,
      time: "09:00",
      day: dayFor(),
    });

    const today = await getToday(db, USER, dayFor());

    expect(today.water).toEqual({
      totalMl: 2000,
      goalMl: 2000,
      done: 4,
      target: 4,
    });
    expect(today.meals).toEqual({ done: 1, target: 3 });
    expect(today.meds).toEqual({ taken: 1, total: 2 });
    expect(today.checkin.mood).toBe("good");
  });

  test("card de treino: sugerido → em andamento → concluído", async () => {
    const db = await createTestDb();
    await createTestUser(db);
    const w = await createWorkout(db, USER.id, {
      name: "Pernas",
      focus: "legs",
      exercises: [
        {
          name: "Agachamento",
          targetSets: 3,
          targetReps: 10,
          restSeconds: 45,
          position: 0,
        },
      ],
    });

    const suggested = await getToday(db, USER, dayFor());
    expect(suggested.workout).toEqual({
      state: "suggested",
      id: w.id,
      name: "Pernas",
    });

    const started = await startSession(db, USER.id, w.id);
    if (typeof started === "string")
      throw new Error(`startSession falhou: ${started}`);
    const active = await getToday(db, USER, dayFor());
    expect(active.workout).toEqual({
      state: "active",
      id: w.id,
      name: "Pernas",
    });

    await completeSession(db, USER.id, started.session.id);
    const done = await getToday(db, USER, dayFor());
    expect(done.workout).toEqual({ state: "done", name: "Pernas" });
  });

  test("próxima consulta é a marcada mais próxima", async () => {
    const db = await createTestDb();
    await createTestUser(db);
    const now = new Date("2026-08-04T12:00:00.000Z");

    // Atenção: o `AppointmentInput` do serviço leva `scheduledAt: Date` (o do
    // client, em `lib/api-types.ts`, é string ISO — não confundir).
    await createAppointment(db, USER.id, {
      professional: "Dr. Paulo",
      scheduledAt: new Date("2026-08-20T17:00:00.000Z"),
    });
    await createAppointment(db, USER.id, {
      professional: "Dra. Marina",
      specialty: "Nutricionista",
      scheduledAt: new Date("2026-08-06T17:00:00.000Z"),
    });

    const today = await getToday(db, USER, dayFor(now), now);

    expect(today.nextAppointment?.professional).toBe("Dra. Marina");
    expect(today.nextAppointment?.specialty).toBe("Nutricionista");
  });

  test("retorno a agendar (sem hora marcada) também aparece como nextAppointment", async () => {
    const db = await createTestDb();
    await createTestUser(db);

    const created = await createAppointment(db, USER.id, {
      professional: "Dr. Paulo",
      scheduledAt: new Date("2026-07-01T17:00:00.000Z"),
    });
    // followUpMonths: 0 → suggestedAt fica no instante da conclusão, sempre
    // dentro da janela de 30 dias do serviço, sem depender do dia em que o teste roda.
    const result = await completeAppointment(db, USER.id, created.id, {
      needsReturn: true,
      followUpMonths: 0,
    });
    if (!result?.followUp)
      throw new Error("completeAppointment não criou o retorno");

    const today = await getToday(db, USER, dayFor());

    expect(today.nextAppointment?.status).toBe("to_schedule");
    expect(today.nextAppointment?.suggestedAt).not.toBeNull();
  });

  test("sem nome na sessão, name fica null", async () => {
    const db = await createTestDb();
    await createTestUser(db);

    const today = await getToday(db, { id: "user-test", name: null }, dayFor());

    expect(today.name).toBeNull();
  });

  test("porção configurada muda done/target sem mexer nos ml", async () => {
    const db = await createTestDb();
    await createTestUser(db);
    await getToday(db, USER, dayFor()); // cria profile e metas default
    await updateProfile(db, USER.id, { waterPortionMl: 750 });
    await addWater(db, USER.id, 1500);

    const today = await getToday(db, USER, dayFor());

    // 2000 ml de meta em porções de 750 → 3 porções (arredondado), 2 feitas.
    expect(today.water).toEqual({
      totalMl: 1500,
      goalMl: 2000,
      done: 2,
      target: 3,
    });
  });

});

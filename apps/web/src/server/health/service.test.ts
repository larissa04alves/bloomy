import { describe, expect, test } from "bun:test";

import { createTestDb, createTestUser } from "@/server/shared/test-db";
import {
  completeAppointment,
  createAppointment,
  nextAppointment,
} from "./service";

describe("completeAppointment (ciclo de retorno)", () => {
  test("needsReturn cria retorno to_schedule copiando profissional", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const appt = await createAppointment(db, userId, {
      professional: "Dra. Marina",
      specialty: "Nutricionista",
      scheduledAt: new Date("2026-07-01T14:00:00Z"),
    });

    const result = await completeAppointment(db, userId, appt.id, {
      needsReturn: true,
      followUpMonths: 3,
    });

    expect(result).not.toBeNull();
    expect(result!.completed.status).toBe("completed");
    expect(result!.followUp).not.toBeNull();
    expect(result!.followUp!.status).toBe("to_schedule");
    expect(result!.followUp!.professional).toBe("Dra. Marina");
    expect(result!.followUp!.specialty).toBe("Nutricionista");
    expect(result!.followUp!.parentId).toBe(appt.id);
    expect(result!.followUp!.suggestedAt).not.toBeNull();
  });

  test("needsReturn=false não cria retorno", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const appt = await createAppointment(db, userId, {
      professional: "Dr. Paulo",
      scheduledAt: new Date("2026-07-01T14:00:00Z"),
    });

    const result = await completeAppointment(db, userId, appt.id, { needsReturn: false });
    expect(result!.followUp).toBeNull();
  });
});

describe("nextAppointment (janela de 30 dias)", () => {
  test("retorna consulta marcada futura", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const soon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    await createAppointment(db, userId, { professional: "Perto", scheduledAt: soon });

    const next = await nextAppointment(db, userId);
    expect(next).not.toBeNull();
    expect(next!.professional).toBe("Perto");
  });

  test("ignora retorno com data sugerida além de 30 dias", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const appt = await createAppointment(db, userId, {
      professional: "Dra. Marina",
      scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // passada
    });
    // retorno sugerido 6 meses adiante → fora da janela de 30 dias
    await completeAppointment(db, userId, appt.id, { needsReturn: true, followUpMonths: 6 });

    const next = await nextAppointment(db, userId);
    expect(next).toBeNull();
  });
});

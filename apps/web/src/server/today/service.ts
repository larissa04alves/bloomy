import "server-only";

import type { Db } from "@bloomy/db";
import type { Appointment } from "@bloomy/db/schema/health";

import { DEFAULT_GOAL_TARGETS, type TodayPayload } from "@/lib/api-types";
import { ensureGoals } from "@/server/goals/service";
import { nextAppointment } from "@/server/health/service";
import { getMealsDay } from "@/server/meals/service";
import { getIntakesDay } from "@/server/medications/service";
import { getCheckin } from "@/server/mind/service";
import { ensureProfile } from "@/server/profile/service";
import { portions } from "@/server/shared/units";
import { getWaterDay } from "@/server/water/service";
import { completedSessionOn, getActiveSession } from "@/server/workout/session";
import { listWorkouts } from "@/server/workout/service";

import { firstName, periodFor } from "./greeting";
import { workoutCard } from "./rotation";

/** Igual ao `TodayPayload` do client, mas com a consulta como linha do banco
 *  (datas em `Date`) — o `Response.json` da rota serializa para ISO. */
export type TodayData = Omit<TodayPayload, "nextAppointment"> & {
  nextAppointment: Appointment | null;
};

/** Resumo do dia para a tela Hoje. Só compõe os serviços de domínio — nenhuma
 *  regra nova mora aqui além do estado do card de treino (`rotation.ts`). */
export async function getToday(
  db: Db,
  user: { id: string; name: string | null },
  day: string,
  now: Date = new Date(),
): Promise<TodayData> {
  const [water, meals, intakes, checkin, appointment, workouts, active, completed, goals, profile] =
    await Promise.all([
      getWaterDay(db, user.id, day),
      getMealsDay(db, user.id, day),
      getIntakesDay(db, user.id, day),
      getCheckin(db, user.id, day),
      nextAppointment(db, user.id, now),
      listWorkouts(db, user.id),
      getActiveSession(db, user.id),
      completedSessionOn(db, user.id, day),
      ensureGoals(db, user.id),
      ensureProfile(db, user.id),
    ]);

  const waterGoalMl = goals.find((g) => g.domain === "water")?.target ?? DEFAULT_GOAL_TARGETS.water;
  const mealsTarget = goals.find((g) => g.domain === "meals")?.target ?? DEFAULT_GOAL_TARGETS.meals;

  return {
    name: firstName(user.name),
    day,
    period: periodFor(now),
    checkin: { mood: checkin?.mood ?? null },
    water: {
      totalMl: water.totalMl,
      goalMl: waterGoalMl,
      ...portions(water.totalMl, waterGoalMl, profile.waterPortionMl),
    },
    meals: { done: meals.meals.length, target: mealsTarget },
    meds: {
      taken: intakes.filter((i) => i.taken).length,
      total: intakes.length,
    },
    workout: workoutCard({
      workouts,
      activeWorkoutId: active?.session.workoutId ?? null,
      completed,
      userId: user.id,
      day,
    }),
    nextAppointment: appointment,
  };
}

import { z } from "zod";

import { CYCLE_FLOWS, CYCLE_SYMPTOM_IDS, PILL_ACTIVE_DAYS_LIMITS } from "@/lib/cycle";
import { DAY_SCHEMA, dayFor } from "@/server/shared/day";
import { TIME_SCHEMA } from "@/server/shared/time";

const PAUSE_EVERY = z.number().int().min(1).max(24);
const PAUSE_DAYS = z.number().int().min(1).max(14);
const CURRENT_UNIT = z.number().int().min(1);
const PAST_DAY = DAY_SCHEMA.refine((d) => d <= dayFor(), "day must not be in the future");

// currentUnit ≤ pauseEvery também limita o quanto sequence_start recua (pillPosition avança sequência por sequência).
function unitWithinSequence(v: { pauseEvery?: number; currentUnit?: number }) {
  return v.pauseEvery === undefined || v.currentUnit === undefined || v.currentUnit <= v.pauseEvery;
}
const UNIT_MSG = { message: "currentUnit must be <= pauseEvery", path: ["currentUnit"] };

const NATURAL = z.object({
  kind: z.enum(["none", "copper_iud", "other"]),
  lastPeriodStart: PAST_DAY,
  usualLength: z.number().int().min(21).max(45),
});
const PILL = z.object({
  kind: z.literal("pill"),
  activeDays: z.number().int().min(PILL_ACTIVE_DAYS_LIMITS.min).max(PILL_ACTIVE_DAYS_LIMITS.max),
  pauseEvery: PAUSE_EVERY.optional(),
  pauseDays: PAUSE_DAYS.optional(),
  pillTime: TIME_SCHEMA,
  currentUnitStart: PAST_DAY.optional(),
  currentUnit: CURRENT_UNIT.optional(),
});
const UNITS = z.object({
  kind: z.enum(["ring", "patch"]),
  pauseEvery: PAUSE_EVERY,
  pauseDays: PAUSE_DAYS,
  currentUnitStart: PAST_DAY,
  currentUnit: CURRENT_UNIT,
});
const CONTINUOUS = z.object({ kind: z.enum(["hormonal_iud", "implant", "injection"]) });

// Sem pauseEvery a pílula é contínua: campos de pausa soltos seriam descartados em silêncio, então recusa.
const pillComplete = (position: boolean) => (v: z.infer<typeof PILL>) =>
  v.pauseEvery === undefined
    ? v.pauseDays === undefined && v.currentUnitStart === undefined && v.currentUnit === undefined
    : !position || (v.currentUnitStart !== undefined && v.currentUnit !== undefined);
const PILL_MSG = {
  message: "pause fields require pauseEvery; currentUnitStart and currentUnit required when the pill has a pause",
};

export const METHOD_SCHEMA = z.discriminatedUnion("kind", [
  NATURAL,
  PILL.refine(pillComplete(true), PILL_MSG).refine(unitWithinSequence, UNIT_MSG),
  UNITS.refine(unitWithinSequence, UNIT_MSG),
  CONTINUOUS,
]);

// Edição sem troca de tipo: a posição (última menstruação, cartela atual) pode faltar; o serviço
// a ignora quando o tipo é o mesmo e responde position_required quando não é.
export const METHOD_UPDATE_SCHEMA = z.discriminatedUnion("kind", [
  NATURAL.partial({ lastPeriodStart: true }),
  PILL.refine(pillComplete(false), PILL_MSG).refine(unitWithinSequence, UNIT_MSG),
  UNITS.partial({ currentUnitStart: true, currentUnit: true }).refine(unitWithinSequence, UNIT_MSG),
  CONTINUOUS,
]);

export const SYMPTOMS_SCHEMA = z.array(z.enum(CYCLE_SYMPTOM_IDS)).max(CYCLE_SYMPTOM_IDS.length);

export const DAY_BODY_SCHEMA = z.object({ flow: z.enum(CYCLE_FLOWS), symptoms: SYMPTOMS_SCHEMA });

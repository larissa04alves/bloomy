// DTOs como chegam pela API (JSON). createdAt/updatedAt são strings ISO, não Date.

import type { DoseUnit, MealItem } from "@bloomy/db/schema/body";

import type { CycleFlow, CycleMethodKind, CycleMode, CycleSymptom } from "@/lib/cycle";
import type { continuousSummary, naturalPrediction, pillPosition } from "@/server/cycle/calc";

export type GoalDomain = "water" | "meals" | "workout";

export type Goal = {
  id: string;
  domain: GoalDomain;
  target: number;
  unit: "ml" | "count" | "days";
  period: "day" | "week";
};

/** Corpo do `POST /api/onboarding`. Os quatro valores são obrigatórios: o client sempre
 *  tem todos em mãos (default ou escolhido), então campo opcional só criaria um segundo
 *  lugar onde o default é decidido. */
export type OnboardingBody = {
  waterMl: number;
  portionMl: number;
  meals: number;
  workoutDays: number;
  /** Dados do corpo do passo "Sobre você" — todos opcionais. */
  heightCm?: number;
  weightGrams?: number;
  birthDate?: string;
};

export type WaterLog = { id: string; ml: number; day: string; createdAt: string };
export type WaterDay = { logs: WaterLog[]; totalMl: number };

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/** Rótulos PT-BR das refeições (ordem de exibição). */
export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Café",
  lunch: "Almoço",
  dinner: "Jantar",
  snack: "Lanche",
};

/** Só estas geram pendência (lanche nunca). */
export const MAIN_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

export type Meal = {
  id: string;
  type: MealType;
  items: MealItem[];
  day: string;
  createdAt: string;
};
export type MealsDay = { meals: Meal[]; pendingTypes: MealType[] };
export type { MealItem };

export type { DoseUnit };

export type Medication = {
  id: string;
  name: string;
  doseAmount: number;
  doseUnit: DoseUnit;
  /** Na mesma unidade da dose. */
  stock: number | null;
  times: string[];
  active: boolean;
};

export type IntakeSlot = {
  medicationId: string;
  name: string;
  doseAmount: number;
  doseUnit: DoseUnit;
  time: string;
  taken: boolean;
};

/** Pílula do ciclo devida no dia; `null` com ciclo desligado, outro método ou na pausa. */
export type PillToday = { time: string; taken: boolean; label: string };

/** `GET /api/intakes` */
export type IntakesPayload = { intakes: IntakeSlot[]; pill: PillToday | null };

/** Alvos iniciais de cada meta. Compartilhado de propósito: `DEFAULT_GOALS` (servidor)
 *  deriva daqui, e as telas usam como fallback de render antes do fetch — o número não
 *  pode existir em dois lugares. */
export const DEFAULT_GOAL_TARGETS = {
  water: 2000,
  meals: 3,
  workout: 4,
} as const satisfies Record<GoalDomain, number>;

/** ml por porção — fallback de `profile.waterPortionMl` quando não há profile carregado. */
export const DEFAULT_PORTION_ML = 500;

/** Preferências do usuário (`GET`/`PATCH /api/profile`). */
export type Profile = {
  restSeconds: number;
  autoRest: boolean;
  restAlert: boolean;
  waterPortionMl: number;
  onboardingCompletedAt: string | null;
  heightCm: number | null;
  birthDate: string | null;
};

// ── Treino ────────────────────────────────────────────────────────────────

/** Focos disponíveis (ordem de exibição no modal). Fonte única do enum. */
export const FOCUS_VALUES = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "glutes",
  "arms",
  "abs",
  "cardio",
] as const;

export type Focus = (typeof FOCUS_VALUES)[number];

/** Rótulos PT-BR dos focos (grupos musculares). */
export const FOCUS_LABELS: Record<Focus, string> = {
  chest: "Peito",
  back: "Costas",
  legs: "Pernas",
  shoulders: "Ombros",
  glutes: "Glúteos",
  arms: "Braços",
  abs: "Abdômen",
  cardio: "Cardio",
};

export type Exercise = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  position: number;
  catalogId: string | null;
  muscleGroups: Focus[]; // [] = sem grupo
};

export type CatalogExercise = {
  id: string;
  name: string;
  namePt: string;
  group: Focus;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
};

export type Workout = {
  id: string;
  name: string;
  focuses: Focus[];
  active: boolean;
  createdAt: string;
};

export type WorkoutWithExercises = Workout & { exercises: Exercise[] };

export type WorkoutSummary = {
  weekCount: number;
  weekTarget: number;
  streak: number;
  weekDays: boolean[]; // 7 posições, seg..dom
};

export type SetLog = {
  id: string;
  exerciseId: string | null; // FK com onDelete:"set null" no back
  sessionExerciseId: string | null;
  exerciseName: string;
  setIndex: number;
  reps: number | null;
  load: number | null;
  done: boolean;
};

export type SessionExercise = {
  id: string; // linha de session_exercise — é o alvo dos ajustes do dia
  exerciseId: string | null; // origem no template; null = só desta sessão
  name: string;
  targetSets: number;
  restSeconds: number;
  position: number;
  catalogId: string | null;
  origin: "template" | "added" | "replaced";
  sets: SetLog[];
  lastPerformance: { reps: number | null; load: number | null } | null;
};

export type SessionDetail = {
  session: {
    id: string;
    workoutId: string;
    day: string;
    startedAt: string;
    completedAt: string | null;
  };
  exercises: SessionExercise[];
};

export type SessionAdjustments = {
  added: number;
  replaced: number;
  removed: number;
  /** true quando os exercícios herdados do template estão em ordem diferente da dele. */
  reordered: boolean;
};

// ── Mente ─────────────────────────────────────────────────────────────────

export type Mood = "sad" | "meh" | "neutral" | "good" | "great";

/** Humor do pior ao melhor — casa com a posição dos tiles em `MoodTiles`. */
export const MOOD_ORDER: readonly Mood[] = ["sad", "meh", "neutral", "good", "great"];

/** Check-in do dia (1 por dia, upsert). Datas ISO string. */
export type Checkin = {
  id: string;
  day: string; // YYYY-MM-DD
  mood: Mood | null;
  anxiety: number | null; // 0–100
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Relato do mini-diário (vários por dia). */
export type MindNote = {
  id: string;
  day: string; // YYYY-MM-DD
  mood: Mood | null;
  note: string;
  createdAt: string; // ISO
};

/** Humor de um dia da semana (card "Como foi sua semana"). */
export type WeekMood = { day: string; mood: Mood | null };

// ── Saúde ─────────────────────────────────────────────────────────────────

export type AppointmentStatus = "scheduled" | "completed" | "to_schedule";

/** Consulta (instante, não coluna `day`). Datas ISO string. */
export type Appointment = {
  id: string;
  professional: string;
  specialty: string | null;
  status: AppointmentStatus;
  scheduledAt: string | null;
  suggestedAt: string | null; // retorno sugerido
  completedAt: string | null;
  location: string | null;
  remindDayBefore: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentInput = {
  professional: string;
  specialty?: string;
  status: "scheduled" | "to_schedule";
  scheduledAt: string | null; // ISO
  suggestedAt: string | null; // ISO
  location?: string;
  remindDayBefore?: boolean;
};

export type ExamStatus = "to_schedule" | "scheduled" | "awaiting_result" | "completed";

/** Rótulos PT-BR dos status de exame. */
export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  to_schedule: "a agendar",
  scheduled: "agendada",
  awaiting_result: "aguardando resultado",
  completed: "concluído",
};

export type Exam = {
  id: string;
  name: string;
  status: ExamStatus;
  scheduledAt: string | null;
  suggestedAt: string | null;
  completedAt: string | null;
  parentId: string | null;
  attachmentKey: string | null;
  attachmentMime: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ExamInput = {
  name: string;
  status?: ExamStatus;
  scheduledAt?: string | null; // ISO
};

export type WeightLog = { id: string; grams: number; day: string; createdAt: string };

/** Cadastro de remédio (input dos modais/hook de agenda). */
export type MedicationInput = {
  name: string;
  doseAmount: number;
  doseUnit: DoseUnit;
  stock?: number | null;
  times: string[];
};

// ── Hoje ──────────────────────────────────────────────────────────────────

/** Período do dia, resolvido no fuso BR pelo servidor. */
export type DayPeriod = "morning" | "afternoon" | "evening";

/** Estado do card de Treino na Hoje. `done` não tem id: não há nada pra iniciar. */
export type WorkoutCard =
  | { state: "none" }
  | { state: "suggested"; id: string; name: string }
  | { state: "active"; id: string; name: string }
  | { state: "done"; name: string };

/** Payload da tela Hoje. `nextAppointment` vem serializado (datas em ISO string). */
export type TodayPayload = {
  name: string | null;
  /** Foto do perfil (Google); `null` sem foto → avatar cai na inicial do nome. */
  image: string | null;
  day: string; // YYYY-MM-DD, fuso BR
  period: DayPeriod;
  checkin: { mood: Mood | null };
  water: { totalMl: number; goalMl: number; done: number; target: number };
  meals: { done: number; target: number };
  meds: { taken: number; total: number }; // inclui a pílula do ciclo quando devida; total 0 = nada a tomar
  workout: WorkoutCard;
  nextAppointment: Appointment | null;
};

export type ReminderType =
  | "water"
  | "meds"
  | "workout"
  | "mind"
  | "appointments"
  | "pill"
  | "cycle_soon"
  | "period_check";

/** Preferência de lembrete (`GET /api/reminders`, `PUT /api/reminders/[id]`).
 *  `time` é `null` nos tipos sem horário próprio: água segue intervalo constante,
 *  remédios derivam de `medication.times` e consultas de `scheduledAt`. Só
 *  `workout` e `mind` aceitam `time` no PUT — os outros respondem 422. */
export type Reminder = {
  id: string;
  type: ReminderType;
  time: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MethodInput =
  | { kind: "none" | "copper_iud" | "other"; lastPeriodStart: string; usualLength: number }
  /** Sem `pauseEvery` a pílula é contínua e não tem posição na sequência. */
  | {
      kind: "pill";
      activeDays: number;
      pauseEvery?: number;
      pauseDays?: number;
      pillTime: string;
      currentUnitStart?: string;
      currentUnit?: number;
    }
  | { kind: "ring" | "patch"; pauseEvery: number; pauseDays: number; currentUnitStart: string; currentUnit: number }
  | { kind: "hormonal_iud" | "implant" | "injection" };

/** `PUT /api/cycle/method`: com o mesmo tipo (e, na pílula, os mesmos comprimidos ativos e a mesma
 *  pausa) do método atual, só a configuração muda e a posição (última menstruação, cartela atual)
 *  pode faltar; trocar de tipo exige a posição. */
export type MethodUpdateInput =
  | { kind: "none" | "copper_iud" | "other"; lastPeriodStart?: string; usualLength: number }
  | Extract<MethodInput, { kind: "pill" }>
  | { kind: "ring" | "patch"; pauseEvery: number; pauseDays: number; currentUnitStart?: string; currentUnit?: number }
  | { kind: "hormonal_iud" | "implant" | "injection" };

export type DayEntry = { day: string; flow: CycleFlow; symptoms: CycleSymptom[] };

/** Estado do ciclo ligado. Só um entre `natural`/`scheduled`/`continuous` vem preenchido,
 *  conforme `mode`. */
export type CycleState = {
  enabled: true;
  method: {
    kind: CycleMethodKind;
    /** Comprimidos ativos por cartela; null fora da pílula. */
    activeDays: number | null;
    pillTime: string | null;
    startedOn: string;
    pauseEvery: number | null;
    pauseDays: number | null;
    usualLength: number | null;
    lastPeriodStart: string | null;
  };
  mode: CycleMode;
  natural?: ReturnType<typeof naturalPrediction>;
  scheduled?: ReturnType<typeof pillPosition>;
  continuous?: ReturnType<typeof continuousSummary>;
  today: { flow: CycleFlow | null; symptoms: CycleSymptom[] };
  pill: { due: boolean; taken: boolean; time: string } | null;
  hiddenSymptoms: CycleSymptom[];
  methodHistory: { kind: CycleMethodKind; startedOn: string; endedOn: string | null }[];
};

/** Resposta das mutações do ciclo; `cycle` null = ciclo desativado. */
export type CycleResponse = { cycle: CycleState | null };

/** `GET /api/cycle`. `configured` = já ativou alguma vez e não apagou (com `cycle` null, desativado). */
export type CyclePayload = CycleResponse & { configured: boolean };

export type DayRange = { from: string; to: string };
/** "current" = método atual, ainda em andamento; "cut" = interrompido pela troca de método. */
export type HistoryStatus = "done" | "current" | "cut";

export type CycleHistorySection = { kind: CycleMethodKind; startedOn: string; endedOn: string | null } & (
  | {
      mode: "natural";
      cycles: { start: string; end: string; length: number; periodDays: number | null; status: HistoryStatus }[];
    }
  | { mode: "scheduled"; sequences: { start: string; pause: DayRange; bleed: DayRange | null; status: HistoryStatus }[] }
  | { mode: "continuous"; events: DayRange[] }
);

/** `GET /api/cycle/history` → `{ sections }`: um bloco por método, do mais novo ao mais antigo;
 *  linhas também do mais novo ao mais antigo. */
export type CycleHistory = { sections: CycleHistorySection[] };

export type CycleSettingsBody = { enabled?: boolean; hiddenSymptoms?: CycleSymptom[] };
export type CycleDayBody = { flow: CycleFlow; symptoms: CycleSymptom[] };
export type CycleAnchorBody = { kind: "pause_started" | "pack_extended" };

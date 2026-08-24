// DTOs como chegam pela API (JSON). createdAt/updatedAt são strings ISO, não Date.

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
  description: string;
  day: string;
  createdAt: string;
};
export type MealsDay = { meals: Meal[]; pendingTypes: MealType[] };

export type Medication = {
  id: string;
  name: string;
  dose: string | null;
  stock: number | null;
  times: string[];
  active: boolean;
};

export type IntakeSlot = {
  medicationId: string;
  name: string;
  dose: string | null;
  time: string;
  taken: boolean;
};

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
  waterPortionMl: number;
  onboardingCompletedAt: string | null;
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
  muscleGroup: Focus | null;
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
  focus: Focus;
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
  scheduledAt: string; // ISO
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
  dose?: string;
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
  day: string; // YYYY-MM-DD, fuso BR
  period: DayPeriod;
  checkin: { mood: Mood | null };
  water: { totalMl: number; goalMl: number; done: number; target: number };
  meals: { done: number; target: number };
  meds: { taken: number; total: number }; // total 0 = nenhum remédio cadastrado
  workout: WorkoutCard;
  nextAppointment: Appointment | null;
};

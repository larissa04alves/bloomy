// DTOs como chegam pela API (JSON). createdAt/updatedAt são strings ISO, não Date.

export type GoalDomain = "water" | "meals" | "workout" | "mind";

export type Goal = {
  id: string;
  domain: GoalDomain;
  target: number;
  unit: "ml" | "count" | "days";
  period: "day" | "week";
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

/** ml por garrafa — unidade de contagem da hidratação. */
export const GARRAFA_ML = 500;

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
  exerciseName: string;
  setIndex: number;
  reps: number | null;
  load: number | null;
  done: boolean;
};

export type SessionExercise = {
  exerciseId: string;
  name: string;
  targetSets: number;
  restSeconds: number;
  position: number;
  catalogId: string | null;
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

// ── Mente ─────────────────────────────────────────────────────────────────

export type Mood = "sad" | "meh" | "neutral" | "good" | "great";

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

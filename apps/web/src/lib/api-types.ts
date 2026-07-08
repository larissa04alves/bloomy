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

export type Focus = "chest" | "back" | "legs" | "cardio";

/** Rótulos PT-BR dos focos (ordem de exibição no modal). */
export const FOCUS_LABELS: Record<Focus, string> = {
  chest: "Peito",
  back: "Costas",
  legs: "Pernas",
  cardio: "Cardio",
};

export type Exercise = {
  id: string;
  name: string;
  targetSets: number;
  position: number;
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
  position: number;
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

export type Focus =
  | "chest" | "back" | "legs" | "shoulders" | "glutes" | "arms" | "abs" | "cardio";

// target tem prioridade (mais específico); bodyPart é o reforço.
const BY_TARGET: Record<string, Focus> = {
  pectorals: "chest",
  lats: "back", "upper back": "back", traps: "back", "spine": "back",
  quads: "legs", hamstrings: "legs", calves: "legs", adductors: "legs", abductors: "legs",
  glutes: "glutes",
  delts: "shoulders", "serratus anterior": "shoulders",
  biceps: "arms", triceps: "arms", forearms: "arms",
  abs: "abs",
  "cardiovascular system": "cardio",
};

const BY_BODYPART: Record<string, Focus> = {
  chest: "chest",
  back: "back",
  "upper legs": "legs", "lower legs": "legs",
  shoulders: "shoulders", neck: "shoulders",
  "upper arms": "arms", "lower arms": "arms",
  waist: "abs",
  cardio: "cardio",
};

/** Mapeia (target, bodyPart) crus do dataset p/ 1 dos 8 grupos. */
export function mapMuscleGroup(target: string, bodyPart: string): Focus {
  const t = target.trim().toLowerCase();
  const b = bodyPart.trim().toLowerCase();
  return BY_TARGET[t] ?? BY_BODYPART[b] ?? "abs";
}

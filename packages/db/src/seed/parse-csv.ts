import { parse } from "csv-parse/sync";

export type RawExercise = {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  secondaryMuscles: string[];
};

export function parseExercisesCsv(csv: string): RawExercise[] {
  const records = parse(csv, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  return records
    .filter((r) => r.id?.trim())
    .map((r) => {
      const secondaryMuscles = Object.keys(r)
        .filter((k) => k.startsWith("secondaryMuscles/"))
        .sort()
        .map((k) => r[k]?.trim())
        .filter((v): v is string => Boolean(v));
      return {
        id: r.id!.trim(),
        name: r.name?.trim() ?? "",
        bodyPart: r.bodyPart?.trim() ?? "",
        target: r.target?.trim() ?? "",
        equipment: r.equipment?.trim() ?? "",
        secondaryMuscles,
      };
    });
}

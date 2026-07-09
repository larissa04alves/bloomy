"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { CatalogExercise } from "@/lib/api-types";
import { useResource } from "@/lib/use-resource";

export function useCatalogo() {
  const { data, loading } = useResource<{ exercises: CatalogExercise[] }>(
    useCallback(() => api.get<{ exercises: CatalogExercise[] }>("/api/exercises"), []),
  );
  return { catalog: data?.exercises ?? [], loading };
}

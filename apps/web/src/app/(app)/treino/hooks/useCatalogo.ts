"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { CatalogExercise } from "@/lib/api-types";
import { useResource } from "@/lib/use-resource";

type CatalogResponse = { exercises: CatalogExercise[] };

let catalogCache: Promise<CatalogResponse> | null = null;

function fetchCatalog(): Promise<CatalogResponse> {
  catalogCache ??= api.get<CatalogResponse>("/api/exercises").catch((e) => {
    catalogCache = null;
    throw e;
  });
  return catalogCache;
}

/** `enabled=false` adia o fetch (ex.: só quando o modal abre / há exercício de catálogo). */
export function useCatalogo(enabled = true) {
  const { data, loading } = useResource<CatalogResponse>(
    useCallback(() => fetchCatalog(), []),
    enabled,
  );
  return { catalog: data?.exercises ?? [], loading };
}

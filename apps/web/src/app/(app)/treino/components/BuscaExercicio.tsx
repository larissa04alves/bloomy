"use client";

import { ArrowLeftIcon, FunnelIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { type CatalogExercise, type Focus, FOCUS_LABELS, FOCUS_VALUES } from "@/lib/api-types";

import { buildFuse, searchExercises } from "../hooks/buscaExercicios";
import { useCatalogo } from "../hooks/useCatalogo";
import { GifThumb } from "./GifThumb";
import { GifViewer } from "./GifViewer";

export function BuscaExercicio({
  onPick,
  onCustom,
  onBack,
}: {
  onPick: (ex: CatalogExercise) => void;
  onCustom: () => void;
  onBack: () => void;
}) {
  const { catalog, loading } = useCatalogo();
  const fuse = useMemo(() => buildFuse(catalog), [catalog]);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<Focus | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [preview, setPreview] = useState<CatalogExercise | null>(null);

  const results = useMemo(
    () => searchExercises(fuse, catalog, { q, group }).slice(0, 60),
    [fuse, catalog, q, group],
  );

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Voltar"
          onClick={onBack}
          className="grid size-9 place-items-center rounded-full bg-lilac-tint text-lilac-deep"
        >
          <ArrowLeftIcon size={18} weight="bold" />
        </button>
        <h2 className="font-display text-lg font-bold text-ink">Escolher exercício</h2>
      </header>

      <div className="flex items-stretch gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-control border border-hairline bg-white px-3 focus-within:border-pink-bright">
          <MagnifyingGlassIcon size={17} className="text-pink-deep" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="buscar exercício…"
            className="w-full bg-transparent py-2.5 text-sm font-semibold text-ink outline-none placeholder:text-ink-faint"
          />
        </label>
        <button
          type="button"
          aria-label="Filtrar por grupo"
          onClick={() => setFilterOpen((v) => !v)}
          className={`relative grid w-11 place-items-center rounded-control border ${
            group
              ? "border-pink-bright bg-pink-tint text-pink-deep"
              : "border-hairline bg-white text-ink-read"
          }`}
        >
          <FunnelIcon size={18} weight={group ? "fill" : "regular"} />
          {group ? (
            <span className="absolute -right-1.5 -top-1.5 grid size-4.5 place-items-center rounded-full bg-pink-bright text-xs font-extrabold text-white">
              1
            </span>
          ) : null}
        </button>
      </div>

      {filterOpen ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={group === null} onClick={() => setGroup(null)}>
            Todos
          </Chip>
          {FOCUS_VALUES.map((g) => (
            <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
              {FOCUS_LABELS[g]}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        {loading ? (
          <p className="py-6 text-center text-sm font-semibold text-ink-read">Carregando…</p>
        ) : null}
        {results.map((ex) => (
          <div key={ex.id} className="flex items-center gap-3 rounded-card p-2">
            <button type="button" onClick={() => setPreview(ex)} aria-label={`Ver ${ex.namePt}`}>
              <GifThumb id={ex.id} alt="" className="size-12 rounded-control" />
            </button>
            <button
              type="button"
              onClick={() => onPick(ex)}
              className="flex flex-1 flex-col items-start text-left"
            >
              <span className="text-sm font-bold text-ink">{ex.namePt}</span>
              <span className="mt-0.5 rounded-full bg-pink-tint px-2 py-0.5 text-xs font-bold text-pink-deep">
                {FOCUS_LABELS[ex.group]}
              </span>
            </button>
            <button
              type="button"
              aria-label="Ver execução"
              onClick={() => setPreview(ex)}
              className="text-ink-faint"
            >
              ⤢
            </button>
          </div>
        ))}
        {!loading && results.length === 0 ? (
          <p className="py-6 text-center text-sm font-semibold text-ink-read">
            Nada encontrado.
          </p>
        ) : null}
        <button
          type="button"
          onClick={onCustom}
          className="mt-1 flex items-center justify-center gap-1 rounded-control border border-dashed border-hairline py-3 text-sm font-bold text-pink-deep"
        >
          <PlusIcon size={16} weight="bold" /> Adicionar exercício personalizado
        </button>
      </div>

      {preview ? <GifViewer exercise={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-none rounded-full border px-3 py-1.5 text-xs font-bold ${
        active
          ? "border-pink-bright bg-pink-bright text-white"
          : "border-hairline bg-lilac-tint-soft text-ink-read"
      }`}
    >
      {children}
    </button>
  );
}

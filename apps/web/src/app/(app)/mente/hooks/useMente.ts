"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Checkin, MindNote, Mood } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

type CheckinResponse = { checkin: Checkin | null };
type NotesResponse = { notes: MindNote[] };
type NoteResponse = { note: MindNote };

export function useMente() {
  const todayRes = useResource<CheckinResponse>(
    useCallback(() => api.get<CheckinResponse>("/api/checkins"), []),
  );
  const notesRes = useResource<NotesResponse>(
    useCallback(() => api.get<NotesResponse>("/api/checkins/notes?limit=30"), []),
  );

  const today = todayRes.data?.checkin ?? null;
  const records = notesRes.data?.notes ?? [];

  /** PUT parcial do check-in do dia (humor/ansiedade); rollback no catch. */
  const patchCheckin = useCallback(
    async (input: { mood?: Mood; anxiety?: number }, errMsg: string) => {
      const prev = todayRes.data;
      try {
        const { checkin } = await api.put<CheckinResponse>("/api/checkins", input);
        if (checkin) todayRes.setData({ checkin });
      } catch (e) {
        todayRes.setData(prev);
        toastError(e, errMsg);
      }
    },
    [todayRes],
  );

  const setMood = useCallback(
    (mood: Mood) => {
      // Otimista: seleção reflete na hora (o PUT confirma).
      if (todayRes.data) todayRes.setData({ checkin: { ...todayRes.data.checkin, mood } as Checkin });
      void patchCheckin({ mood }, "Não foi possível registrar o humor");
    },
    [todayRes, patchCheckin],
  );

  const setAnxiety = useCallback(
    (anxiety: number) => void patchCheckin({ anxiety }, "Não foi possível registrar a ansiedade"),
    [patchCheckin],
  );

  /** Cria um novo relato (append) com a carinha do momento; true no sucesso. */
  const saveNote = useCallback(
    async (note: string): Promise<boolean> => {
      try {
        const { note: created } = await api.post<NoteResponse>("/api/checkins/notes", {
          note,
          mood: today?.mood ?? null,
        });
        notesRes.setData({ notes: [created, ...(notesRes.data?.notes ?? [])] });
        return true;
      } catch (e) {
        toastError(e, "Não foi possível salvar o registro");
        return false;
      }
    },
    [today, notesRes],
  );

  return {
    today,
    records,
    loading: todayRes.loading || notesRes.loading,
    setMood,
    setAnxiety,
    saveNote,
  };
}

"use client";

import { Screen } from "@/components/screen";

import { AnxietyCard } from "./components/AnxietyCard";
import { DiarioCard } from "./components/DiarioCard";
import { MoodCard } from "./components/MoodCard";
import { RegistrosList } from "./components/RegistrosList";
import { SemanaCard } from "./components/SemanaCard";
import { useMente } from "./hooks/useMente";

export default function MentePage() {
  const { today, records, week, setMood, setAnxiety, saveNote } = useMente();

  return (
    <Screen title="Seu espaço" subtitle="Sem pressa e sem cobrança. Só um lugar pra registrar como você está.">
      <MoodCard value={today?.mood ?? null} onSelect={setMood} />
      <AnxietyCard value={today?.anxiety ?? null} onCommit={setAnxiety} />
      <DiarioCard onSave={saveNote} />
      <SemanaCard days={week} />
      <RegistrosList records={records} />
    </Screen>
  );
}

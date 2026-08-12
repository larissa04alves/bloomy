"use client";

import { ConsultaCard } from "./components/ConsultaCard";
import { HomeErro } from "./components/HomeErro";
import { HomeSkeleton } from "./components/HomeSkeleton";
import { HumorCard } from "./components/HumorCard";
import { ProgressoDia } from "./components/ProgressoDia";
import { RituaisGrid } from "./components/RituaisGrid";
import { SaudacaoHeader } from "./components/SaudacaoHeader";
import { useHome } from "./hooks/useHome";

export default function HomePage() {
  const { today, moodIndex, loading, error, reload, setMood } = useHome();

  if (!today) {
    if (loading) return <HomeSkeleton />;
    if (error) return <HomeErro onRetry={reload} />;
    return <HomeSkeleton />;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-5.5 pt-5">
      <SaudacaoHeader period={today.period} name={today.name} day={today.day} />
      <ProgressoDia today={today} />
      <HumorCard
        value={moodIndex}
        registered={today.checkin.mood !== null}
        onChange={setMood}
      />
      <RituaisGrid today={today} />
      <ConsultaCard appointment={today.nextAppointment} />
    </div>
  );
}

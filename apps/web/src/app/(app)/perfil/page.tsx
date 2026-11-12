"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { CycleMethodSheet } from "@/components/cycle-method-sheet";

import { AlturaSheet } from "./components/AlturaSheet";
import { ApagarCicloSheet } from "./components/ApagarCicloSheet";
import { CartelaAtualSheet } from "./components/CartelaAtualSheet";
import { CicloSection } from "./components/CicloSection";
import { ContaSection } from "./components/ContaSection";
import { ExcluirContaSheet } from "./components/ExcluirContaSheet";
import { IdentidadeCard } from "./components/IdentidadeCard";
import { NascimentoSheet } from "./components/NascimentoSheet";
import { PerfilError } from "./components/PerfilError";
import { PerfilSkeleton } from "./components/PerfilSkeleton";
import { SobreVoceSection } from "./components/SobreVoceSection";
import { TreinoSection } from "./components/TreinoSection";
import { usePerfil } from "./hooks/usePerfil";

export default function PerfilPage() {
  const perfil = usePerfil();

  if (!perfil.ready) {
    if (perfil.error) return <PerfilError onRetry={perfil.reload} />;
    return <PerfilSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-4">
      <header className="flex items-center justify-between">
        <Link
          href="/home"
          aria-label="Voltar"
          className="grid size-9.5 place-items-center rounded-control bg-lilac-tint-soft text-lilac-deep"
        >
          <ArrowLeftIcon size={18} weight="bold" />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink">Seu perfil</h1>
        <span className="size-9.5" aria-hidden="true" />
      </header>

      <IdentidadeCard
        name={perfil.account.name}
        email={perfil.account.email}
        image={perfil.account.image}
      />

      <SobreVoceSection
        heightPill={perfil.heightPill}
        birthPill={perfil.birthPill}
        ageLabel={perfil.ageLabel}
        onEditHeight={() => perfil.openSheet("height")}
        onEditBirthDate={() => perfil.openSheet("birthDate")}
      />

      <TreinoSection
        autoRest={perfil.autoRest}
        onAutoRestChange={(next) => void perfil.setAutoRest(next)}
        restAlert={perfil.restAlert}
        onRestAlertChange={(next) => void perfil.setRestAlert(next)}
      />

      <CicloSection
        status={perfil.cicloStatus}
        methodPill={perfil.methodPill}
        busy={perfil.cycleBusy}
        onRetry={perfil.retryCycle}
        onEditMethod={() => perfil.openSheet("cycleMethod")}
        onEnabledChange={(next) => void perfil.setCycleEnabled(next)}
        onDelete={() => perfil.openSheet("deleteCycle")}
      />

      <ContaSection
        signingOut={perfil.signingOut}
        onSignOut={() => void perfil.signOut()}
        onDelete={() => perfil.openSheet("deleteAccount")}
      />

      <AlturaSheet
        open={perfil.isOpen("height")}
        onOpenChange={(open) => perfil.setSheetOpen("height", open)}
        value={perfil.heightDraft}
        onChange={perfil.setHeightDraft}
        onSave={perfil.submitHeight}
      />

      <NascimentoSheet
        open={perfil.isOpen("birthDate")}
        onOpenChange={(open) => perfil.setSheetOpen("birthDate", open)}
        value={perfil.birthRaw}
        onChange={perfil.setBirthRaw}
        canSave={perfil.canSaveBirth}
        onSave={perfil.submitBirthDate}
      />

      <CycleMethodSheet
        open={perfil.isOpen("cycleMethod")}
        onOpenChange={(open) => perfil.setSheetOpen("cycleMethod", open)}
        initial={perfil.methodInitial}
        saving={perfil.cycleBusy}
        onSubmit={(input) => void perfil.saveMethod(input)}
        onFixPack={() => perfil.openSheet("currentPack")}
      />

      {perfil.pack ? (
        <CartelaAtualSheet
          open={perfil.isOpen("currentPack")}
          onOpenChange={(open) => perfil.setSheetOpen("currentPack", open)}
          title={perfil.pack.title}
          noun={perfil.pack.noun}
          draft={perfil.pack.draft}
          onChange={perfil.setPackDraft}
          units={perfil.pack.units}
          countRange={perfil.pack.countRange}
          activeDays={perfil.pack.activeDays}
          busy={perfil.cycleBusy}
          onSave={() => void perfil.savePack()}
        />
      ) : null}

      <ApagarCicloSheet
        open={perfil.isOpen("deleteCycle")}
        onOpenChange={(open) => perfil.setSheetOpen("deleteCycle", open)}
        deleting={perfil.cycleBusy}
        onDelete={() => void perfil.deleteCycle()}
      />

      <ExcluirContaSheet
        open={perfil.isOpen("deleteAccount")}
        onOpenChange={(open) => perfil.setSheetOpen("deleteAccount", open)}
        value={perfil.deletePhrase}
        onChange={perfil.setDeletePhrase}
        canDelete={perfil.canDelete}
        deleting={perfil.deleting}
        onDelete={() => void perfil.deleteAccount()}
      />
    </div>
  );
}

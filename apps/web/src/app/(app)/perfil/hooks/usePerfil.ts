"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { CyclePayload, CycleResponse, MethodUpdateInput, Profile, Reminder } from "@/lib/api-types";
import { authClient } from "@/lib/auth-client";
import { METHOD_LABELS } from "@/lib/cycle";
import { type MethodForm, methodFormFromState } from "@/lib/cycle-method-form";
import { clearLegacyAutoRest } from "@/lib/legacy-auto-rest";
import { maskBirthDate } from "@/lib/body";
import { resyncPush, unsubscribeLocalPush } from "@/lib/push";
import { toastError } from "@/lib/toast";
import { useLegacyAutoRestMigration } from "@/lib/use-legacy-auto-rest";
import { usePushSync } from "@/lib/use-push-sync";
import { useResource } from "@/lib/use-resource";
import { useSignOut } from "@/lib/use-sign-out";

import { ageFrom, birthIso, birthPill, heightPill, isDeletePhrase, revertPatch } from "./format";

export type PerfilSheet = "height" | "birthDate" | "deleteAccount" | "cycleMethod" | "deleteCycle";

export type CicloStatus = "loading" | "error" | "inactive" | "on" | "off";

const HEIGHT_START_CM = 165;

export function usePerfil() {
  const {
    data: profileData,
    setData: setProfile,
    error: profileError,
    reload: reloadProfile,
  } = useResource<{ profile: Profile }>(
    useCallback(() => api.get<{ profile: Profile }>("/api/profile"), []),
  );

  // Lembretes só decidem se desligar o aviso devolve a subscription; não seguram a tela.
  const { data: remindersData, reload: reloadReminders } = useResource<{ reminders: Reminder[] }>(
    useCallback(() => api.get<{ reminders: Reminder[] }>("/api/reminders"), []),
  );

  // O ciclo não segura a tela: o perfil é onde se desativa o ciclo e se exclui a conta.
  const {
    data: cycleData,
    setData: setCycleData,
    error: cycleError,
    reload: reloadCycle,
  } = useResource<CyclePayload>(useCallback(() => api.get<CyclePayload>("/api/cycle"), []));

  const { syncPush } = usePushSync();

  const session = authClient.useSession();
  const refetchSession = session.refetch;
  const user = session.data?.user;
  const account = {
    name: user?.name || null,
    email: user?.email ?? "",
    image: user?.image ?? null,
  };

  const profile = profileData?.profile ?? null;

  // Falhou: volta só as chaves deste patch; voltar o snapshot desfaria outro save em voo.
  const patchProfile = useCallback(
    async (patch: Partial<Profile>, errorMessage = "Não foi possível salvar") => {
      const before = profileData?.profile;
      if (!before) return false;
      setProfile((d) => d && { profile: { ...d.profile, ...patch } });
      try {
        await api.patch("/api/profile", patch);
        return true;
      } catch (e) {
        setProfile((d) => d && { profile: revertPatch(d.profile, patch, before) });
        toastError(e, errorMessage);
        return false;
      }
    },
    [profileData, setProfile],
  );

  const autoRest = profile?.autoRest ?? true;
  const restAlert = profile?.restAlert ?? true;

  const setAutoRest = useCallback(
    async (next: boolean) => {
      if (!profile || profile.autoRest === next) return;
      const saved = await patchProfile(
        { autoRest: next },
        "Não foi possível salvar o descanso automático",
      );
      if (saved) clearLegacyAutoRest();
    },
    [profile, patchProfile],
  );

  useLegacyAutoRestMigration(profile?.autoRest ?? null, setAutoRest);

  const latestRestAlert = useRef(restAlert);
  useEffect(() => {
    latestRestAlert.current = restAlert;
  }, [restAlert]);

  const setRestAlert = useCallback(
    async (next: boolean) => {
      if (!profile || profile.restAlert === next) return;
      const previous = profile.restAlert;
      latestRestAlert.current = next;
      const saved = await patchProfile(
        { restAlert: next },
        "Não foi possível salvar o aviso de descanso",
      );
      if (!saved) {
        latestRestAlert.current = previous;
        return;
      }

      // Estado mais recente, não `next`: dois toques rápidos terminam fora de ordem.
      if (latestRestAlert.current) {
        await syncPush(true);
        return;
      }
      // Sem a lista de lembretes, manter a subscription é mais seguro que derrubá-la.
      const reminders = remindersData?.reminders;
      if (reminders) await syncPush(reminders.some((r) => r.enabled));
    },
    [profile, patchProfile, remindersData, syncPush],
  );

  const saveHeight = useCallback(
    (cm: number) => {
      if (profile?.heightCm === cm) return;
      return patchProfile({ heightCm: cm });
    },
    [profile?.heightCm, patchProfile],
  );

  const saveBirthDate = useCallback(
    (iso: string) => {
      if (profile?.birthDate === iso) return;
      return patchProfile({ birthDate: iso });
    },
    [profile?.birthDate, patchProfile],
  );

  const [sheet, setSheet] = useState<PerfilSheet | null>(null);
  const [heightDraft, setHeightDraft] = useState(HEIGHT_START_CM);
  const [birthRaw, setBirthRaw] = useState("");
  const [methodInitial, setMethodInitial] = useState<MethodForm | undefined>();

  const openSheet = useCallback(
    (which: PerfilSheet) => {
      if (which === "height") setHeightDraft(profile?.heightCm ?? HEIGHT_START_CM);
      else if (which === "birthDate")
        setBirthRaw(profile?.birthDate ? birthPill(profile.birthDate) : "");
      else if (which === "deleteAccount") setDeletePhrase("");
      else if (which === "cycleMethod")
        setMethodInitial(cycleData?.cycle ? methodFormFromState(cycleData.cycle) : undefined);
      setSheet(which);
    },
    [profile?.heightCm, profile?.birthDate, cycleData],
  );

  const birthDraftIso = birthIso(birthRaw);

  const router = useRouter();
  const { signingOut, signOut } = useSignOut();

  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Sem reset de `deleting` no sucesso: a navegação desmonta a tela.
  const deleteAccount = useCallback(async () => {
    if (!isDeletePhrase(deletePhrase) || deleting) return;
    setDeleting(true);
    try {
      await api.del("/api/account");
    } catch {
      setDeleting(false);
      // Texto fixo, não o `error` da API: a frase do toast é desta tela.
      toastError(null, "Não foi possível excluir a conta. Tente de novo.");
      return;
    }
    await unsubscribeLocalPush();
    router.replace("/login");
  }, [deletePhrase, deleting, router]);

  const cycle = cycleData?.cycle ?? null;
  const [cycleBusy, setCycleBusy] = useState(false);
  const cicloStatus: CicloStatus = !cycleData
    ? cycleError
      ? "error"
      : "loading"
    : cycle
      ? "on"
      : cycleData.configured
        ? "off"
        : "inactive";

  const setCycleEnabled = useCallback(
    async (next: boolean) => {
      if (cycleBusy) return;
      setCycleBusy(true);
      try {
        const { cycle } = await api.patch<CycleResponse>("/api/cycle/settings", { enabled: next });
        setCycleData({ cycle, configured: true });
        // A aba Ciclo vem do layout (servidor).
        router.refresh();
      } catch (e) {
        toastError(e, next ? "Não foi possível ativar o ciclo" : "Não foi possível desativar o ciclo");
      } finally {
        setCycleBusy(false);
      }
    },
    [cycleBusy, setCycleData, router],
  );

  const saveMethod = useCallback(
    async (input: MethodUpdateInput) => {
      setCycleBusy(true);
      try {
        const { cycle } = await api.put<CycleResponse>("/api/cycle/method", input);
        setCycleData({ cycle, configured: true });
        setSheet(null);
        // O método novo pode trazer um lembrete que vale (ex.: pílula) para quem o servidor
        // não guardava o aparelho.
        resyncPush();
      } catch (e) {
        toastError(e, "Não foi possível salvar o método");
      } finally {
        setCycleBusy(false);
      }
    },
    [setCycleData],
  );

  const deleteCycle = useCallback(async () => {
    if (cycleBusy) return;
    setCycleBusy(true);
    try {
      await api.del("/api/cycle");
      setCycleData({ cycle: null, configured: false });
      setSheet(null);
      router.refresh();
    } catch {
      toastError(null, "Não foi possível apagar os dados do ciclo. Tente de novo.");
    } finally {
      setCycleBusy(false);
    }
  }, [cycleBusy, setCycleData, router]);

  const ready = profileData !== null && !session.isPending && !session.error;

  // A seção só existe depois do skeleton: o scroll nativo do #ciclo já passou.
  const cycleSettled = cycleData !== null || cycleError !== null;
  useEffect(() => {
    if (ready && cycleSettled && window.location.hash === "#ciclo") document.getElementById("ciclo")?.scrollIntoView();
  }, [ready, cycleSettled]);

  return {
    ready,
    error: profileError ?? session.error ?? null,
    reload: useCallback(() => {
      reloadProfile();
      reloadReminders();
      reloadCycle();
      void refetchSession();
    }, [reloadProfile, reloadReminders, reloadCycle, refetchSession]),

    account,
    profile,
    heightPill: heightPill(profile?.heightCm ?? null),
    birthPill: birthPill(profile?.birthDate ?? null),
    ageLabel: profile?.birthDate ? `${ageFrom(profile.birthDate)} anos` : null,

    isOpen: (which: PerfilSheet) => sheet === which,
    openSheet,
    setSheetOpen: useCallback(
      (which: PerfilSheet, open: boolean) => {
        if (open) openSheet(which);
        else if (!(which === "deleteAccount" && deleting) && !(which === "deleteCycle" && cycleBusy))
          setSheet(null);
      },
      [openSheet, deleting, cycleBusy],
    ),

    heightDraft,
    setHeightDraft,
    birthRaw,
    setBirthRaw: useCallback((raw: string) => setBirthRaw(maskBirthDate(raw)), []),
    canSaveBirth: birthDraftIso !== null,

    autoRest,
    setAutoRest,
    restAlert,
    setRestAlert,

    saveHeight,
    saveBirthDate,
    submitHeight: () => {
      setSheet(null);
      void saveHeight(heightDraft);
    },
    submitBirthDate: () => {
      if (birthDraftIso === null) return;
      setSheet(null);
      void saveBirthDate(birthDraftIso);
    },

    signOut,
    signingOut,
    deletePhrase,
    setDeletePhrase,
    canDelete: isDeletePhrase(deletePhrase) && !deleting,
    deleteAccount,
    deleting,

    cicloStatus,
    retryCycle: reloadCycle,
    methodPill: cycle ? METHOD_LABELS[cycle.method.kind] : null,
    methodInitial,
    cycleBusy,
    setCycleEnabled,
    saveMethod,
    deleteCycle,
  };
}

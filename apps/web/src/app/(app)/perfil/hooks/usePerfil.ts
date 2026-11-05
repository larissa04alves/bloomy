"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { Profile, Reminder } from "@/lib/api-types";
import { authClient } from "@/lib/auth-client";
import { clearLegacyAutoRest } from "@/lib/legacy-auto-rest";
import { maskBirthDate } from "@/lib/body";
import { unsubscribeLocalPush } from "@/lib/push";
import { toastError } from "@/lib/toast";
import { useLegacyAutoRestMigration } from "@/lib/use-legacy-auto-rest";
import { usePushSync } from "@/lib/use-push-sync";
import { useResource } from "@/lib/use-resource";
import { useSignOut } from "@/lib/use-sign-out";

import { ageFrom, birthIso, birthPill, heightPill, isDeletePhrase, revertPatch } from "./format";

export type PerfilSheet = "height" | "birthDate" | "deleteAccount";

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

  const openSheet = useCallback(
    (which: PerfilSheet) => {
      if (which === "height") setHeightDraft(profile?.heightCm ?? HEIGHT_START_CM);
      else if (which === "birthDate")
        setBirthRaw(profile?.birthDate ? birthPill(profile.birthDate) : "");
      else setDeletePhrase("");
      setSheet(which);
    },
    [profile?.heightCm, profile?.birthDate],
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

  return {
    ready: profileData !== null && !session.isPending && !session.error,
    error: profileError ?? session.error ?? null,
    reload: useCallback(() => {
      reloadProfile();
      reloadReminders();
      void refetchSession();
    }, [reloadProfile, reloadReminders, refetchSession]),

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
        else if (!(which === "deleteAccount" && deleting)) setSheet(null);
      },
      [openSheet, deleting],
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
  };
}

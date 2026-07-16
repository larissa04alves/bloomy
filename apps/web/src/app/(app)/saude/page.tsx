"use client";

import { useState } from "react";

import { Screen } from "@/components/screen";
import type { Appointment, Exam, Medication } from "@/lib/api-types";

import { AgendaRemediosSection } from "./components/AgendaRemediosSection";
import { AppointmentModal } from "./components/AppointmentModal";
import { ConsultasSection } from "./components/ConsultasSection";
import { ExamModal } from "./components/ExamModal";
import { ExamesSection } from "./components/ExamesSection";
import { HistorySheet, type HistoryItem } from "./components/HistorySheet";
import { MedicationModal } from "./components/MedicationModal";
import { ProximaConsultaCard } from "./components/ProximaConsultaCard";
import { RetornoSheet } from "./components/RetornoSheet";
import { useAgendaRemedios } from "./hooks/useAgendaRemedios";
import { useConsultas } from "./hooks/useConsultas";
import { useExames } from "./hooks/useExames";

type RetornoTarget = { kind: "consulta" | "exame"; id: string };

export default function SaudePage() {
  const consultas = useConsultas();
  const exames = useExames();
  const agenda = useAgendaRemedios();

  // Modais de consulta / exame / remédio (undefined = criar; objeto = editar).
  const [apptModal, setApptModal] = useState<{ open: boolean; initial?: Appointment }>({ open: false });
  const [examModal, setExamModal] = useState<{ open: boolean; initial?: Exam }>({ open: false });
  const [medModal, setMedModal] = useState<{ open: boolean; initial?: Medication }>({ open: false });

  // Sheet de retorno (após concluir) e sheet de histórico.
  const [retorno, setRetorno] = useState<{ open: boolean; target?: RetornoTarget }>({ open: false });
  const [history, setHistory] = useState<{ open: boolean; title: string; items: HistoryItem[] }>({
    open: false,
    title: "",
    items: [],
  });

  return (
    <Screen title="Saúde" subtitle="Consultas, exames e agenda de remédios">
      <ProximaConsultaCard proxima={consultas.proxima} />

      <ConsultasSection
        ativas={consultas.ativas}
        onAdd={() => setApptModal({ open: true })}
        onEdit={(a) => setApptModal({ open: true, initial: a })}
        onDelete={consultas.remove}
        onComplete={(a) => setRetorno({ open: true, target: { kind: "consulta", id: a.id } })}
        onHistory={() =>
          setHistory({
            open: true,
            title: "Histórico de consultas",
            items: consultas.historico.map((a) => ({
              id: a.id,
              title: a.specialty ? `${a.professional} · ${a.specialty}` : a.professional,
              completedAt: a.completedAt,
            })),
          })
        }
      />

      <ExamesSection
        ativos={exames.ativos}
        onAdd={() => setExamModal({ open: true })}
        onEdit={(e) => setExamModal({ open: true, initial: e })}
        onDelete={exames.remove}
        onComplete={(e) => setRetorno({ open: true, target: { kind: "exame", id: e.id } })}
        onHistory={() =>
          setHistory({
            open: true,
            title: "Histórico de exames",
            items: exames.historico.map((e) => ({
              id: e.id,
              title: e.name,
              completedAt: e.completedAt,
            })),
          })
        }
      />

      <AgendaRemediosSection
        medications={agenda.medications}
        onAdd={() => setMedModal({ open: true })}
        onEdit={(m) => setMedModal({ open: true, initial: m })}
        onDelete={agenda.remove}
      />

      <AppointmentModal
        open={apptModal.open}
        onOpenChange={(open) => setApptModal((s) => ({ ...s, open }))}
        initial={apptModal.initial}
        onSubmit={(input) =>
          apptModal.initial
            ? consultas.update(apptModal.initial.id, input)
            : consultas.create(input)
        }
      />

      <ExamModal
        open={examModal.open}
        onOpenChange={(open) => setExamModal((s) => ({ ...s, open }))}
        initial={examModal.initial}
        onSubmit={(input) =>
          examModal.initial ? exames.update(examModal.initial.id, input) : exames.create(input)
        }
      />

      <MedicationModal
        open={medModal.open}
        onOpenChange={(open) => setMedModal((s) => ({ ...s, open }))}
        initial={medModal.initial}
        onSubmit={(input) =>
          medModal.initial ? agenda.update(medModal.initial.id, input) : agenda.create(input)
        }
      />

      <RetornoSheet
        open={retorno.open}
        onOpenChange={(open) => setRetorno((s) => ({ ...s, open }))}
        title="Agendar retorno?"
        onConfirm={(opts) => {
          const t = retorno.target;
          if (!t) return;
          if (t.kind === "consulta") consultas.complete(t.id, opts);
          else exames.complete(t.id, opts);
        }}
      />

      <HistorySheet
        open={history.open}
        onOpenChange={(open) => setHistory((s) => ({ ...s, open }))}
        title={history.title}
        items={history.items}
      />
    </Screen>
  );
}

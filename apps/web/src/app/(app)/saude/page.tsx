"use client";

import { useState } from "react";

import { HeartPulseIcon } from "@/components/icons/heart-pulse";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Screen } from "@/components/screen";
import type { Appointment, Exam, Medication, WeightLog } from "@/lib/api-types";

import { AgendaRemediosSection } from "./components/AgendaRemediosSection";
import { AppointmentModal } from "./components/AppointmentModal";
import { ConsultasSection } from "./components/ConsultasSection";
import { ExamModal } from "./components/ExamModal";
import { ExamesSection } from "./components/ExamesSection";
import { HistorySheet } from "./components/HistorySheet";
import { MedicationModal } from "./components/MedicationModal";
import { PesoHistorySheet } from "./components/PesoHistorySheet";
import { PesoModal } from "./components/PesoModal";
import { PesoSection } from "./components/PesoSection";
import { ProximaConsultaCard } from "./components/ProximaConsultaCard";
import { ResultadoSheet } from "./components/ResultadoSheet";
import { RetornoSheet } from "./components/RetornoSheet";
import { useAgendaRemedios } from "./hooks/useAgendaRemedios";
import { useConsultas } from "./hooks/useConsultas";
import { useExames } from "./hooks/useExames";
import { useHistorySheet } from "./hooks/useHistorySheet";
import { usePeso } from "./hooks/usePeso";

type RetornoTarget = { kind: "consulta" | "exame"; id: string };

export default function SaudePage() {
  const consultas = useConsultas();
  const exames = useExames();
  const agenda = useAgendaRemedios();
  const peso = usePeso();

  // Modais de consulta / exame / remédio (undefined = criar; objeto = editar).
  const [apptModal, setApptModal] = useState<{ open: boolean; initial?: Appointment }>({ open: false });
  const [examModal, setExamModal] = useState<{ open: boolean; initial?: Exam }>({ open: false });
  const [medModal, setMedModal] = useState<{ open: boolean; initial?: Medication }>({ open: false });
  // Modal de peso (undefined = registrar; objeto = editar) e sheet de histórico.
  const [pesoModal, setPesoModal] = useState<{ open: boolean; initial?: WeightLog }>({
    open: false,
  });
  const [pesoHistory, setPesoHistory] = useState(false);

  // Sheet de retorno (após concluir) e sheet de histórico.
  const [retorno, setRetorno] = useState<{ open: boolean; target?: RetornoTarget }>({ open: false });
  // Sheet do resultado do exame (anexar o laudo ou concluir sem ele).
  const [resultado, setResultado] = useState<{ open: boolean; exam?: Exam }>({ open: false });
  const history = useHistorySheet(exames.historico, consultas.historico);

  return (
    <Screen title="Saúde" subtitle="Consultas, exames e agenda de remédios">
      <ProximaConsultaCard proxima={consultas.proxima} />

      <ConsultasSection
        ativas={consultas.ativas}
        onAdd={() => setApptModal({ open: true })}
        onEdit={(a) => setApptModal({ open: true, initial: a })}
        onDelete={consultas.remove}
        onComplete={(a) => setRetorno({ open: true, target: { kind: "consulta", id: a.id } })}
        onHistory={() => history.openHistory("consulta")}
      />

      <ExamesSection
        ativos={exames.ativos}
        onAdd={() => setExamModal({ open: true })}
        onEdit={(e) => setExamModal({ open: true, initial: e })}
        onDelete={exames.remove}
        // o retorno é decidido ao marcar como feito; o laudo, no modal de resultado.
        onMarkDone={(e) => setRetorno({ open: true, target: { kind: "exame", id: e.id } })}
        onComplete={(e) => setResultado({ open: true, exam: e })}
        onHistory={() => history.openHistory("exame")}
      />

      <AgendaRemediosSection
        medications={agenda.medications}
        onAdd={() => setMedModal({ open: true })}
        onEdit={(m) => setMedModal({ open: true, initial: m })}
        onDelete={agenda.remove}
      />

      <PesoSection
        weights={peso.weights}
        period={peso.period}
        onPeriodChange={peso.setPeriod}
        onAdd={() => setPesoModal({ open: true })}
        onHistory={() => setPesoHistory(true)}
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
        onSubmit={(input, attachment) =>
          examModal.initial
            ? exames.update(examModal.initial.id, input, attachment)
            : exames.create(input, attachment)
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
          // consulta: concluir já; exame: marcar feito (o laudo vem depois).
          if (t.kind === "consulta") consultas.complete(t.id, opts);
          else exames.markDone(t.id, opts);
        }}
      />

      <ResultadoSheet
        open={resultado.open}
        onOpenChange={(open) => setResultado((s) => ({ ...s, open }))}
        examName={resultado.exam?.name ?? ""}
        onConfirm={(file) => {
          const target = resultado.exam;
          if (!target) return;
          // anexar já conclui; sem arquivo, conclui sem laudo.
          if (file) exames.attach(target.id, file);
          else exames.complete(target.id);
        }}
      />

      <HistorySheet
        open={history.open}
        onOpenChange={history.onOpenChange}
        title={history.title}
        items={history.items}
      />

      <PesoModal
        open={pesoModal.open}
        onOpenChange={(open) => setPesoModal((s) => ({ ...s, open }))}
        initial={pesoModal.initial}
        lastGrams={peso.lastGrams}
        saving={peso.saving}
        onSubmit={(input) =>
          pesoModal.initial ? peso.update(pesoModal.initial.id, input) : peso.create(input)
        }
      />

      <PesoHistorySheet
        open={pesoHistory}
        onOpenChange={setPesoHistory}
        weights={peso.weights}
        onEdit={(w) => {
          setPesoHistory(false);
          setPesoModal({ open: true, initial: w });
        }}
        onDelete={peso.remove}
      />

      {consultas.creating || exames.creating || agenda.creating ? (
        <LoadingOverlay
          label={
            consultas.creating
              ? "Agendando consulta…"
              : exames.creating
                ? "Adicionando exame…"
                : "Cadastrando remédio…"
          }
        >
          <HeartPulseIcon animate size={40} className="text-lilac-deep" />
        </LoadingOverlay>
      ) : null}
    </Screen>
  );
}

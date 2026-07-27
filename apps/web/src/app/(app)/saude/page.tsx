"use client";

import { useState } from "react";

import { HeartPulseIcon } from "@/components/icons/heart-pulse";
import { LoadingOverlay } from "@/components/loading-overlay";
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
import { ResultadoSheet } from "./components/ResultadoSheet";
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
  // Sheet do resultado do exame (anexar o laudo ou concluir sem ele).
  const [resultado, setResultado] = useState<{ open: boolean; exam?: Exam }>({ open: false });
  // Guarda só qual histórico está aberto: os itens são derivados do estado atual, para que
  // anexar um resultado dali já troque o botão por "abrir" sem fechar o sheet.
  const [history, setHistory] = useState<{ open: boolean; kind?: "consulta" | "exame" }>({
    open: false,
  });

  const historyItems: HistoryItem[] =
    history.kind === "exame"
      ? exames.historico.map((e) => ({
          id: e.id,
          title: e.name,
          completedAt: e.completedAt,
          isReturn: Boolean(e.parentId),
          attachment: e.attachmentName
            ? { href: `/api/exams/${e.id}/attachment`, name: e.attachmentName }
            : undefined,
        }))
      : history.kind === "consulta"
        ? consultas.historico.map((a) => ({
            id: a.id,
            title: a.specialty ? `${a.professional} · ${a.specialty}` : a.professional,
            completedAt: a.completedAt,
            isReturn: Boolean(a.parentId),
          }))
        : [];

  return (
    <Screen title="Saúde" subtitle="Consultas, exames e agenda de remédios">
      <ProximaConsultaCard proxima={consultas.proxima} />

      <ConsultasSection
        ativas={consultas.ativas}
        onAdd={() => setApptModal({ open: true })}
        onEdit={(a) => setApptModal({ open: true, initial: a })}
        onDelete={consultas.remove}
        onComplete={(a) => setRetorno({ open: true, target: { kind: "consulta", id: a.id } })}
        onHistory={() => setHistory({ open: true, kind: "consulta" })}
      />

      <ExamesSection
        ativos={exames.ativos}
        onAdd={() => setExamModal({ open: true })}
        onEdit={(e) => setExamModal({ open: true, initial: e })}
        onDelete={exames.remove}
        // o retorno é decidido ao marcar como feito; o laudo, no modal de resultado.
        onMarkDone={(e) => setRetorno({ open: true, target: { kind: "exame", id: e.id } })}
        onComplete={(e) => setResultado({ open: true, exam: e })}
        onHistory={() => setHistory({ open: true, kind: "exame" })}
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
        onOpenChange={(open) => setHistory((s) => ({ ...s, open }))}
        title={history.kind === "exame" ? "Histórico de exames" : "Histórico de consultas"}
        items={historyItems}
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

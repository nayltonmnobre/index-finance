import React, { useMemo, useState } from "react";
import { useBPOState } from "../hooks/useBPOState";
import {
  SupportTicket,
  SupportTicketPriority,
  SupportTicketStatus,
} from "../types";
import { uploadSupportAttachment } from "../services/fileUpload";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Inbox,
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react";

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  ABERTO: "Aberto",
  EM_ATENDIMENTO: "Em atendimento",
  AGUARDANDO_SOLICITANTE: "Aguardando solicitante",
  RESOLVIDO: "Resolvido",
  ENCERRADO: "Encerrado",
};

export default function ServiceDeskView() {
  const {
    currentUser,
    users,
    companies,
    supportTickets,
    addSupportMessage,
    updateSupportTicket,
    deleteSupportTicket,
    isUserOnline,
  } = useBPOState();
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | SupportTicketStatus
  >("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [ticketToDelete, setTicketToDelete] = useState<SupportTicket | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState("");
  const [feedback, setFeedback] = useState("");

  const tickets = useMemo(
    () =>
      supportTickets.filter(
        (ticket) => statusFilter === "ALL" || ticket.status === statusFilter,
      ),
    [statusFilter, supportTickets],
  );
  const selected =
    tickets.find((ticket) => ticket.id === selectedId) || tickets[0];
  const bpoUsers = users.filter((user) =>
    ["BPO_ADMIN", "BPO_TEAM"].includes(user.role),
  );

  if (currentUser.role !== "BPO_ADMIN") {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-xs text-zinc-500">
        Acesso exclusivo do Administrador BPO.
      </div>
    );
  }

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || (!message.trim() && !attachment) || sending) return;
    setSending(true);
    setSendError("");
    try {
      const attachments = attachment
        ? [await uploadSupportAttachment(attachment)]
        : [];
      addSupportMessage(selected.id, message, attachments);
      setMessage("");
      setAttachment(null);
    } catch (reason) {
      setSendError(
        reason instanceof Error ? reason.message : "Falha ao enviar.",
      );
    } finally {
      setSending(false);
    }
  };

  const count = (statuses: SupportTicketStatus[]) =>
    supportTickets.filter((ticket) => statuses.includes(ticket.status)).length;

  const handleDelete = () => {
    if (!ticketToDelete) return;
    const protocol = ticketToDelete.protocol;
    if (!deleteSupportTicket(ticketToDelete.id)) {
      setDeleteError("Não foi possível excluir este requerimento.");
      return;
    }
    setSelectedId(null);
    setTicketToDelete(null);
    setDeleteError("");
    setFeedback(`Requerimento ${protocol} e todo o chat foram excluídos.`);
  };

  const summaryCards = [
    {
      label: "Novos",
      value: count(["ABERTO"]),
      icon: Inbox,
      color: "text-blue-700 bg-blue-50",
    },
    {
      label: "Em atendimento",
      value: count(["EM_ATENDIMENTO"]),
      icon: Clock3,
      color: "text-amber-700 bg-amber-50",
    },
    {
      label: "Aguardando cliente",
      value: count(["AGUARDANDO_SOLICITANTE"]),
      icon: AlertCircle,
      color: "text-purple-700 bg-purple-50",
    },
    {
      label: "Concluídos",
      value: count(["RESOLVIDO", "ENCERRADO"]),
      icon: CheckCircle2,
      color: "text-emerald-700 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">
          Central de Requerimentos
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Monitore, atribua e responda solicitações de clientes e contadores.
        </p>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback("")}
            aria-label="Fechar mensagem"
            className="cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className={`rounded-lg p-2 ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-zinc-400">
                  {card.label}
                </p>
                <p className="text-xl font-black">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as typeof statusFilter)
          }
          className="rounded-lg border border-zinc-200 bg-white p-2 text-xs"
        >
          <option value="ALL">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid min-h-[570px] gap-5 xl:grid-cols-[360px_1fr]">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="border-b p-4 text-xs font-bold">
            Fila de atendimento ({tickets.length})
          </div>
          <div className="max-h-[620px] divide-y overflow-y-auto">
            {tickets.map((ticket) => (
              <button
                type="button"
                key={ticket.id}
                onClick={() => setSelectedId(ticket.id)}
                className={`w-full cursor-pointer p-4 text-left ${
                  selected?.id === ticket.id
                    ? "border-l-4 border-[#C8102E] bg-[#0B2C52]/5"
                    : "hover:bg-zinc-50"
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-zinc-400">
                    {ticket.protocol}
                  </span>
                  <span
                    className={`text-[9px] font-black ${
                      ticket.priority === "URGENTE"
                        ? "text-red-600"
                        : "text-zinc-500"
                    }`}
                  >
                    {ticket.priority}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-bold">
                  {ticket.subject}
                </p>
                <p className="mt-1 text-[10px] text-zinc-500">
                  {ticket.requesterName} ·{" "}
                  {
                    companies.find((company) => company.id === ticket.companyId)
                      ?.tradeName
                  }
                </p>
                <p className="mt-2 text-[9px] font-bold text-[#0B2C52]">
                  {STATUS_LABELS[ticket.status]}
                </p>
              </button>
            ))}
            {tickets.length === 0 && (
              <p className="p-8 text-center text-xs text-zinc-400">
                Fila vazia.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {selected ? (
            <>
              <div className="space-y-4 border-b p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-[10px] text-zinc-400">
                      {selected.protocol}
                    </span>
                    <h3 className="mt-1 font-bold">{selected.subject}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                      Solicitante: {selected.requesterName}
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isUserOnline(selected.requesterId)
                            ? "animate-pulse bg-emerald-500"
                            : "bg-zinc-300"
                        }`}
                      />
                      <strong
                        className={
                          isUserOnline(selected.requesterId)
                            ? "text-emerald-700"
                            : "text-zinc-400"
                        }
                      >
                        {isUserOnline(selected.requesterId)
                          ? "online"
                          : "offline"}
                      </strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError("");
                      setTicketToDelete(selected);
                    }}
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir requerimento
                  </button>
                </div>

                <p className="whitespace-pre-wrap rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs">
                  {selected.description}
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <select
                    value={selected.status}
                    onChange={(event) =>
                      updateSupportTicket(selected.id, {
                        status: event.target.value as SupportTicketStatus,
                      })
                    }
                    className="rounded-lg border p-2 text-xs"
                  >
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selected.priority}
                    onChange={(event) =>
                      updateSupportTicket(selected.id, {
                        priority: event.target.value as SupportTicketPriority,
                      })
                    }
                    className="rounded-lg border p-2 text-xs"
                  >
                    <option value="BAIXA">Prioridade baixa</option>
                    <option value="NORMAL">Prioridade normal</option>
                    <option value="ALTA">Prioridade alta</option>
                    <option value="URGENTE">Prioridade urgente</option>
                  </select>
                  <select
                    value={selected.assignedToId || ""}
                    onChange={(event) =>
                      updateSupportTicket(selected.id, {
                        assignedToId: event.target.value,
                      })
                    }
                    className="rounded-lg border p-2 text-xs"
                  >
                    <option value="">Sem responsável</option>
                    {bpoUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} — {isUserOnline(user.id) ? "online" : "offline"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-h-[340px] flex-1 space-y-3 overflow-y-auto bg-zinc-50 p-5">
                {selected.messages.length === 0 && (
                  <div className="py-8 text-center text-xs text-zinc-400">
                    <MessageSquare className="mx-auto mb-2 h-7 w-7" />
                    Envie a primeira resposta ao solicitante.
                  </div>
                )}
                {selected.messages.map((item) => {
                  const fromBpo = ["BPO_ADMIN", "BPO_TEAM"].includes(
                    item.authorRole,
                  );
                  return (
                    <div
                      key={item.id}
                      className={`flex ${fromBpo ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 ${
                          fromBpo
                            ? "bg-[#0B2C52] text-white"
                            : "border bg-white"
                        }`}
                      >
                        <p className="text-[10px] font-bold opacity-70">
                          {item.authorName}
                        </p>
                        {item.content && (
                          <p className="mt-0.5 whitespace-pre-wrap text-xs">
                            {item.content}
                          </p>
                        )}
                        {item.attachments?.map((file) => (
                          <a
                            key={file.id}
                            href={file.url}
                            download={file.name}
                            className={`mt-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-bold ${
                              fromBpo
                                ? "bg-white/10 hover:bg-white/20"
                                : "border bg-zinc-50 hover:bg-zinc-100"
                            }`}
                          >
                            <FileText className="h-4 w-4" />
                            <span className="truncate">{file.name}</span>
                          </a>
                        ))}
                        <p className="mt-1 text-[9px] opacity-60">
                          {new Date(item.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!['RESOLVIDO', 'ENCERRADO'].includes(selected.status) && (
                <form onSubmit={send} className="space-y-2 border-t p-4">
                  {attachment && (
                    <div className="flex justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[10px]">
                      <span className="truncate font-bold">
                        {attachment.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {sendError && (
                    <p className="text-[10px] text-rose-600">{sendError}</p>
                  )}
                  <div className="flex gap-2">
                    <label
                      className="cursor-pointer rounded-lg border p-2.5"
                      title="Anexar arquivo"
                    >
                      <Paperclip className="h-4 w-4" />
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) =>
                          setAttachment(event.target.files?.[0] || null)
                        }
                      />
                    </label>
                    <input
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Responder ao solicitante..."
                      className="flex-1 rounded-lg border px-3 text-xs"
                    />
                    <button
                      disabled={sending}
                      className="cursor-pointer rounded-lg bg-[#C8102E] p-2.5 text-white disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-xs text-zinc-400">
              Selecione um requerimento da fila.
            </div>
          )}
        </div>
      </div>

      {ticketToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-ticket-title"
            className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3
                  id="delete-ticket-title"
                  className="text-base font-black text-zinc-900"
                >
                  Excluir requerimento e chat?
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  O requerimento <strong>{ticketToDelete.protocol}</strong>, a
                  descrição e todas as mensagens do chat serão removidos
                  definitivamente.
                </p>
                <p className="mt-2 text-xs font-bold text-red-700">
                  Esta ação não pode ser desfeita sem restaurar um backup.
                </p>
              </div>
            </div>
            {deleteError && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTicketToDelete(null);
                  setDeleteError("");
                }}
                className="cursor-pointer rounded-lg px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="cursor-pointer rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
              >
                Excluir requerimento e chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

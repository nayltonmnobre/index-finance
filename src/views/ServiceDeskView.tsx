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

const AVATAR_PALETTE = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-purple-500", "bg-teal-500"];

const getInitials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

const getAvatarTint = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
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
      <div className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#091320] p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
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
      color: "text-blue-700 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-300",
    },
    {
      label: "Em atendimento",
      value: count(["EM_ATENDIMENTO"]),
      icon: Clock3,
      color: "text-amber-700 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-300",
    },
    {
      label: "Aguardando cliente",
      value: count(["AGUARDANDO_SOLICITANTE"]),
      icon: AlertCircle,
      color: "text-purple-700 bg-purple-50 dark:bg-purple-500/15 dark:text-purple-300",
    },
    {
      label: "Concluídos",
      value: count(["RESOLVIDO", "ENCERRADO"]),
      icon: CheckCircle2,
      color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Central de Requerimentos
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Monitore, atribua e responda solicitações de clientes e contadores.
        </p>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-sm border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
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

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-3 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#091320] p-3"
            >
              <div className={`rounded-sm p-2 ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-zinc-400 dark:text-zinc-500">
                  {card.label}
                </p>
                <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{card.value}</p>
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
          className="rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 p-2 text-xs dark:[color-scheme:dark]"
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
        <div className="overflow-hidden rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#091320]">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Fila de atendimento ({tickets.length})
          </div>
          <div className="max-h-[620px] divide-y divide-zinc-200 dark:divide-zinc-800 overflow-y-auto">
            {tickets.map((ticket) => (
              <button
                type="button"
                key={ticket.id}
                onClick={() => setSelectedId(ticket.id)}
                className={`w-full cursor-pointer p-4 text-left ${
                  selected?.id === ticket.id
                    ? "border-l-4 border-[#C8102E] bg-[#0B2C52]/5 dark:bg-[#123B6B]/20"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                    {ticket.protocol}
                  </span>
                  <span
                    className={`text-[9px] font-semibold ${
                      ticket.priority === "URGENTE"
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {ticket.priority}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                  {ticket.subject}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <span className={`h-4 w-4 rounded-full ${getAvatarTint(ticket.requesterName)} text-white text-[7px] font-semibold flex items-center justify-center shrink-0`}>
                    {getInitials(ticket.requesterName)}
                  </span>
                  {ticket.requesterName} ·{" "}
                  {
                    companies.find((company) => company.id === ticket.companyId)
                      ?.tradeName
                  }
                </div>
                <p className="mt-2 text-[9px] font-semibold text-[#0B2C52] dark:text-[#9DB8D9]">
                  {STATUS_LABELS[ticket.status]}
                </p>
              </button>
            ))}
            {tickets.length === 0 && (
              <p className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                Fila vazia.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#091320]">
          {selected ? (
            <>
              <div className="space-y-4 border-b border-zinc-200 dark:border-zinc-800 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                      {selected.protocol}
                    </span>
                    <h3 className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">{selected.subject}</h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className={`h-5 w-5 rounded-full ${getAvatarTint(selected.requesterName)} text-white text-[8px] font-semibold flex items-center justify-center shrink-0`}>
                        {getInitials(selected.requesterName)}
                      </span>
                      Solicitante: {selected.requesterName}
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isUserOnline(selected.requesterId)
                            ? "animate-pulse bg-emerald-500"
                            : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                      />
                      <strong
                        className={
                          isUserOnline(selected.requesterId)
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-zinc-400 dark:text-zinc-500"
                        }
                      >
                        {isUserOnline(selected.requesterId)
                          ? "online"
                          : "offline"}
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError("");
                      setTicketToDelete(selected);
                    }}
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir requerimento
                  </button>
                </div>

                <p className="whitespace-pre-wrap rounded-sm border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-3 text-xs text-zinc-700 dark:text-zinc-300">
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
                    className="rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 p-2 text-xs dark:[color-scheme:dark]"
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
                    className="rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 p-2 text-xs dark:[color-scheme:dark]"
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
                    className="rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 p-2 text-xs dark:[color-scheme:dark]"
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

              <div className="max-h-[340px] flex-1 space-y-3 overflow-y-auto bg-zinc-50 dark:bg-[#091320]/40 p-5">
                {selected.messages.length === 0 && (
                  <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
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
                        className={`max-w-[80%] rounded-sm px-3 py-2 ${
                          fromBpo
                            ? "bg-[#0B2C52] text-white"
                            : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        <p className="text-[10px] font-semibold opacity-70">
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
                            className={`mt-2 flex items-center gap-2 rounded-sm px-2.5 py-2 text-[10px] font-semibold ${
                              fromBpo
                                ? "bg-white/10 hover:bg-white/20"
                                : "border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                <form onSubmit={send} className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 p-4">
                  {attachment && (
                    <div className="flex justify-between rounded-sm border border-blue-100 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-[10px] text-zinc-700 dark:text-zinc-300">
                      <span className="truncate font-semibold">
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
                    <p className="text-[10px] text-rose-600 dark:text-rose-400">{sendError}</p>
                  )}
                  <div className="flex gap-2">
                    <label
                      className="cursor-pointer rounded-sm border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 p-2.5"
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
                      className="flex-1 rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 px-3 text-xs"
                    />
                    <button
                      disabled={sending}
                      className="cursor-pointer rounded-sm bg-[#C8102E] p-2.5 text-white disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
              Selecione um requerimento da fila.
            </div>
          )}
        </div>
      </div>

      {ticketToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 dark:bg-black/70 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-ticket-title"
            className="w-full max-w-md rounded-sm border border-red-200 dark:border-red-500/25 bg-white dark:bg-[#091320] p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 dark:bg-red-500/15 p-2 text-red-700 dark:text-red-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3
                  id="delete-ticket-title"
                  className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Excluir requerimento e chat?
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  O requerimento <strong>{ticketToDelete.protocol}</strong>, a
                  descrição e todas as mensagens do chat serão removidos
                  definitivamente.
                </p>
                <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-400">
                  Esta ação não pode ser desfeita sem restaurar um backup.
                </p>
              </div>
            </div>
            {deleteError && (
              <p className="mt-4 rounded-sm bg-red-50 dark:bg-red-500/10 p-3 text-xs font-semibold text-red-700 dark:text-red-300">
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
                className="cursor-pointer rounded-sm px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="cursor-pointer rounded-sm bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
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

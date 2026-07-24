/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useBPOState } from "../hooks/useBPOState";
import { Approval } from "../types";
import DocumentPreview from "../components/DocumentPreview";
import DocumentDownloadButton from "../components/DocumentDownloadButton";
import {
  Check,
  X,
  Clock,
  AlertCircle,
  ShieldCheck,
  FileText,
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  History,
  MessageSquare,
  Eye,
} from "lucide-react";

export default function ApprovalsView() {
  const {
    activeCompany,
    approvals,
    decideApproval,
    currentUser,
    isApprovalVisibleToCurrentUser,
    canDecideApproval,
  } = useBPOState();

  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Decision Modal State
  const [decisionApprovalId, setDecisionApprovalId] = useState<string | null>(
    null,
  );
  const [decisionType, setDecisionType] = useState<
    "Aprovada" | "Rejeitada" | "Ajuste solicitado" | null
  >(null);
  const [comment, setComment] = useState("");
  const [previewApprovalId, setPreviewApprovalId] = useState<string | null>(
    null,
  );

  if (!activeCompany) return null;

  const companyApprovals = approvals.filter(
    (a) =>
      a.companyId === activeCompany.id &&
      isApprovalVisibleToCurrentUser(a),
  );

  const pendingApprovals = companyApprovals.filter(
    (a) => a.status === "Pendente",
  );
  const historyApprovals = companyApprovals.filter(
    (a) => a.status !== "Pendente",
  );
  const decisionApproval = companyApprovals.find(
    (approval) => approval.id === decisionApprovalId,
  );
  const decisionIsDocument = decisionApproval?.type === "DOCUMENTO";
  const previewApproval = companyApprovals.find(
    (approval) => approval.id === previewApprovalId,
  );

  const openDecisionModal = (
    id: string,
    type: "Aprovada" | "Rejeitada" | "Ajuste solicitado",
  ) => {
    setDecisionApprovalId(id);
    setDecisionType(type);
    setComment("");
  };

  const handleDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionApprovalId || !decisionType) return;

    if (decisionType !== "Aprovada" && !comment.trim()) {
      alert("Justificativa é obrigatória para rejeições.");
      return;
    }

    decideApproval(decisionApprovalId, decisionType, comment);
    setDecisionApprovalId(null);
    setDecisionType(null);
    setComment("");
  };

  return (
    <div id="approvals-root" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2
            id="approvals-title"
            className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight font-sans"
          >
            Central de Aprovações
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-sans">
            Documentos aparecem somente para o BPO remetente e o destinatário
            selecionado.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25 px-3 py-1.5 rounded-sm font-semibold font-sans">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          LGPD & Assinatura Digital Ativos
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-4 font-sans text-xs">
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 font-semibold border-b-2 cursor-pointer transition-colors ${activeTab === "pending" ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-50" : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
        >
          Aprovações Pendentes ({pendingApprovals.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 font-semibold border-b-2 cursor-pointer transition-colors ${activeTab === "history" ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-50" : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
        >
          Histórico e Decisões ({historyApprovals.length})
        </button>
      </div>

      {previewApproval && (
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 font-sans"
          onClick={() => setPreviewApprovalId(null)}
        >
          <div
            className="bg-white dark:bg-[#091320] border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-2xl w-full max-w-5xl h-[88vh] overflow-hidden flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-[#0B2C52] dark:text-[#9DB8D9] uppercase tracking-wider">
                  Visualização do documento
                </p>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                  {previewApproval.attachmentName ||
                    previewApproval.description}
                </h3>
              </div>
              <button
                onClick={() => setPreviewApprovalId(null)}
                className="p-2 rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-pointer"
                aria-label="Fechar visualização"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 bg-zinc-100 dark:bg-zinc-900/40 p-3 sm:p-5">
              <DocumentPreview
                name={
                  previewApproval.attachmentName || previewApproval.description
                }
                url={previewApproval.attachmentUrl}
              />
            </div>
            <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center gap-3 text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 truncate">
                Enviado por <strong>{previewApproval.requesterName}</strong>
              </span>
              <div className="flex items-center gap-2">
                <DocumentDownloadButton
                  url={previewApproval.attachmentUrl}
                  name={
                    previewApproval.attachmentName || previewApproval.description
                  }
                  className="border border-blue-100 dark:border-[#3E6DA6]/40 text-[#0B2C52] dark:text-[#9DB8D9] hover:bg-blue-50 dark:hover:bg-[#123B6B]/20"
                />
                <button
                  onClick={() => setPreviewApprovalId(null)}
                  className="px-4 py-2 bg-[#0B2C52] text-white rounded-sm font-semibold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Dialog Modal */}
      {decisionApprovalId && decisionType && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white dark:bg-[#091320] rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Confirmar{" "}
                {decisionType === "Aprovada"
                  ? decisionIsDocument
                    ? "Validação"
                    : "Aprovação"
                  : "Rejeição"}{" "}
                do {decisionIsDocument ? "Documento" : "Pagamento"}
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {decisionType === "Aprovada"
                  ? decisionIsDocument
                    ? "O pré-lançamento entrará no financeiro."
                    : "Esta ação autoriza o BPO a agendar e liquidar este débito."
                  : "Descreva detalhadamente o motivo para a correção."}
              </p>
            </div>

            <form onSubmit={handleDecisionSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase block">
                  Justificativa / Comentário{" "}
                  {decisionType === "Rejeitada" && "*"}
                </label>
                <textarea
                  required={decisionType !== "Aprovada"}
                  placeholder="Descreva observações para o BPO..."
                  rows={4}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-xs"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/70 p-3 rounded-sm text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal font-mono">
                Assinante: <strong>{currentUser.name}</strong> (
                {currentUser.role})<br />
                Token de Autenticação: SEC_
                {Math.random().toString(16).substr(2, 10).toUpperCase()}
                <br />
                IP do Dispositivo: 186.20.103.54
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDecisionApprovalId(null);
                    setDecisionType(null);
                  }}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-semibold px-3 py-2 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`font-semibold text-white px-4 py-2 rounded-sm cursor-pointer shadow-xs ${decisionType === "Aprovada" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
                >
                  Confirmar Assinatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main List */}
      <div className="space-y-4">
        {activeTab === "pending" ? (
          pendingApprovals.length === 0 ? (
            <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700 border-dashed rounded-sm py-12 text-center space-y-2">
              <ShieldCheck className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto" />
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                Uau! Nenhuma aprovação pendente para esta empresa.
              </p>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs">
                A equipe do BPO está em dia com os lançamentos.
              </p>
            </div>
          ) : (
            pendingApprovals.map((apv) => {
              const isExpanded = expandedId === apv.id;
              return (
                <div
                  key={apv.id}
                  id={`approval-pending-card-${apv.id}`}
                  className="bg-white dark:bg-[#091320] border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Main details */}
                    <div className="space-y-1.5 flex-grow">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25 font-semibold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                          {apv.type === "DOCUMENTO"
                            ? "DOCUMENTO PENDENTE"
                            : "PAGAMENTO PENDENTE"}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          Solicitado em{" "}
                          {new Date(apv.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {apv.description}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Solicitante: {apv.requesterName} |{" "}
                        {apv.type === "DOCUMENTO" ? "Documento de" : "Vence em"}
                        :{" "}
                        <strong>
                          {new Date(
                            `${apv.dueDate}T12:00:00`,
                          ).toLocaleDateString("pt-BR")}
                        </strong>
                      </p>
                      {apv.type === "DOCUMENTO" && apv.recipientName && (
                        <p className="text-[10px] text-blue-600 dark:text-blue-400">
                          Destinatário: {apv.recipientName} (
                          {apv.recipientRole === "CLIENT"
                            ? "Cliente"
                            : "Contador"}
                          )
                        </p>
                      )}
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex flex-row md:flex-col items-baseline md:items-end justify-between md:justify-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-semibold block">
                          {apv.type === "DOCUMENTO"
                            ? "Arquivo para validação"
                            : "Valor Solicitado"}
                        </span>
                        <span
                          className={`${apv.type === "DOCUMENTO" ? "text-xs max-w-48 truncate block" : "text-lg"} font-semibold text-zinc-900 dark:text-zinc-50 font-mono`}
                        >
                          {apv.type === "DOCUMENTO"
                            ? apv.attachmentName
                            : `R$ ${apv.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                        </span>
                      </div>

                      {canDecideApproval(apv) ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              openDecisionModal(apv.id, "Aprovada")
                            }
                            className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" /> Aprovar
                          </button>
                          <button
                            onClick={() =>
                              openDecisionModal(apv.id, "Ajuste solicitado")
                            }
                            className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/25 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Solicitar
                            ajuste
                          </button>
                          <button
                            onClick={() =>
                              openDecisionModal(apv.id, "Rejeitada")
                            }
                            className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/25 text-rose-700 dark:text-rose-300 px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" /> Rejeitar
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded">
                          Apenas leitura
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attachment view */}
                  {apv.attachmentName && (
                    <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 font-medium">
                        <FileText className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                        <span>
                          {apv.type === "DOCUMENTO"
                            ? "Documento anexado"
                            : "Fatura / boleto anexo"}
                          : <strong>{apv.attachmentName}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewApprovalId(apv.id)}
                          className="text-[11px] text-[#0B2C52] dark:text-[#9DB8D9] font-semibold hover:bg-blue-50 dark:hover:bg-[#123B6B]/20 border border-blue-100 dark:border-[#3E6DA6]/40 rounded-sm px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" /> Visualizar
                        </button>
                        <DocumentDownloadButton
                          url={apv.attachmentUrl}
                          name={apv.attachmentName}
                          className="border border-emerald-100 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : historyApprovals.length === 0 ? (
          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700 rounded-sm py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs italic">
            Nenhuma aprovação arquivada no histórico de auditoria.
          </div>
        ) : (
          historyApprovals.map((apv) => {
            const isExpanded = expandedId === apv.id;
            const step = apv.history[apv.history.length - 1]; // Latest decision step

            return (
              <div
                key={apv.id}
                className="bg-white dark:bg-[#091320] border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden shadow-xs"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[9px] font-semibold px-2 py-0.5 rounded border ${
                          apv.status === "Aprovada"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25"
                            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/25"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                        {apv.status.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                        ID: {apv.id}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {apv.description}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Decidido em{" "}
                      {step
                        ? new Date(step.timestamp).toLocaleString("pt-BR")
                        : new Date().toLocaleDateString("pt-BR")}{" "}
                      por <strong>{step?.userName || "Cliente"}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-6 justify-between md:justify-end shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold block uppercase">
                        {apv.type === "DOCUMENTO" ? "Tipo" : "Valor Final"}
                      </span>
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 font-mono">
                        {apv.type === "DOCUMENTO"
                          ? "Documento"
                          : `R$ ${apv.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      </span>
                    </div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : apv.id)}
                      className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm cursor-pointer text-zinc-500 dark:text-zinc-400"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expansion for Step audits */}
                {isExpanded && (
                  <div className="p-5 bg-zinc-50/50 dark:bg-[#091320]/40 border-t border-zinc-100 dark:border-zinc-800 space-y-4 text-xs text-zinc-600 dark:text-zinc-300">
                    <h4 className="font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-1">
                      <History className="h-4 w-4" /> Rastro Histórico de
                      Assinatura
                    </h4>

                    <div className="space-y-3 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800">
                      {apv.history.map((h, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                              {h.userName} ({h.role.replace(/_/g, " ")})
                            </span>
                            <span className="text-zinc-400 dark:text-zinc-500">
                              {new Date(h.timestamp).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-[#091320] p-2.5 rounded-sm border border-zinc-200 dark:border-zinc-800">
                            <span
                              className={`text-[10px] font-semibold uppercase ${h.decision === "Aprovada" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                            >
                              {h.decision}
                            </span>
                            {h.comment && (
                              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-1">
                                <MessageSquare className="h-3 w-3 mt-0.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                                <span>"{h.comment}"</span>
                              </p>
                            )}
                          </div>
                          <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono pl-1">
                            IP Origem: {h.ipAddress} | User Agent:{" "}
                            {h.userAgent.substring(0, 50)}...
                          </div>
                        </div>
                      ))}
                      {apv.history.length === 0 && (
                        <div className="space-y-1">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-200 font-mono">
                            Assinatura Automática / Legado
                          </span>
                          <p className="bg-white dark:bg-[#091320] p-2.5 rounded-sm border border-zinc-200 dark:border-zinc-800 italic text-zinc-400 dark:text-zinc-500">
                            Sem rastro adicional de formulário.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {apv.attachmentName && (
                  <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-300 font-medium">
                      {apv.attachmentName}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setPreviewApprovalId(apv.id)}
                        className="text-[11px] text-[#0B2C52] dark:text-[#9DB8D9] font-semibold hover:bg-blue-50 dark:hover:bg-[#123B6B]/20 border border-blue-100 dark:border-[#3E6DA6]/40 rounded-sm px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> Visualizar
                      </button>
                      <DocumentDownloadButton
                        url={apv.attachmentUrl}
                        name={apv.attachmentName}
                        className="border border-emerald-100 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

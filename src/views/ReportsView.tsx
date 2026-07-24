/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useBPOState } from "../hooks/useBPOState";
import { downloadReportFile } from "../services/reportFiles";
import { FileText, Download, Play, Sparkles } from "lucide-react";

const formatDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");

const REPORT_AVATAR_PALETTE = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-purple-500",
  "bg-teal-500",
];

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const getAvatarTint = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return REPORT_AVATAR_PALETTE[Math.abs(hash) % REPORT_AVATAR_PALETTE.length];
};

export default function ReportsView() {
  const {
    activeCompany,
    reports,
    generateReport,
    hasPermission
  } = useBPOState();

  const [selectedReportType, setSelectedReportType] = useState("Fluxo de Caixa");
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-07-31");
  const [exportFormat, setExportFormat] = useState<"PDF" | "CSV">("PDF");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!activeCompany) return null;

  const companyReports = reports.filter(r => r.companyId === activeCompany.id);

  const reportOptions = [
    { name: 'Fluxo de Caixa Realizado vs Projetado', type: 'Fluxo de Caixa', desc: 'Resumo analítico das entradas e saídas e saldo de fechamento projetado.' },
    { name: 'Contas a Pagar Geral', type: 'Contas a Pagar', desc: 'Listagem de todas as faturas a liquidar filtradas por vencimento e status.' },
    { name: 'Contas a Receber Geral', type: 'Contas a Receber', desc: 'Faturamento pendente e liquidações de clientes no período correspondente.' },
    { name: 'Inadimplência de Clientes', type: 'Inadimplência', desc: 'Demonstrativo de faturas vencidas e não pagas organizadas por cliente.' },
    { name: 'DRE Gerencial Simplificada', type: 'DRE', desc: 'Demonstração de Resultado do Exercício com receitas, custos e margem bruta.' },
    { name: 'Conciliação Bancária Periódica', type: 'Conciliação', desc: 'Fechamento de extrato confrontando saldos bancários e registros operacionais.' },
  ];

  const handleCompile = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!hasPermission("reports.generate")) {
      setError("Seu perfil não possui autorização para compilar relatórios.");
      return;
    }
    if (!startDate || !endDate || startDate > endDate) {
      setError("Informe um período válido para gerar o relatório.");
      return;
    }

    const filters = `Período: ${formatDate(startDate)} até ${formatDate(endDate)} | Formato: ${exportFormat}`;
    const report = generateReport(
      `${selectedReportType} - Fechamento`,
      selectedReportType,
      filters,
      { format: exportFormat, startDate, endDate },
    );
    if (!report) {
      setError("Não foi possível gerar o relatório.");
      return;
    }
    setMessage(
      `${report.fileName} foi gerado e já está disponível no histórico.`,
    );
  };

  const handleDownload = (report: (typeof reports)[number]) => {
    setError("");
    if (!downloadReportFile(report)) {
      setError(
        `O arquivo de "${report.name}" não está armazenado. Gere novamente este relatório.`,
      );
    }
  };

  return (
    <div id="reports-root" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 id="reports-title" className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight font-sans">Compilador de Relatórios</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-sans">Gere demonstrativos, DRE, fluxo de caixa consolidado e relatórios para envio à contabilidade.</p>
        </div>
      </div>

      {message && (
        <div className="rounded-sm border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/25 px-4 py-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {message}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-sm border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/25 px-4 py-3 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Compiler Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compiler form */}
        <div className="bg-white dark:bg-[#091320] rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-xs p-5 space-y-4 font-sans text-xs">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /> Parâmetros de Compilação
          </h3>
          <p className="text-zinc-400 dark:text-zinc-500 text-[11px]">Selecione um demonstrativo e defina o período desejado para a compilação de dados.</p>

          <form onSubmit={handleCompile} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase block">Modelo de Relatório</label>
              <select
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
              >
                {reportOptions.map(opt => (
                  <option key={opt.type} value={opt.type}>{opt.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase block">Data Inicial</label>
                <input
                  type="date"
                  className="w-full p-2 bg-zinc-50 dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-sm text-xs"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase block">Data Final</label>
                <input
                  type="date"
                  className="w-full p-2 bg-zinc-50 dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-sm text-xs"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase block">Formato de Exportação</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-sm p-2.5 w-full cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800 transition-colors">
                  <input
                    type="radio"
                    name="format"
                    checked={exportFormat === "PDF"}
                    onChange={() => setExportFormat("PDF")}
                    className="cursor-pointer"
                  />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Formato PDF (.pdf)</span>
                </label>
                <label className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-sm p-2.5 w-full cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800 transition-colors">
                  <input
                    type="radio"
                    name="format"
                    checked={exportFormat === "CSV"}
                    onChange={() => setExportFormat("CSV")}
                    className="cursor-pointer"
                  />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Planilha CSV (.csv)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={!hasPermission('reports.generate')}
              className="w-full font-semibold text-white bg-[#C8102E] hover:bg-[#8F071B] disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400 py-2.5 rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Play className="h-4 w-4 fill-white" />
              Compilar e Gerar Relatório
            </button>
          </form>
        </div>

        {/* Templates Details area */}
        <div className="lg:col-span-2 bg-white dark:bg-[#091320] rounded-sm border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 font-sans">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 uppercase tracking-wide">Modelos Disponíveis e Fórmulas</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-600 dark:text-zinc-300">
            {reportOptions.map((opt, i) => (
              <div key={i} className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60 transition-colors rounded-sm border border-zinc-200/60 dark:border-zinc-800 flex items-start gap-3">
                <div className="h-7 w-7 shrink-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-sm mt-0.5 border border-zinc-200 dark:border-zinc-700">
                  <FileText className="h-3.5 w-3.5" strokeWidth={2.25} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">{opt.name}</h4>
                  <p className="text-zinc-400 dark:text-zinc-500 text-[11px] leading-relaxed">{opt.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Reports log list */}
      <div className="bg-white dark:bg-[#091320] rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-xs p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 uppercase tracking-wide font-sans">Histórico de Relatórios Compilados</h3>

        <div className="overflow-x-auto font-sans text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-[#091320]/60 border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-3 text-zinc-500 dark:text-zinc-400 font-semibold uppercase">Relatório</th>
                <th className="p-3 text-zinc-500 dark:text-zinc-400 font-semibold uppercase">Tipo</th>
                <th className="p-3 text-zinc-500 dark:text-zinc-400 font-semibold uppercase">Formato</th>
                <th className="p-3 text-zinc-500 dark:text-zinc-400 font-semibold uppercase">Parâmetros Aplicados</th>
                <th className="p-3 text-zinc-500 dark:text-zinc-400 font-semibold uppercase">Gerado por</th>
                <th className="p-3 text-zinc-500 dark:text-zinc-400 font-semibold uppercase">Data Compilação</th>
                <th className="p-3 text-zinc-500 dark:text-zinc-400 font-semibold uppercase text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {companyReports.map(rep => (
                <tr key={rep.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors font-sans">
                  <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                    {rep.name}
                  </td>
                  <td className="p-3 font-medium text-zinc-600 dark:text-zinc-300">{rep.type}</td>
                  <td className="p-3 font-semibold text-zinc-600 dark:text-zinc-300">
                    {rep.format || "Legado"}
                  </td>
                  <td className="p-3 text-zinc-400 dark:text-zinc-500 max-w-xs truncate">{rep.filters}</td>
                  <td className="p-3 text-zinc-500 dark:text-zinc-400 font-medium">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-6 w-6 rounded-full ${getAvatarTint(rep.generatedByName)} text-white text-[9px] font-semibold flex items-center justify-center shrink-0`}
                      >
                        {getInitials(rep.generatedByName)}
                      </span>
                      {rep.generatedByName}
                    </div>
                  </td>
                  <td className="p-3 text-zinc-500 dark:text-zinc-400">{new Date(rep.generatedAt).toLocaleString('pt-BR')}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDownload(rep)}
                      disabled={!rep.fileContent}
                      title={
                        rep.fileContent
                          ? `Baixar ${rep.fileName}`
                          : "Relatório legado sem arquivo armazenado"
                      }
                      className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-950 dark:hover:bg-zinc-100 hover:text-white dark:hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-sm font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer flex items-center gap-1 inline-flex"
                    >
                      <Download className="h-3.5 w-3.5" /> Baixar ({rep.fileSize})
                    </button>
                  </td>
                </tr>
              ))}
              {companyReports.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400 dark:text-zinc-500 italic">
                    Nenhum relatório compilado na sessão recente. Use o painel acima para gerar um novo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

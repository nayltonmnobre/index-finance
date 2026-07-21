/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { useBPOState } from "../../hooks/useBPOState";
import { useBakeryCashState } from "../../hooks/useBakeryCashState";
import { BakeryPixReconciliationStatus, BakeryShift } from "../../types";
import { computeShiftTotals, formatBRL } from "./calculations";
import {
  Store,
  Coins,
  QrCode,
  Wallet,
  Receipt,
  ArrowDownToLine,
  Landmark,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Filter,
  CreditCard,
} from "lucide-react";

const SHIFT_STATUS_OPTIONS: BakeryShift["status"][] = [
  "Aberto",
  "Aguardando fechamento",
  "Fechado",
  "Reaberto",
  "Cancelado",
];
const PIX_STATUS_OPTIONS: BakeryPixReconciliationStatus[] = [
  "Aguardando conciliação",
  "Conciliado",
  "Divergente",
];

function StatCard({
  icon,
  iconClass,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex items-center justify-between">
      <div className="space-y-1 min-w-0">
        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">
          {label}
        </span>
        <div className="text-lg font-bold text-zinc-900 truncate">{value}</div>
      </div>
      <div className={`p-2.5 rounded-lg shrink-0 ${iconClass}`}>{icon}</div>
    </div>
  );
}

function statusBadge(status: BakeryShift["status"]) {
  const map: Record<BakeryShift["status"], string> = {
    Aberto: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Reaberto: "bg-sky-50 text-sky-700 border-sky-200",
    "Aguardando fechamento": "bg-amber-50 text-amber-700 border-amber-200",
    Fechado: "bg-zinc-100 text-zinc-600 border-zinc-200",
    Cancelado: "bg-rose-50 text-rose-600 border-rose-200",
  };
  return map[status];
}

function pixStatusBadge(status: BakeryPixReconciliationStatus) {
  const map: Record<BakeryPixReconciliationStatus, string> = {
    "Aguardando conciliação": "bg-amber-50 text-amber-700 border-amber-200",
    Conciliado: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Divergente: "bg-rose-50 text-rose-600 border-rose-200",
  };
  return map[status];
}

export default function AdminDashboard() {
  const { activeCompany, bankAccounts } = useBPOState();
  const bakery = useBakeryCashState();

  const todayIso = new Date().toISOString().slice(0, 10);
  const [dateFilter, setDateFilter] = useState(todayIso);
  const [registerFilter, setRegisterFilter] = useState("ALL");
  const [shiftLabelFilter, setShiftLabelFilter] = useState("ALL");
  const [operatorFilter, setOperatorFilter] = useState("ALL");
  const [bankFilter, setBankFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pixStatusFilter, setPixStatusFilter] = useState("ALL");
  const [reopenTarget, setReopenTarget] = useState<BakeryShift | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenError, setReopenError] = useState("");

  if (!activeCompany) return null;

  const companyShifts = bakery.shifts.filter(
    (shift) => shift.companyId === activeCompany.id,
  );
  const registers = bakery.getRegistersForCompany(activeCompany.id);
  const bolsa = bakery.getBolsaAccount(activeCompany.id);
  const pixBanks = bankAccounts.filter(
    (ba) => ba.companyId === activeCompany.id && !ba.isBolsaAccount,
  );

  const operators = Array.from(
    new Map(
      companyShifts.map((shift) => [shift.operatorId, shift.operatorName]),
    ),
  );
  const shiftLabels = Array.from(new Set(companyShifts.map((shift) => shift.shiftLabel)));

  const filteredShifts = companyShifts.filter((shift) => {
    if (dateFilter && shift.openedAt.slice(0, 10) !== dateFilter) return false;
    if (registerFilter !== "ALL" && shift.registerId !== registerFilter) return false;
    if (shiftLabelFilter !== "ALL" && shift.shiftLabel !== shiftLabelFilter) return false;
    if (operatorFilter !== "ALL" && shift.operatorId !== operatorFilter) return false;
    if (statusFilter !== "ALL" && shift.status !== statusFilter) return false;
    return true;
  });

  const shiftRows = useMemo(
    () =>
      filteredShifts
        .map((shift) => {
          const totals = computeShiftTotals(
            shift,
            bakery.expenses,
            bakery.withdrawals,
            bakery.pixSales,
          );
          return { shift, totals };
        })
        .sort(
          (a, b) =>
            new Date(b.shift.openedAt).getTime() - new Date(a.shift.openedAt).getTime(),
        ),
    [filteredShifts, bakery.expenses, bakery.withdrawals, bakery.pixSales],
  );

  const filteredShiftIds = new Set(filteredShifts.map((shift) => shift.id));
  const filteredPixSales = bakery.pixSales.filter((sale) => {
    if (!filteredShiftIds.has(sale.shiftId)) return false;
    if (bankFilter !== "ALL" && sale.bankAccountId !== bankFilter) return false;
    if (pixStatusFilter !== "ALL" && sale.reconciliationStatus !== pixStatusFilter)
      return false;
    return true;
  });

  const summary = shiftRows.reduce(
    (acc, { shift, totals }) => {
      acc.caixaExpenses += totals.caixaExpenses;
      acc.bolsaExpenses += totals.bolsaExpenses;
      acc.withdrawals += totals.withdrawalsTotal;
      if (shift.status === "Fechado") {
        acc.estimatedCash += shift.estimatedCashRevenue || 0;
        acc.cardMachine += shift.cardMachineTotal || 0;
      }
      return acc;
    },
    { caixaExpenses: 0, bolsaExpenses: 0, withdrawals: 0, estimatedCash: 0, cardMachine: 0 },
  );
  const pixTotalActive = filteredPixSales
    .filter((sale) => !sale.canceled)
    .reduce((sum, sale) => sum + sale.amount, 0);
  const totalRevenue = summary.estimatedCash + pixTotalActive + summary.cardMachine;

  const openRegisters = companyShifts.filter((shift) =>
    ["Aberto", "Reaberto"].includes(shift.status),
  ).length;
  const closedToday = filteredShifts.filter((shift) => shift.status === "Fechado").length;
  const awaitingClose = companyShifts.filter(
    (shift) => shift.status === "Aguardando fechamento",
  ).length;
  const pixByStatus = (status: BakeryPixReconciliationStatus) =>
    filteredPixSales.filter((sale) => !sale.canceled && sale.reconciliationStatus === status);

  const confirmReopen = () => {
    if (!reopenTarget) return;
    setReopenError("");
    const result = bakery.reopenShift({
      shiftId: reopenTarget.id,
      reason: reopenReason,
    });
    if (!result.success) setReopenError(result.error || "Não foi possível reabrir.");
    else {
      setReopenTarget(null);
      setReopenReason("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Store className="h-5 w-5 text-[#0B2C52]" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Caixa da Padaria — Visão administrativa
          </h1>
          <p className="text-zinc-500 text-xs">
            Turnos, despesas, sangrias e vendas no PIX de {activeCompany.tradeName}.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Coins className="h-5 w-5" />}
          iconClass="bg-emerald-50 text-emerald-600"
          label="Receita em espécie"
          value={formatBRL(summary.estimatedCash)}
        />
        <StatCard
          icon={<QrCode className="h-5 w-5" />}
          iconClass="bg-sky-50 text-sky-600"
          label="Vendas no PIX"
          value={formatBRL(pixTotalActive)}
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5" />}
          iconClass="bg-violet-50 text-violet-600"
          label="Vendas nas maquininhas"
          value={formatBRL(summary.cardMachine)}
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          iconClass="bg-[#0B2C52]/10 text-[#0B2C52]"
          label="Receita total"
          value={formatBRL(totalRevenue)}
        />
        <StatCard
          icon={<Landmark className="h-5 w-5" />}
          iconClass="bg-amber-50 text-amber-600"
          label="Saldo atual da Bolsa"
          value={formatBRL(bolsa?.balance || 0)}
        />
        <StatCard
          icon={<Receipt className="h-5 w-5" />}
          iconClass="bg-rose-50 text-rose-500"
          label="Despesas do Caixa"
          value={formatBRL(summary.caixaExpenses)}
        />
        <StatCard
          icon={<Receipt className="h-5 w-5" />}
          iconClass="bg-rose-50 text-rose-500"
          label="Despesas da Bolsa"
          value={formatBRL(summary.bolsaExpenses)}
        />
        <StatCard
          icon={<ArrowDownToLine className="h-5 w-5" />}
          iconClass="bg-zinc-100 text-zinc-600"
          label="Sangrias"
          value={formatBRL(summary.withdrawals)}
        />
        <StatCard
          icon={<Store className="h-5 w-5" />}
          iconClass="bg-zinc-100 text-zinc-600"
          label="Caixas abertos"
          value={String(openRegisters)}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconClass="bg-zinc-100 text-zinc-600"
          label="Turnos fechados"
          value={String(closedToday)}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          iconClass="bg-amber-50 text-amber-600"
          label="Aguardando fechamento"
          value={String(awaitingClose)}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          iconClass="bg-amber-50 text-amber-600"
          label="PIX aguardando conciliação"
          value={String(pixByStatus("Aguardando conciliação").length)}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          iconClass="bg-rose-50 text-rose-500"
          label="PIX divergente"
          value={String(pixByStatus("Divergente").length)}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold pr-1">
          <Filter className="h-3.5 w-3.5" /> Filtros
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5"
        />
        <button
          onClick={() => setDateFilter("")}
          className="text-[11px] font-bold text-zinc-400 hover:text-[#0B2C52] cursor-pointer"
        >
          (todas as datas)
        </button>
        <select
          value={registerFilter}
          onChange={(event) => setRegisterFilter(event.target.value)}
          className="text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5"
        >
          <option value="ALL">Todos os caixas</option>
          {registers.map((register) => (
            <option key={register.id} value={register.id}>
              {register.name}
            </option>
          ))}
        </select>
        <select
          value={shiftLabelFilter}
          onChange={(event) => setShiftLabelFilter(event.target.value)}
          className="text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5"
        >
          <option value="ALL">Todos os turnos</option>
          {shiftLabels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={operatorFilter}
          onChange={(event) => setOperatorFilter(event.target.value)}
          className="text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5"
        >
          <option value="ALL">Todas as operadoras</option>
          {operators.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={bankFilter}
          onChange={(event) => setBankFilter(event.target.value)}
          className="text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5"
        >
          <option value="ALL">Todos os bancos (PIX)</option>
          {pixBanks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.bankName}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5"
        >
          <option value="ALL">Status do turno</option>
          {SHIFT_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          value={pixStatusFilter}
          onChange={(event) => setPixStatusFilter(event.target.value)}
          className="text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5"
        >
          <option value="ALL">Status do PIX</option>
          {PIX_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Shifts table */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Caixa</th>
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Operadora</th>
                <th className="px-4 py-3 text-right">Saldo inicial</th>
                <th className="px-4 py-3 text-right">Desp. Caixa</th>
                <th className="px-4 py-3 text-right">Desp. Bolsa</th>
                <th className="px-4 py-3 text-right">Sangrias</th>
                <th className="px-4 py-3 text-right">PIX</th>
                <th className="px-4 py-3 text-right">Maquininhas</th>
                <th className="px-4 py-3 text-right">Saldo final</th>
                <th className="px-4 py-3 text-right">Receita espécie</th>
                <th className="px-4 py-3 text-right">Receita total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shiftRows.map(({ shift, totals }) => (
                <tr key={shift.id} className="hover:bg-zinc-50/70">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(shift.openedAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{shift.registerName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{shift.shiftLabel}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{shift.operatorName}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatBRL(shift.initialBalance)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatBRL(totals.caixaExpenses)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatBRL(totals.bolsaExpenses)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatBRL(totals.withdrawalsTotal)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatBRL(totals.pixTotal)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {shift.status === "Fechado" ? formatBRL(totals.cardMachineTotal) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {shift.finalBalanceCounted !== undefined
                      ? formatBRL(shift.finalBalanceCounted)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-emerald-700">
                    {shift.status === "Fechado" ? formatBRL(shift.estimatedCashRevenue || 0) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-zinc-900">
                    {shift.status === "Fechado" ? formatBRL(shift.totalRevenue || 0) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(shift.status)}`}
                    >
                      {shift.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {shift.status === "Fechado" && (
                      <button
                        onClick={() => {
                          setReopenTarget(shift);
                          setReopenReason("");
                          setReopenError("");
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B2C52] hover:underline cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {shiftRows.length === 0 && (
                <tr>
                  <td colSpan={15} className="px-4 py-10 text-center text-zinc-400 italic">
                    Nenhum turno encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PIX sales list with reconciliation controls */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h3 className="text-sm font-bold text-zinc-800">Vendas no PIX</h3>
        </div>
        <div className="divide-y divide-zinc-100">
          {filteredPixSales.length === 0 && (
            <p className="px-4 py-8 text-center text-zinc-400 italic text-xs">
              Nenhuma venda no PIX encontrada com os filtros selecionados.
            </p>
          )}
          {filteredPixSales.map((sale) => (
            <div
              key={sale.id}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 ${sale.canceled ? "opacity-50" : ""}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-800">
                  {formatBRL(sale.amount)}{" "}
                  <span className="text-zinc-400 font-normal">
                    · {sale.bankAccountName} · {sale.createdByName}
                  </span>
                </p>
                <p className="text-[11px] text-zinc-400">
                  {new Date(sale.createdAt).toLocaleString("pt-BR")}
                  {sale.customerName ? ` · ${sale.customerName}` : ""}
                  {sale.canceled ? " · Cancelada" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pixStatusBadge(sale.reconciliationStatus)}`}
                >
                  {sale.reconciliationStatus}
                </span>
                {!sale.canceled && (
                  <select
                    value={sale.reconciliationStatus}
                    onChange={(event) =>
                      bakery.setPixReconciliationStatus(
                        sale.id,
                        event.target.value as BakeryPixReconciliationStatus,
                      )
                    }
                    className="text-[11px] font-semibold bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1"
                  >
                    {PIX_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reopen modal */}
      {reopenTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setReopenTarget(null)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#0B2C52] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Reabrir turno</h3>
              <button
                onClick={() => setReopenTarget(null)}
                className="text-[#F2D3A0] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <p className="text-zinc-600">
                {reopenTarget.registerName} · {reopenTarget.shiftLabel} ·{" "}
                {reopenTarget.operatorName}
              </p>
              {reopenError && (
                <p className="text-[#C8102E] font-semibold">{reopenError}</p>
              )}
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold text-zinc-500 uppercase">
                  Justificativa da reabertura
                </span>
                <textarea
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0B2C52]"
                  rows={3}
                  value={reopenReason}
                  onChange={(event) => setReopenReason(event.target.value)}
                  placeholder="Ex.: Operadora informou saldo final errado"
                />
              </label>
            </div>
            <div className="p-4 border-t border-zinc-100">
              <button
                onClick={confirmReopen}
                className="w-full bg-[#C8102E] hover:bg-[#C8102E]/90 text-white text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer"
              >
                Confirmar reabertura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

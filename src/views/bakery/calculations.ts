/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BakeryExpense, BakeryPixSale, BakeryShift, BakeryWithdrawal } from "../../types";

export interface BakeryShiftTotals {
  caixaExpenses: number;
  bolsaExpenses: number;
  withdrawalsTotal: number;
  pixTotal: number;
  cardMachineTotal: number;
  runningCaixaBalance: number;
  estimatedCashRevenue: number;
  totalRevenue: number;
}

/**
 * Regra 14: Receita estimada em espécie = Saldo final + Despesas do Caixa
 * + Sangrias - Saldo inicial. Despesas da Bolsa não entram nessa conta.
 * Vendas no PIX e nas maquininhas são somadas à parte na receita total do
 * turno, mas nunca na receita em espécie. Movimentações canceladas nunca
 * participam do cálculo.
 */
export function computeShiftTotals(
  shift: BakeryShift,
  expenses: BakeryExpense[],
  withdrawals: BakeryWithdrawal[],
  pixSales: BakeryPixSale[],
): BakeryShiftTotals {
  const activeExpenses = expenses.filter(
    (expense) => expense.shiftId === shift.id && !expense.canceled,
  );
  const caixaExpenses = activeExpenses
    .filter((expense) => expense.source === "CAIXA")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const bolsaExpenses = activeExpenses
    .filter((expense) => expense.source === "BOLSA")
    .reduce((sum, expense) => sum + expense.amount, 0);

  const withdrawalsTotal = withdrawals
    .filter((withdrawal) => withdrawal.shiftId === shift.id && !withdrawal.canceled)
    .reduce((sum, withdrawal) => sum + withdrawal.amount, 0);

  const pixTotal = pixSales
    .filter((sale) => sale.shiftId === shift.id && !sale.canceled)
    .reduce((sum, sale) => sum + sale.amount, 0);

  const runningCaixaBalance =
    shift.initialBalance - caixaExpenses - withdrawalsTotal;

  const finalBalanceCounted = shift.finalBalanceCounted ?? 0;
  const estimatedCashRevenue =
    finalBalanceCounted + caixaExpenses + withdrawalsTotal - shift.initialBalance;

  const cardMachineTotal = (shift.cardMachineEntries || []).reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );

  const totalRevenue = estimatedCashRevenue + pixTotal + cardMachineTotal;

  return {
    caixaExpenses,
    bolsaExpenses,
    withdrawalsTotal,
    pixTotal,
    cardMachineTotal,
    runningCaixaBalance,
    estimatedCashRevenue,
    totalRevenue,
  };
}

export function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

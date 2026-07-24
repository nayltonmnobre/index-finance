/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useBPOState } from '../hooks/useBPOState';
import { AuditLog, UserRole } from '../types';
import {
  Activity,
  ArrowDownToLine,
  Eye,
  Filter,
  Lock,
  LogIn,
  PencilLine,
  Search,
  ShieldCheck,
  X
} from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
  BPO_ADMIN: 'Administrador BPO',
  BPO_TEAM: 'Equipe BPO',
  CLIENT: 'Cliente',
  ACCOUNTANT: 'Contador'
};

const AUDIT_METRIC_VISUALS = [
  { icon: Activity, tint: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300' },
  { icon: Filter, tint: 'bg-[#0B2C52]/5 text-[#0B2C52] dark:bg-[#123B6B]/25 dark:text-[#9DB8D9]' },
  { icon: LogIn, tint: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
  { icon: PencilLine, tint: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
] as const;

const AVATAR_PALETTE = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-purple-500', 'bg-teal-500'];

const getInitials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();

const getAvatarTint = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

function escapeCsv(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function eventIdentifier(log: AuditLog): string {
  let hash = 2166136261;
  const source = `${log.id}|${log.timestamp}|${log.userId}|${log.action}|${log.entityId}`;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `EVT-${(hash >>> 0).toString(16).padStart(8, '0').toUpperCase()}`;
}

function formatJson(value?: string): string {
  if (!value) return 'Não informado';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function AuditLogsView() {
  const { auditLogs, currentUser, companies } = useBPOState();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
    return auditLogs.filter(log => {
      const searchableText = [
        log.action,
        log.userName,
        log.companyName || '',
        log.ipAddress,
        log.entityType,
        log.entityId,
        log.origin
      ].join(' ').toLocaleLowerCase('pt-BR');

      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesRole = roleFilter === 'ALL' || log.role === roleFilter;
      const matchesCompany = companyFilter === 'ALL' || log.companyId === companyFilter;
      return matchesSearch && matchesRole && matchesCompany;
    });
  }, [auditLogs, companyFilter, roleFilter, searchTerm]);

  if (currentUser.role !== 'BPO_ADMIN') {
    return (
      <div className="bg-white dark:bg-[#091320] border border-zinc-200 dark:border-zinc-800 rounded-sm p-8 text-center space-y-3">
        <Lock className="h-8 w-8 mx-auto text-zinc-400 dark:text-zinc-500" />
        <p className="text-zinc-600 dark:text-zinc-300 text-xs font-semibold">
          Apenas o proprietário com perfil Administrador BPO pode visualizar os logs de conformidade.
        </p>
      </div>
    );
  }

  const handleExportCSV = () => {
    const header = [
      'Identificador', 'Data e hora', 'Operador', 'Perfil', 'Empresa', 'Ação',
      'Entidade', 'ID da entidade', 'IP', 'Origem'
    ];
    const rows = filteredLogs.map(log => [
      eventIdentifier(log),
      log.timestamp,
      log.userName,
      ROLE_LABELS[log.role],
      log.companyName || 'Operação global',
      log.action,
      log.entityType,
      log.entityId,
      log.ipAddress,
      log.origin
    ]);
    const csv = '\uFEFF' + [header, ...rows].map(row => row.map(escapeCsv).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `idex-finance-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#0B2C52] dark:text-[#9DB8D9]" />
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">Logs de Conformidade</h2>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">Histórico centralizado de acessos e alterações realizadas no sistema.</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredLogs.length === 0}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-[#0B2C52] hover:bg-[#0B2C52]/90 disabled:opacity-50 px-3 py-2 rounded-sm cursor-pointer disabled:cursor-not-allowed"
        >
          <ArrowDownToLine className="h-4 w-4" /> Exportar CSV ({filteredLogs.length})
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          ['Total de eventos', auditLogs.length],
          ['Resultado filtrado', filteredLogs.length],
          ['Acessos', auditLogs.filter(log => log.action.startsWith('SESSAO_')).length],
          ['Alterações operacionais', auditLogs.filter(log => !log.action.startsWith('SESSAO_')).length],
        ].map(([label, value], index) => {
          const visual = AUDIT_METRIC_VISUALS[index];
          const VisualIcon = visual.icon;
          return (
            <div key={label as string} className="bg-white dark:bg-[#091320] border border-zinc-200 dark:border-zinc-800 rounded-sm p-3 flex flex-col gap-2">
              <div className={`h-7 w-7 rounded-sm flex items-center justify-center ${visual.tint}`}>
                <VisualIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
                <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-0.5">{value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-[#091320] rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-xs p-4 grid md:grid-cols-[1fr_auto_auto] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          <input
            type="search"
            placeholder="Buscar ação, operador, empresa, entidade ou IP..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded-sm border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#0B2C52]"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/70 px-3 rounded-sm border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300">
          <Filter className="h-3.5 w-3.5" />
          <select className="bg-transparent py-2 focus:outline-none cursor-pointer dark:[color-scheme:dark]" value={roleFilter} onChange={event => setRoleFilter(event.target.value as 'ALL' | UserRole)}>
            <option value="ALL">Todos os perfis</option>
            {Object.entries(ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
          </select>
        </div>
        <select className="bg-zinc-50 dark:bg-zinc-800/70 px-3 py-2 rounded-sm border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none cursor-pointer dark:[color-scheme:dark]" value={companyFilter} onChange={event => setCompanyFilter(event.target.value)}>
          <option value="ALL">Todas as empresas</option>
          {companies.map(company => <option key={company.id} value={company.id}>{company.tradeName}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-[#091320] rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead><tr className="bg-zinc-50 dark:bg-[#091320]/60 border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <th className="p-4">Data e hora</th><th className="p-4">Operador</th><th className="p-4">Empresa</th><th className="p-4">Evento</th><th className="p-4">Identificador</th><th className="p-4 text-right">Detalhes</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="p-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`h-6 w-6 rounded-full ${getAvatarTint(log.userName)} text-white text-[9px] font-semibold flex items-center justify-center shrink-0`}>
                        {getInitials(log.userName)}
                      </span>
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-50 block">{log.userName}</span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{ROLE_LABELS[log.role]}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-zinc-700 dark:text-zinc-300">{log.companyName || 'Operação global'}</td>
                  <td className="p-4"><span className="font-semibold text-zinc-900 dark:text-zinc-50">{log.action.replace(/_/g, ' ')}</span><span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-0.5">{log.entityType} · {log.entityId}</span></td>
                  <td className="p-4 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">{eventIdentifier(log)}</td>
                  <td className="p-4 text-right"><button onClick={() => setSelectedLog(log)} className="inline-flex items-center gap-1 text-[#0B2C52] dark:text-[#9DB8D9] font-semibold hover:underline cursor-pointer"><Eye className="h-3.5 w-3.5" /> Ver</button></td>
                </tr>
              ))}
              {filteredLogs.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-zinc-400 dark:text-zinc-500 italic">Nenhum evento encontrado para os filtros selecionados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-white dark:bg-[#091320] rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-[#091320] border-b border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
              <div><h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Detalhes do evento</h3><p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">{eventIdentifier(selectedLog)}</p></div>
              <button onClick={() => setSelectedLog(null)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm cursor-pointer text-zinc-600 dark:text-zinc-300"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-5 text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  ['Data e hora', new Date(selectedLog.timestamp).toLocaleString('pt-BR')],
                  ['Operador', selectedLog.userName],
                  ['Perfil', ROLE_LABELS[selectedLog.role]],
                  ['Empresa', selectedLog.companyName || 'Operação global'],
                  ['Ação', selectedLog.action],
                  ['Origem', selectedLog.origin],
                  ['Entidade', `${selectedLog.entityType} · ${selectedLog.entityId}`],
                  ['Endereço IP', selectedLog.ipAddress]
                ].map(([label, value]) => <div key={label} className="bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-sm p-3"><span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 block">{label}</span><span className="text-zinc-800 dark:text-zinc-100 font-semibold mt-1 block break-all">{value}</span></div>)}
              </div>
              <div><p className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Dados anteriores</p><pre className="bg-zinc-950 dark:bg-black text-zinc-200 rounded-sm p-3 overflow-x-auto text-[10px]">{formatJson(selectedLog.previousData)}</pre></div>
              <div><p className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 mb-1">Dados posteriores</p><pre className="bg-zinc-950 dark:bg-black text-zinc-200 rounded-sm p-3 overflow-x-auto text-[10px]">{formatJson(selectedLog.nextData)}</pre></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

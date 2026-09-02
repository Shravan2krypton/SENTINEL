import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { History, ShieldCheck, Filter } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await api.getAuditLogs(100);
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (actionFilter === 'ALL') return true;
    return log.action.includes(actionFilter);
  });

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
        <div className="flex items-center space-x-3">
          <History className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase">SECURITY AUDIT & COMPLIANCE TRAIL</h2>
            <p className="text-[11px] text-slate-400">Append-only immutable record of all operator queries, vehicle lookups, and watchlist modifications (Section 30).</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px]">
          <span className="text-slate-400">FILTER ACTION:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="LOGIN">Logins</option>
            <option value="SEARCH">Vehicle Searches</option>
            <option value="WATCHLIST">Watchlist Modifications</option>
            <option value="JOURNEY">Journey Queries</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-[11px] text-slate-400 border-b border-slate-800">
            <tr>
              <th className="pb-3">TIMESTAMP</th>
              <th className="pb-3">USER / BADGE</th>
              <th className="pb-3">ROLE</th>
              <th className="pb-3">ACTION</th>
              <th className="pb-3">RESOURCE</th>
              <th className="pb-3">RESULT</th>
              <th className="pb-3">IP ADDRESS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-[11px]">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2.5 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="py-2.5 font-bold text-slate-200">{log.username}</td>
                <td className="py-2.5 text-slate-300">{log.role}</td>
                <td className="py-2.5 font-bold text-sky-400">{log.action}</td>
                <td className="py-2.5 text-slate-400 truncate max-w-[200px]">{log.resource}</td>
                <td className="py-2.5">
                  <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                    log.result === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800' : 'text-rose-400 bg-rose-950/60 border border-rose-800'
                  }`}>
                    {log.result}
                  </span>
                </td>
                <td className="py-2.5 text-slate-400">{log.ip_address || '127.0.0.1'}</td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  {loading ? 'Loading audit records...' : 'No audit records found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

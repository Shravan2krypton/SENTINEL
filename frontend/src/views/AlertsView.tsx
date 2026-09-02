import React, { useState } from 'react';
import { Alert, api } from '../lib/api';
import { Bell, CheckCheck, Clock, ShieldAlert, ArrowUpRight } from 'lucide-react';

interface AlertsViewProps {
  alerts: Alert[];
  onRefresh: () => void;
  onSearchPlate: (plate: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onRefresh, onSearchPlate }) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateStatus = async (alertId: string, status: string) => {
    setUpdatingId(alertId);
    try {
      await api.updateAlertStatus(alertId, status, `Updated status to ${status} from Command UI`);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'ALL') return true;
    return a.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
        <div className="flex items-center space-x-3">
          <Bell className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase font-mono">REAL-TIME ALERT DISPATCH</h2>
            <p className="text-[11px] text-slate-400">Automated alerts broadcast directly from Watchlist Matcher and AI Event Bus.</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono">
          {(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded text-[11px] transition-colors ${
                filter === s
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const isCritical = alert.severity === 'CRITICAL';
          const isActive = alert.status === 'ACTIVE';

          return (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all ${
                isActive
                  ? isCritical
                    ? 'bg-rose-950/30 border-rose-500/60 shadow-lg shadow-rose-950/20'
                    : 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-sentinel-panel border-sentinel-border opacity-85'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                <div className="flex items-center space-x-3 font-mono">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    isCritical ? 'bg-rose-600 text-white' : 'bg-amber-600 text-slate-950'
                  }`}>
                    {alert.severity}
                  </span>
                  <button
                    onClick={() => onSearchPlate(alert.plate_number)}
                    className="text-base font-black text-white hover:text-sky-400 flex items-center space-x-1"
                  >
                    <span>{alert.plate_number}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <span className="text-xs text-slate-400">• {alert.alert_type}</span>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-slate-400">Status:</span>
                  <span className={`font-bold ${
                    isActive ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {alert.status}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 font-mono mb-3">{alert.notes}</div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 gap-2">
                <div className="flex items-center space-x-4">
                  <span>Location: <strong className="text-slate-200">{alert.location_name || alert.camera_id}</strong></span>
                  <span>District: <strong className="text-slate-200">{alert.district || 'Gujarat'}</strong></span>
                  <span>PTS: <strong className="text-amber-300">{new Date(alert.timestamp_pts).toLocaleTimeString()}</strong></span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  {isActive && (
                    <button
                      onClick={() => handleUpdateStatus(alert.id, 'ACKNOWLEDGED')}
                      disabled={updatingId === alert.id}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded font-bold text-[11px] transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(alert.id, 'RESOLVED')}
                      disabled={updatingId === alert.id}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[11px] transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="p-12 text-center text-slate-500 text-xs font-mono rounded-xl bg-sentinel-panel border border-sentinel-border">
            No alerts matching filter [{filter}].
          </div>
        )}
      </div>
    </div>
  );
};

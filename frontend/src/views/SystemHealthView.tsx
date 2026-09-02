import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Activity, Database, Cpu, Radio, ShieldCheck, RefreshCw } from 'lucide-react';

export const SystemHealthView: React.FC = () => {
  const [health, setHealth] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const [hRes, mRes] = await Promise.all([
        api.getHealth(),
        api.getMetrics()
      ]);
      setHealth(hRes);
      setMetrics(mRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
        <div className="flex items-center space-x-3">
          <Activity className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase">SYSTEM HEALTH & TELEMETRY DASHBOARD</h2>
            <p className="text-[11px] text-slate-400">Live hardware, database, PostGIS spatial engine, and AI inference metrics (Rule 1: No fake data).</p>
          </div>
        </div>

        <button
          onClick={fetchHealth}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded text-xs flex items-center space-x-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Neon PostgreSQL & PostGIS */}
          <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs">DATABASE / POSTGIS</span>
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400">{health.components.database.status}</div>
            <div className="text-[11px] text-slate-300">{health.components.database.engine}</div>
            <div className="text-[10px] text-slate-400 truncate">PostGIS: {health.components.database.postgis_version}</div>
            <div className="text-[10px] text-amber-300">Query Latency: {health.components.database.latency_ms} ms</div>
          </div>

          {/* AI Inference Engine */}
          <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs">AI PIPELINE ENGINE</span>
              <Cpu className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl font-bold text-sky-400">{health.components.ai_engine.status}</div>
            <div className="text-[11px] text-slate-300">{health.components.ai_engine.details.detector}</div>
            <div className="text-[10px] text-slate-400">OCR: {health.components.ai_engine.details.ocr}</div>
            <div className="text-[10px] text-emerald-400">Device: {health.components.ai_engine.device.toUpperCase()}</div>
          </div>

          {/* Streaming Engine */}
          <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs">RTSP / STREAM MANAGER</span>
              <Radio className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-400">{health.components.streaming_engine.status}</div>
            <div className="text-[11px] text-slate-300">Transport: RTSP over TCP</div>
            <div className="text-[10px] text-slate-400">Active Workers: {health.components.streaming_engine.active_workers}</div>
            <div className="text-[10px] text-slate-400">Backoff Reconnect: Exponential (Rule 13)</div>
          </div>

          {/* System Resources */}
          <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs">HOST SYSTEM RESOURCES</span>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-white">{health.system_metrics.cpu_percent}% CPU</div>
            <div className="text-[11px] text-slate-300">RAM: {health.system_metrics.memory_used_mb} MB / {health.system_metrics.memory_total_mb} MB</div>
            <div className="text-[10px] text-slate-400">Usage: {health.system_metrics.memory_percent}%</div>
          </div>
        </div>
      )}

      {/* Grid Network Statistics */}
      {metrics && (
        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">STATEWIDE CCTV NETWORK METRICS</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-[10px]">TOTAL DISCOVERED CAMERAS</div>
              <div className="text-lg font-bold text-white mt-1">{metrics.cameras.total}</div>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-[10px]">CAMERAS STREAMING ONLINE</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">{metrics.cameras.online}</div>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-[10px]">TOTAL ANPR DETECTIONS PERSISTED</div>
              <div className="text-lg font-bold text-amber-400 mt-1">{metrics.ai_processing.total_anpr_detections}</div>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-[10px]">UNRESOLVED WATCHLIST ALERTS</div>
              <div className="text-lg font-bold text-rose-400 mt-1">{metrics.security.active_alerts}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Camera, Alert, ANPRDetection } from '../lib/api';
import { LiveMap } from '../components/LiveMap';
import { StreamPlayer } from '../components/StreamPlayer';
import { 
  Video, 
  ShieldAlert, 
  Eye, 
  Cpu, 
  RefreshCw, 
  ArrowUpRight,
  Radio
} from 'lucide-react';

interface DashboardViewProps {
  cameras: Camera[];
  alerts: Alert[];
  detections: ANPRDetection[];
  onSyncSentinel: () => void;
  isSyncing: boolean;
  onSelectCamera: (cam: Camera) => void;
  onSearchPlate: (plate: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cameras,
  alerts,
  detections,
  onSyncSentinel,
  isSyncing,
  onSelectCamera,
  onSearchPlate
}) => {
  const onlineCount = cameras.filter((c) => c.status === 'ONLINE').length;
  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const featuredCamera = cameras[0];

  return (
    <div className="space-y-6">
      {/* Top Banner with Sentinel Grid Sync */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-mono uppercase text-emerald-400 font-bold">SENTINEL CCTV GRID FEDERATION</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">Gujarat Statewide Command & Intelligence</h2>
          <p className="text-xs text-slate-400">
            Federated stream layer above municipal and highway CCTV networks. Consuming dynamic catalogue from <code className="text-sky-400 font-mono">GET /api/ingest</code>.
          </p>
        </div>
        <button
          onClick={onSyncSentinel}
          disabled={isSyncing}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-sky-900/30 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing Grid...' : 'Sync Sentinel Ingest'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">FEDERATED CAMERAS</span>
            <Video className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{cameras.length}</div>
          <div className="text-[11px] text-emerald-400 mt-1 font-mono">{onlineCount} Online • {cameras.length - onlineCount} Offline</div>
        </div>

        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">ACTIVE ALERTS</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">{activeAlerts.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Target Watchlist Hits</div>
        </div>

        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">ANPR CONFIRMED</span>
            <Eye className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{detections.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Temporal OCR Fused</div>
        </div>

        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono">AI PIPELINE ENGINE</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">ACTIVE</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">YOLOv8 + OCR + ByteTrack</div>
        </div>
      </div>

      {/* Main Center Section: Live Stream + GIS Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Featured Live Stream */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider">PRIMARY STREAM VIEWER</h3>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>LIVE FEED</span>
            </span>
          </div>
          {featuredCamera ? (
            <StreamPlayer
              cameraId={featuredCamera.id}
              cameraName={featuredCamera.name}
              locationName={featuredCamera.location_name}
              codec={featuredCamera.codec}
              resolution={featuredCamera.resolution}
              status={featuredCamera.status}
            />
          ) : (
            <div className="h-64 bg-slate-950 rounded-xl flex items-center justify-center text-slate-500 text-xs">
              No camera stream loaded
            </div>
          )}
        </div>

        {/* GIS Regional Map */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider">STATEWIDE GIS GRID</h3>
            <span className="text-[11px] font-mono text-slate-400">{cameras.length} Active Nodes</span>
          </div>
          <LiveMap cameras={cameras} onSelectCamera={onSelectCamera} height="360px" />
        </div>
      </div>

      {/* Bottom Row: Recent Detections & Watchlist Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Real-Time ANPR Feed */}
        <div className="lg:col-span-7 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider">LATEST ANPR DETECTIONS (FUSED)</h3>
            <span className="text-[10px] text-slate-500 font-mono">Click plate to reconstruct journey</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-2">REGISTRATION</th>
                  <th className="pb-2">VEHICLE</th>
                  <th className="pb-2">LOCATION</th>
                  <th className="pb-2">PTS TIME</th>
                  <th className="pb-2">CONF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {detections.slice(0, 6).map((det) => (
                  <tr key={det.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 font-bold text-amber-300">
                      <button
                        onClick={() => onSearchPlate(det.plate_normalized)}
                        className="hover:underline flex items-center space-x-1"
                      >
                        <span>{det.plate_normalized}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-500" />
                      </button>
                    </td>
                    <td className="py-2 text-slate-300 capitalize">{det.vehicle_class}</td>
                    <td className="py-2 text-slate-400 truncate max-w-[140px]">{det.location_name || det.camera_id}</td>
                    <td className="py-2 text-slate-400">{new Date(det.timestamp_pts).toLocaleTimeString()}</td>
                    <td className="py-2 text-emerald-400">{(det.confidence * 100).toFixed(0)}%</td>
                  </tr>
                ))}
                {detections.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500 font-mono">
                      No vehicles detected yet. Video stream worker actively sampling frames...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Watchlist Hits Feed */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider">LIVE WATCHLIST HITS</h3>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => onSearchPlate(alert.plate_number)}
                className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/30 hover:border-rose-500 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-rose-400">{alert.plate_number}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-900/60 text-rose-300 uppercase font-bold">
                    {alert.severity}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1 line-clamp-1">{alert.notes}</div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>{alert.location_name || alert.camera_id}</span>
                  <span>{new Date(alert.timestamp_pts).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            {activeAlerts.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-xs font-mono">
                No active watchlist alerts. Monitoring grid...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

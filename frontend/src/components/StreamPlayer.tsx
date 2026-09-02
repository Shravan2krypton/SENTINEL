import React, { useState } from 'react';
import { Camera, Maximize2, RefreshCw, Eye, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface StreamPlayerProps {
  cameraId: string;
  cameraName: string;
  locationName: string;
  codec: string;
  resolution: string;
  status: string;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  cameraId,
  cameraName,
  locationName,
  codec,
  resolution,
  status
}) => {
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const streamUrl = `${api.getLiveStreamUrl(cameraId)}?t=${reloadKey}`;

  const handleRefresh = () => {
    setHasError(false);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className={`relative bg-black rounded-xl overflow-hidden border border-sentinel-border shadow-2xl flex flex-col ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'
    }`}>
      {/* Top Telemetry Header */}
      <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold text-white font-mono">{cameraId}</span>
          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">• {cameraName}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-amber-400">
            {codec}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-sky-400">
            {resolution}
          </span>
          <button
            onClick={handleRefresh}
            title="Reconnect Stream"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Stream Area */}
      <div className="relative flex-1 bg-slate-950 flex items-center justify-center min-h-[280px]">
        {!hasError ? (
          <img
            src={streamUrl}
            alt={`Live feed from ${cameraId}`}
            onError={() => setHasError(true)}
            className="w-full h-full object-contain max-h-[480px]"
          />
        ) : (
          <div className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-white">Stream Reconnecting</p>
            <p className="text-[11px] text-slate-400 font-mono mt-1">Applying exponential TCP backoff (Rule 13)...</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-3 py-1 bg-sky-600 hover:bg-sky-500 rounded text-xs text-white font-medium"
            >
              Manual Retry
            </button>
          </div>
        )}

        {/* Live AI Overlay Badge */}
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>AI ANPR ACTIVE</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">{locationName}</span>
        </div>
      </div>
    </div>
  );
};

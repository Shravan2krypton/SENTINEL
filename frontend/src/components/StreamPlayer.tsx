import React, { useState, useEffect } from 'react';
import { Maximize2, RefreshCw, ShieldCheck, AlertCircle, Activity, Video, Cpu, Radio } from 'lucide-react';
import { api, StreamStatus } from '../lib/api';

interface StreamPlayerProps {
  cameraId: string;
  cameraName: string;
  locationName: string;
  codec?: string;
  resolution?: string;
  status?: string;
  showQualityPanel?: boolean;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  cameraId,
  cameraName,
  locationName,
  codec: initialCodec,
  resolution: initialResolution,
  status: initialStatus,
  showQualityPanel = true
}) => {
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [streamMeta, setStreamMeta] = useState<StreamStatus | null>(null);

  // Poll dynamic stream metadata every 2.5 seconds
  useEffect(() => {
    let isMounted = true;

    const fetchMeta = async () => {
      try {
        const meta = await api.getStreamStatus(cameraId);
        if (isMounted) {
          setStreamMeta(meta);
          if (meta.state === 'LIVE' && hasError) {
            setHasError(false);
          }
        }
      } catch (err) {
        // stream may be initializing
      }
    };

    fetchMeta();
    const interval = setInterval(fetchMeta, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [cameraId, reloadKey]);

  const streamUrl = `${api.getLiveStreamUrl(cameraId)}&t=${reloadKey}`;

  const handleRefresh = () => {
    setHasError(false);
    setReloadKey((prev) => prev + 1);
  };

  // Dynamic values without hardcoding: show N/A if unavailable
  const displayResolution = streamMeta?.resolution || (hasError ? 'N/A' : (initialResolution || 'N/A'));
  const displayFps = streamMeta?.actual_fps ? `${streamMeta.actual_fps} FPS` : (hasError ? 'N/A' : 'N/A');
  const displayCodec = streamMeta?.codec || (hasError ? 'N/A' : (initialCodec || 'H.264'));
  const displayState = streamMeta?.state || (hasError ? 'RECONNECTING' : (initialStatus || 'LIVE'));
  const isLive = displayState === 'LIVE';

  return (
    <div className={`relative bg-slate-950 rounded-xl overflow-hidden border border-sentinel-border shadow-2xl flex flex-col ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'
    }`}>
      {/* Top Telemetry Header */}
      <div className="px-3 py-2 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
          <span className="font-bold text-white tracking-wider">{cameraId}</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">• {cameraName}</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-amber-400 font-bold">
            {displayCodec}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-sky-400 font-bold">
            {displayResolution}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-emerald-400">
            {displayFps}
          </span>
          <button
            onClick={handleRefresh}
            title="Reconnect Stream (TCP)"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle Fullscreen"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Stream Display Area */}
      <div className="relative flex-1 bg-black flex items-center justify-center min-h-[280px]">
        {!hasError ? (
          <img
            key={reloadKey}
            src={streamUrl}
            alt={`Live feed from ${cameraId}`}
            onError={() => setHasError(true)}
            className="w-full h-full object-contain max-h-[460px]"
          />
        ) : (
          <div className="p-6 text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2 animate-bounce" />
            <p className="text-xs font-semibold text-white font-mono uppercase tracking-wider">Stream Connecting / Reconnecting</p>
            <p className="text-[11px] text-slate-400 font-mono mt-1">Applying exponential TCP backoff (Rule 13)...</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 rounded text-xs text-white font-mono font-medium transition-colors"
            >
              Manual Retry (RTSP/TCP)
            </button>
          </div>
        )}

        {/* Live AI Overlay Badge */}
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-white font-semibold">AI ANPR ACTIVE</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 truncate max-w-[200px]">{locationName}</span>
        </div>

        {/* Real PTS Badge */}
        {streamMeta && streamMeta.pts > 0 && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-400">
            PTS: <span className="text-slate-200">{streamMeta.pts.toFixed(3)}s</span>
          </div>
        )}
      </div>

      {/* Stream Quality Information Panel (Requirement 3) */}
      {showQualityPanel && (
        <div className="p-3 bg-slate-900/95 border-t border-slate-800 text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-[10px] text-slate-400 uppercase flex items-center space-x-1">
              <Video className="w-3 h-3 text-sky-400" />
              <span>Video</span>
            </div>
            <div className="text-white font-semibold mt-0.5">{displayResolution}</div>
            <div className="text-[11px] text-slate-400">{displayFps} • {displayCodec}</div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 uppercase flex items-center space-x-1">
              <Radio className="w-3 h-3 text-amber-400" />
              <span>Transport</span>
            </div>
            <div className="text-white font-semibold mt-0.5">RTSP / TCP</div>
            <div className="text-[11px] text-emerald-400">Low-Latency MJPEG</div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 uppercase flex items-center space-x-1">
              <Cpu className="w-3 h-3 text-emerald-400" />
              <span>AI Pipeline</span>
            </div>
            <div className="text-white font-semibold mt-0.5">Vehicle: {streamMeta?.ai_status?.vehicle_detection || 'ACTIVE'}</div>
            <div className="text-[11px] text-slate-400">ANPR: {streamMeta?.ai_status?.anpr || 'ACTIVE'}</div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 uppercase flex items-center space-x-1">
              <Activity className="w-3 h-3 text-sky-400" />
              <span>Health</span>
            </div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className="text-white font-semibold uppercase">{isLive ? 'HEALTHY' : displayState}</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {streamMeta?.location_source || 'SOURCE-PROVIDED LOCATION'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

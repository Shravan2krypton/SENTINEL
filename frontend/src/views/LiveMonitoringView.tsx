import React, { useState } from 'react';
import { Camera } from '../lib/api';
import { StreamPlayer } from '../components/StreamPlayer';
import { Video, Filter, CheckCircle2, XCircle, Radio } from 'lucide-react';

interface LiveMonitoringViewProps {
  cameras: Camera[];
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({ cameras }) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedCodec, setSelectedCodec] = useState<string>('ALL');
  const [activeCamera, setActiveCamera] = useState<Camera | null>(cameras[0] || null);

  const districts = ['ALL', ...Array.from(new Set(cameras.map((c) => c.district)))];

  const filteredCameras = cameras.filter((cam) => {
    if (selectedDistrict !== 'ALL' && cam.district !== selectedDistrict) return false;
    if (selectedCodec !== 'ALL' && cam.codec !== selectedCodec) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
        <div className="flex items-center space-x-3">
          <Video className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase font-mono">UNIFIED CCTV STREAM VIEWER</h2>
            <p className="text-[11px] text-slate-400">Select any camera feed to monitor live video with real-time AI ANPR inference.</p>
          </div>
        </div>

        {/* District & Codec Filters */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">DISTRICT:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none"
            >
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-slate-400">CODEC:</span>
            <select
              value={selectedCodec}
              onChange={(e) => setSelectedCodec(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none"
            >
              <option value="ALL">ALL</option>
              <option value="H264">H.264</option>
              <option value="H265">H.265</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Layout: Selected Active Stream + Camera Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Stream Preview */}
        <div className="lg:col-span-7">
          {activeCamera ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-sky-400 font-bold tracking-wider">
                  ACTIVE FOCUS FEED • {activeCamera.district.toUpperCase()}
                </span>
                <span className="text-xs font-mono text-slate-400">{activeCamera.rtsp_url}</span>
              </div>
              <StreamPlayer
                cameraId={activeCamera.id}
                cameraName={activeCamera.name}
                locationName={activeCamera.location_name}
                codec={activeCamera.codec}
                resolution={activeCamera.resolution}
                status={activeCamera.status}
              />
            </div>
          ) : (
            <div className="h-80 bg-slate-950 rounded-xl flex items-center justify-center text-slate-500 font-mono text-xs">
              Select a camera to start live view
            </div>
          )}
        </div>

        {/* Camera Feed Cards Grid */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider">
              CAMERA GRID ({filteredCameras.length})
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Click to monitor</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredCameras.map((cam) => {
              const isSelected = activeCamera?.id === cam.id;
              const isOnline = cam.status === 'ONLINE';

              return (
                <div
                  key={cam.id}
                  onClick={() => setActiveCamera(cam)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-950/40 border-sky-500 shadow-lg shadow-sky-950/40'
                      : 'bg-sentinel-panel border-sentinel-border hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-white truncate max-w-[140px]">
                      {cam.id}
                    </span>
                    <span className={`flex items-center space-x-1 text-[10px] font-mono font-bold ${
                      isOnline ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isOnline ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{cam.status}</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 font-medium line-clamp-1">{cam.name}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mb-2">{cam.location_name}</div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800">
                    <span className="text-amber-400">{cam.codec}</span>
                    <span>{cam.reported_fps} FPS</span>
                    <span className="text-sky-400">{cam.district}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

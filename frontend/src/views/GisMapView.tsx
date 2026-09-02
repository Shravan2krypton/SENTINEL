import React, { useState } from 'react';
import { Camera } from '../lib/api';
import { LiveMap } from '../components/LiveMap';
import { StreamPlayer } from '../components/StreamPlayer';
import { Map as MapIcon, Video, Radio, Layers } from 'lucide-react';

interface GisMapViewProps {
  cameras: Camera[];
}

export const GisMapView: React.FC<GisMapViewProps> = ({ cameras }) => {
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(cameras[0] || null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
        <div className="flex items-center space-x-3">
          <MapIcon className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase font-mono">STATEWIDE GIS CAMERA GRID</h2>
            <p className="text-[11px] text-slate-400">Geographically distributed CCTV nodes across Gujarat state highways and municipal junctions.</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
            {cameras.length} Total Registered Nodes
          </span>
        </div>
      </div>

      {/* Main Layout: Full GIS Map + Focus Camera Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <LiveMap
            cameras={cameras}
            selectedCameraId={selectedCamera?.id}
            onSelectCamera={(cam) => setSelectedCamera(cam)}
            height="620px"
          />
        </div>

        {/* Selected Camera Drawer & Live Feed */}
        <div className="lg:col-span-4 space-y-4">
          {selectedCamera ? (
            <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-mono text-sky-400 uppercase font-bold tracking-wider">SELECTED CCTV NODE</span>
                <h3 className="text-sm font-bold text-white font-mono mt-1">{selectedCamera.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedCamera.location_name}</p>
              </div>

              {/* Stream Preview */}
              <div>
                <StreamPlayer
                  cameraId={selectedCamera.id}
                  cameraName={selectedCamera.name}
                  locationName={selectedCamera.location_name}
                  codec={selectedCamera.codec}
                  resolution={selectedCamera.resolution}
                  status={selectedCamera.status}
                />
              </div>

              {/* Camera Specs */}
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs font-mono space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Node ID:</span>
                  <span className="text-white font-bold">{selectedCamera.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">District:</span>
                  <span className="text-amber-300">{selectedCamera.district}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Coordinates:</span>
                  <span className="text-slate-300">{selectedCamera.latitude.toFixed(4)}°N, {selectedCamera.longitude.toFixed(4)}°E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stream Codec:</span>
                  <span className="text-sky-400">{selectedCamera.codec}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Resolution / FPS:</span>
                  <span className="text-slate-300">{selectedCamera.resolution} @ {selectedCamera.reported_fps} fps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RTSP Transport:</span>
                  <span className="text-emerald-400 font-bold">TCP (Rule 10)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 rounded-xl bg-sentinel-panel border border-sentinel-border flex items-center justify-center text-xs text-slate-500 font-mono">
              Click a camera marker on the map to inspect stream
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

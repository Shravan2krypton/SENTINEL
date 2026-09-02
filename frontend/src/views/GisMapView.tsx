import React, { useState, useEffect } from 'react';
import { Camera, VehicleJourney, api } from '../lib/api';
import { LiveMap } from '../components/LiveMap';
import { StreamPlayer } from '../components/StreamPlayer';
import { Map as MapIcon, Video, Radio, Search, Navigation as NavIcon, Clock, ShieldAlert, ArrowRight } from 'lucide-react';

interface GisMapViewProps {
  cameras: Camera[];
}

export const GisMapView: React.FC<GisMapViewProps> = ({ cameras }) => {
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(cameras[0] || null);
  const [plateQuery, setPlateQuery] = useState('GJ06AB1234');
  const [journey, setJourney] = useState<VehicleJourney | null>(null);
  const [loadingJourney, setLoadingJourney] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  // Auto-load demonstration journey on mount
  useEffect(() => {
    handleLoadJourney('GJ06AB1234');
  }, []);

  // Sync selected camera if cameras list updates and none selected
  useEffect(() => {
    if (!selectedCamera && cameras.length > 0) {
      setSelectedCamera(cameras[0]);
    }
  }, [cameras]);

  const handleLoadJourney = async (plate: string) => {
    if (!plate.trim()) return;
    setLoadingJourney(true);
    try {
      const clean = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const res = await api.getVehicleJourney(clean);
      setJourney(res);

      // If journey has steps, focus on the first observed camera
      if (res.steps && res.steps.length > 0) {
        const firstCamId = res.steps[0].camera_id;
        const matchingCam = cameras.find((c) => c.id === firstCamId);
        if (matchingCam) {
          setSelectedCamera(matchingCam);
          setActiveStepIndex(0);
        }
      }
    } catch (err) {
      console.warn('Failed to load vehicle journey:', err);
    } finally {
      setLoadingJourney(false);
    }
  };

  const handleSelectTimelineStep = (step: any, index: number) => {
    setActiveStepIndex(index);
    const matched = cameras.find((c) => c.id === step.camera_id);
    if (matched) {
      setSelectedCamera(matched);
    }
  };

  const handleOpenLiveFromMap = (cameraId: string) => {
    const matched = cameras.find((c) => c.id === cameraId);
    if (matched) {
      setSelectedCamera(matched);
    }
  };

  // Filter observed steps for timeline
  const observedSteps = journey?.steps?.filter((s) => s.step_type === 'OBSERVED_DETECTION') || [];

  return (
    <div className="space-y-4">
      {/* Top Controls Bar: GIS Grid Header & Quick Target Vehicle Search */}
      <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
            <MapIcon className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">STATEWIDE GIS INVESTIGATION GRID</h2>
            <p className="text-[11px] text-slate-400">Satellite-correlated CCTV feeds with real-time transit corridor reconstruction.</p>
          </div>
        </div>

        {/* Search Bar for Vehicle Journey Re-Correlation */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLoadJourney(plateQuery);
          }}
          className="flex items-center space-x-2 w-full md:w-auto"
        >
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={plateQuery}
              onChange={(e) => setPlateQuery(e.target.value.toUpperCase())}
              placeholder="Search Plate (e.g. GJ06AB1234)"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-amber-300 font-bold tracking-wider placeholder:text-slate-500 focus:border-sky-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loadingJourney}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-semibold text-xs transition-colors shrink-0 disabled:opacity-50"
          >
            {loadingJourney ? 'CORRELATING...' : 'LOCATE VEHICLE'}
          </button>
        </form>
      </div>

      {/* Split View: LIVE CAMERA (Left) + SATELLITE MAP (Right) — Requirement 9 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Live Camera Video Stream */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="p-3 bg-slate-950/90 border border-sentinel-border rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2 font-mono text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-slate-400">FEED:</span>
              <span className="text-white font-bold tracking-wide truncate max-w-[220px]">
                {selectedCamera?.name || 'Select Camera on Map'}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-amber-400">
              {selectedCamera?.district || 'GUJARAT'}
            </span>
          </div>

          {selectedCamera ? (
            <StreamPlayer
              cameraId={selectedCamera.id}
              cameraName={selectedCamera.name}
              locationName={selectedCamera.location_name}
              codec={selectedCamera.codec}
              resolution={selectedCamera.resolution}
              status={selectedCamera.status}
              showQualityPanel={true}
            />
          ) : (
            <div className="h-64 rounded-xl bg-slate-950 border border-sentinel-border flex items-center justify-center text-xs text-slate-500 font-mono">
              Select a camera marker on the map to initialize live video
            </div>
          )}
        </div>

        {/* Right Column: Satellite GIS Map */}
        <div className="lg:col-span-7">
          <LiveMap
            cameras={cameras}
            selectedCameraId={selectedCamera?.id}
            onSelectCamera={(cam) => setSelectedCamera(cam)}
            onOpenLiveView={handleOpenLiveFromMap}
            journey={journey}
            height="500px"
            defaultBasemap="SATELLITE"
          />
        </div>
      </div>

      {/* Bottom Section: VEHICLE TIMELINE — Requirement 9 */}
      <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2.5 gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white uppercase tracking-wider">VEHICLE TRANSIT TIMELINE</h3>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-black">
              {journey?.plate_number || plateQuery}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center space-x-3">
            <span>Estimated Distance: <strong className="text-white">{journey?.total_estimated_distance_km || 0} km</strong></span>
            <span>Duration: <strong className="text-white">{journey?.total_duration_minutes || 0} min</strong></span>
          </div>
        </div>

        {/* Timeline Sequence Steps */}
        {observedSteps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {observedSteps.map((step, idx) => {
              const isCurrent = selectedCamera?.id === step.camera_id;
              const timeStr = new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectTimelineStep(step, idx)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isCurrent
                      ? 'bg-sky-950/70 border-sky-500 ring-2 ring-sky-500/30'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-sky-400">CHECKPOINT #{idx + 1}</span>
                    <span className="font-mono text-amber-300 font-semibold">{timeStr}</span>
                  </div>

                  <div className="text-xs font-bold text-white truncate mb-0.5">
                    {step.location_name}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span className="text-[10px] text-slate-500 truncate">{step.camera_id}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      {((step.confidence || 0.92) * 100).toFixed(0)}% Conf
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-slate-500">
            No chronological observations for this plate query. Enter a valid registration like GJ06AB1234 to reconstruct transit.
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { api, ANPRDetection, VehicleJourney, Camera } from '../lib/api';
import { LiveMap } from '../components/LiveMap';
import { 
  Search, 
  Car, 
  MapPin, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle,
  FileText,
  Navigation as NavIcon
} from 'lucide-react';

interface VehicleSearchViewProps {
  initialPlate?: string;
  onOpenDossier?: (plate: string) => void;
  cameras?: Camera[];
  onOpenLiveView?: (cameraId: string) => void;
}

export const VehicleSearchView: React.FC<VehicleSearchViewProps> = ({ initialPlate = '', onOpenDossier, cameras = [], onOpenLiveView }) => {
  const [plateQuery, setPlateQuery] = useState(initialPlate || 'GJ06AB1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<ANPRDetection[]>([]);
  const [journey, setJourney] = useState<VehicleJourney | null>(null);
  const [vahan, setVahan] = useState<any | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!plateQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const clean = plateQuery.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      
      // Parallel fetch: detections history, journey reconstruction, VAHAN registry
      const [detsRes, journeyRes, vahanRes] = await Promise.allSettled([
        api.searchVehicle(clean),
        api.getVehicleJourney(clean),
        api.getVahanDetails(clean)
      ]);

      if (detsRes.status === 'fulfilled') setDetections(detsRes.value);
      if (journeyRes.status === 'fulfilled') setJourney(journeyRes.value);
      if (vahanRes.status === 'fulfilled') setVahan(vahanRes.value);
      else setVahan(null);

    } catch (err: any) {
      setError(err.message || 'Failed to search vehicle records');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Bar */}
      <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={plateQuery}
              onChange={(e) => setPlateQuery(e.target.value.toUpperCase())}
              placeholder="Enter Vehicle Registration (e.g. GJ06AB1234)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-sky-900/30 transition-all font-mono"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? 'ANALYZING GRID...' : 'RECONSTRUCT JOURNEY'}</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-lg text-xs text-rose-300 flex items-center space-x-2 font-mono">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Target Vehicle Summary & VAHAN Registry Integration */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Vehicle Registration Profile */}
        <div className="md:col-span-5 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Car className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-mono text-slate-400">VEHICLE IDENTIFIER</div>
                <div className="text-base font-black text-amber-400 font-mono tracking-wider">
                  {plateQuery || 'GJ06AB1234'}
                </div>
              </div>
            </div>
            {journey?.is_watchlist_hit && (
              <span className="px-2 py-1 rounded bg-rose-900/50 border border-rose-500 text-rose-300 text-[10px] font-mono font-bold uppercase animate-pulse">
                WATCHLIST: {journey.watchlist_category}
              </span>
            )}
          </div>

          {/* VAHAN Data */}
          {vahan ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="text-[11px] text-sky-400 font-bold tracking-wider uppercase">VAHAN REGISTRY PROFILE</div>
              <div className="p-3 bg-slate-900/80 rounded-lg space-y-1.5 border border-slate-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Owner:</span>
                  <span className="text-slate-200 font-semibold">{vahan.owner_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Make / Model:</span>
                  <span className="text-slate-200">{vahan.maker_model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Class:</span>
                  <span className="text-slate-200">{vahan.vehicle_class}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RTO Location:</span>
                  <span className="text-amber-300">{vahan.rto_location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Insurance Validity:</span>
                  <span className="text-emerald-400">{vahan.insurance_validity}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-900/50 rounded-lg text-[11px] text-slate-400 font-mono border border-slate-800">
              VAHAN Registry connector active. (External mock index loaded for demonstration vehicles like GJ06AB1234).
            </div>
          )}

          {/* Detections Summary */}
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-400">TOTAL DETECTIONS</div>
              <div className="text-lg font-bold text-white">{journey?.total_detections || detections.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">ESTIMATED CORRIDOR</div>
              <div className="text-lg font-bold text-amber-400">{journey?.total_estimated_distance_km || 0} km</div>
            </div>
          </div>

          {onOpenDossier && (
            <button
              onClick={() => onOpenDossier(plateQuery)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-mono font-semibold flex items-center justify-center space-x-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>EXPORT CASE DOSSIER</span>
            </button>
          )}
        </div>

        {/* Right: Interactive Journey GIS Map */}
        <div className="md:col-span-7 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider">
              SPATIAL RECONSTRUCTION MAP
            </span>
            <span className="text-[11px] font-mono text-amber-400">
              Vadodara → Anand → Ahmedabad Corridor
            </span>
          </div>
          <LiveMap cameras={[]} journey={journey} height="360px" />
        </div>
      </div>

      {/* Structured Journey Steps: Observed vs Inferred Movement */}
      <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <NavIcon className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-mono uppercase text-white font-bold tracking-wider">
              JOURNEY CHRONOLOGY (OBSERVED VS INFERRED TRANSIT)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Rule 23: Strict distinction between observed CCTV points & inferred highway travel
          </span>
        </div>

        <div className="space-y-3">
          {journey?.steps && journey.steps.length > 0 ? (
            journey.steps.map((step) => {
              const isObserved = step.step_type === 'OBSERVED_DETECTION';
              const timeStr = new Date(step.timestamp).toLocaleTimeString();

              return (
                <div
                  key={step.step_number}
                  className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                    isObserved
                      ? 'bg-sky-950/30 border-sky-500/40 text-slate-200'
                      : 'bg-amber-950/10 border-amber-500/30 text-amber-200/90 border-dashed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                        isObserved ? 'bg-sky-500 text-slate-950' : 'bg-amber-500 text-slate-950'
                      }`}>
                        {step.step_number}
                      </span>
                      <span className="font-bold">
                        {isObserved ? `OBSERVED AT: ${step.location_name}` : `INFERRED TRANSIT: ${step.location_name}`}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{timeStr}</span>
                  </div>

                  <div className="text-[11px] text-slate-400 ml-7">
                    {isObserved ? (
                      <div className="flex flex-wrap gap-4 mt-1 text-[11px]">
                        <span>Camera: <strong className="text-slate-200">{step.camera_id}</strong></span>
                        <span>District: <strong className="text-slate-200">{step.district}</strong></span>
                        <span>Confidence: <strong className="text-emerald-400">{((step.confidence || 0) * 100).toFixed(1)}%</strong></span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-4 mt-1 text-[11px] text-amber-300/80">
                        <span>Distance: <strong>{step.distance_km} km</strong></span>
                        <span>Duration: <strong>~{step.duration_minutes} mins</strong></span>
                        <span>Est. Speed: <strong>~{step.estimated_speed_kmh} km/h</strong></span>
                        <span>Note: <em>{step.observation_notes}</em></span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              Click 'Reconstruct Journey' to compile detections across the Gujarat CCTV network.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

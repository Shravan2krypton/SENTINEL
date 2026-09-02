import React, { useState } from 'react';
import { api } from '../lib/api';
import { FileText, Download, Printer, Shield, CheckCircle } from 'lucide-react';

interface InvestigationsViewProps {
  initialPlate?: string;
}

export const InvestigationsView: React.FC<InvestigationsViewProps> = ({ initialPlate = 'GJ06AB1234' }) => {
  const [plate, setPlate] = useState(initialPlate);
  const [title, setTitle] = useState('Interception Dossier: Stolen Vehicle Investigation');
  const [officer, setOfficer] = useState('Insp. R. K. Varma (CID Crime Branch)');
  const [notes, setNotes] = useState('Target vehicle flagged at Vadodara Golden Chokdi transit corridor. Reconstructed movement indicates transit north towards Anand Toll Plaza.');
  const [loading, setLoading] = useState(false);
  const [dossier, setDossier] = useState<any | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.generateDossier({
        plate_number: plate,
        case_title: title,
        investigating_officer: officer,
        case_notes: notes
      });
      setDossier(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
        <div className="flex items-center space-x-3">
          <FileText className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase font-mono">INVESTIGATION DOSSIER WORKSPACE</h2>
            <p className="text-[11px] text-slate-400">Compile evidence-ready investigation records with traceable CCTV timestamps, camera IDs, and spatial transit maps.</p>
          </div>
        </div>

        {dossier && (
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/40 rounded-lg text-xs font-mono font-semibold flex items-center space-x-2"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PRINT / SAVE PDF</span>
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleGenerate} className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        <div>
          <label className="text-slate-400 block mb-1">TARGET VEHICLE REGISTRATION</label>
          <input
            type="text"
            required
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-amber-300 font-bold focus:border-sky-500 outline-none"
          />
        </div>
        <div>
          <label className="text-slate-400 block mb-1">CASE TITLE</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-sky-500 outline-none"
          />
        </div>
        <div>
          <label className="text-slate-400 block mb-1">INVESTIGATING OFFICER / BADGE</label>
          <input
            type="text"
            required
            value={officer}
            onChange={(e) => setOfficer(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-sky-500 outline-none"
          />
        </div>
        <div className="md:col-span-3">
          <label className="text-slate-400 block mb-1">EVIDENTIARY CASE NOTES</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-sky-500 outline-none"
          />
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold transition-all shadow-lg shadow-sky-950/40"
          >
            {loading ? 'COMPILING DOSSIER...' : 'GENERATE CASE DOSSIER'}
          </button>
        </div>
      </form>

      {/* Generated Dossier Preview */}
      {dossier && (
        <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 space-y-6 font-mono text-xs shadow-2xl printable-dossier">
          {/* Official Seal / Header */}
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-sky-400 font-bold tracking-widest uppercase">GUJARAT STATE CCTV INTELLIGENCE PLATFORM (SENTINEL GRID)</div>
              <h3 className="text-lg font-bold text-white mt-1 uppercase">{dossier.title}</h3>
              <p className="text-slate-400 text-xs">Case Reference: <span className="text-amber-400">{dossier.case_id}</span></p>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <div>Date Generated: {new Date(dossier.generated_at).toLocaleString()}</div>
              <div>Investigator: <strong className="text-slate-200">{dossier.investigating_officer}</strong></div>
            </div>
          </div>

          {/* Vehicle & Watchlist Data */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-900/60 border border-slate-800">
            <div>
              <div className="text-[10px] text-slate-400 uppercase mb-1">Target Vehicle Identity</div>
              <div className="text-base font-black text-amber-300">{dossier.vehicle.plate_number}</div>
              {dossier.vehicle.vahan_registration && (
                <div className="text-[11px] text-slate-300 mt-1 space-y-0.5">
                  <div>Model: {dossier.vehicle.vahan_registration.maker_model}</div>
                  <div>Owner: {dossier.vehicle.vahan_registration.owner_name}</div>
                  <div>RTO: {dossier.vehicle.vahan_registration.rto_location}</div>
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase mb-1">Watchlist Flag Classification</div>
              <div className="text-sm font-bold text-rose-400 uppercase">
                {dossier.vehicle.watchlist_status.category || 'Standard Search'}
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                Priority: {dossier.vehicle.watchlist_status.priority || 'NORMAL'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Reason: {dossier.vehicle.watchlist_status.flag_reason || 'Investigation query'}
              </div>
            </div>
          </div>

          {/* Reconstructed Journey Sequence */}
          <div className="space-y-2">
            <div className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">
              Chronological Observed CCTV Detections & Corridor Transit
            </div>
            <div className="space-y-2">
              {dossier.journey_reconstruction.steps.map((step: any) => (
                <div
                  key={step.step_number}
                  className={`p-2.5 rounded border text-[11px] ${
                    step.step_type === 'OBSERVED_DETECTION'
                      ? 'bg-slate-900 border-slate-700 text-slate-200'
                      : 'bg-amber-950/20 border-amber-500/30 text-amber-300/90 border-dashed'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-bold">
                      #{step.step_number} {step.step_type === 'OBSERVED_DETECTION' ? '[OBSERVED CCTV]' : '[INFERRED TRANSIT]'}: {step.location_name}
                    </span>
                    <span className="text-slate-400">{new Date(step.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {step.step_type === 'OBSERVED_DETECTION' ? (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Camera: {step.camera_id} • District: {step.district} • AI Confidence: {((step.confidence || 0) * 100).toFixed(1)}%
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-400/80 mt-0.5">
                      Corridor: {step.distance_km} km in ~{step.duration_minutes} mins (Est. Speed: {step.estimated_speed_kmh} km/h)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes & Analytical Disclaimer */}
          <div className="p-3 bg-slate-900 rounded border border-slate-800 text-[11px] space-y-2">
            <div>
              <div className="text-[10px] text-slate-400 uppercase mb-1">Investigating Notes</div>
              <div className="text-slate-200">{dossier.notes}</div>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 italic">
              * Notice: Inferred transit intervals are calculated from spatio-temporal correlations between verified CCTV observations and do not represent continuous physical surveillance.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

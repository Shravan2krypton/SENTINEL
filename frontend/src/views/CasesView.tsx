import React, { useEffect, useState } from 'react';
import { api, Case, CaseEvidence } from '../lib/api';
import { Briefcase, Plus, FileText, CheckCircle, Clock, ShieldAlert, ArrowRight, Camera } from 'lucide-react';

interface CasesViewProps {
  onOpenDossier: (plate: string) => void;
  onSearchPlate: (plate: string) => void;
}

export const CasesView: React.FC<CasesViewProps> = ({ onOpenDossier, onSearchPlate }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetPlate, setTargetPlate] = useState('GJ06AB1234');
  const [officer, setOfficer] = useState('Insp. R. K. Varma (CID Crime Branch)');
  const [priority, setPriority] = useState('HIGH');
  const [loading, setLoading] = useState(false);

  const fetchCases = async () => {
    try {
      const data = await api.getCases(statusFilter === 'ALL' ? undefined : statusFilter);
      setCases(data);
      if (data.length > 0 && !selectedCase) {
        setSelectedCase(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !officer.trim()) return;

    setLoading(true);
    try {
      await api.createCase({
        title,
        description,
        target_plate: targetPlate.toUpperCase(),
        investigating_officer: officer,
        priority
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      fetchCases();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (caseId: string, newStatus: string) => {
    try {
      const updated = await api.updateCase(caseId, { status: newStatus });
      setSelectedCase(updated);
      fetchCases();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
        <div className="flex items-center space-x-3">
          <Briefcase className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase">CASE & EVIDENCE MANAGEMENT (P1)</h2>
            <p className="text-[11px] text-slate-400">Structured criminal and traffic investigation casefiles with traceable CCTV evidence attachments.</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-[11px]">
            {['ALL', 'OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'CLOSED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === s ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg flex items-center space-x-1.5 shadow-lg shadow-amber-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE CASE</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Case List + Case Evidence Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Case List */}
        <div className="lg:col-span-5 space-y-3">
          {cases.map((c) => {
            const isSelected = selectedCase?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-900/90 border-sky-500 shadow-lg shadow-sky-950/30'
                    : 'bg-sentinel-panel border-sentinel-border hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-amber-300 font-bold">{c.case_number}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.status === 'OPEN' ? 'bg-rose-950/80 text-rose-300 border border-rose-800' :
                    c.status === 'UNDER_INVESTIGATION' ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                    'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                  }`}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{c.title}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{c.description || 'No description provided.'}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                  <span>Target: <strong className="text-amber-300">{c.target_plate || 'N/A'}</strong></span>
                  <span>Officer: <strong className="text-slate-200">{c.investigating_officer}</strong></span>
                </div>
              </div>
            );
          })}

          {cases.length === 0 && (
            <div className="p-12 text-center text-slate-500 rounded-xl bg-sentinel-panel border border-sentinel-border">
              No cases matching filter [{statusFilter}]. Click 'Create Case' to initiate a case file.
            </div>
          )}
        </div>

        {/* Right: Selected Case Details & Evidence Timeline */}
        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="p-6 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-sky-400 font-bold">{selectedCase.case_number}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-400">{selectedCase.department}</span>
                  </div>
                  <h2 className="text-base font-bold text-white mt-1 uppercase">{selectedCase.title}</h2>
                </div>

                {/* Status Switcher & Export */}
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedCase.status}
                    onChange={(e) => handleStatusUpdate(selectedCase.id, e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none text-[11px]"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>

                  {selectedCase.target_plate && (
                    <button
                      onClick={() => onOpenDossier(selectedCase.target_plate!)}
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold flex items-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>DOSSIER</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Case Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px]">
                <div>
                  <div className="text-slate-400 text-[10px]">TARGET VEHICLE</div>
                  {selectedCase.target_plate ? (
                    <button
                      onClick={() => onSearchPlate(selectedCase.target_plate!)}
                      className="font-bold text-amber-300 hover:underline mt-0.5"
                    >
                      {selectedCase.target_plate}
                    </button>
                  ) : (
                    <span className="text-slate-500">Unspecified</span>
                  )}
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">INVESTIGATOR</div>
                  <div className="font-semibold text-slate-200 mt-0.5">{selectedCase.investigating_officer}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">PRIORITY</div>
                  <div className="font-bold text-rose-400 mt-0.5">{selectedCase.priority}</div>
                </div>
              </div>

              {/* Description */}
              {selectedCase.description && (
                <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                  <div className="text-slate-400 text-[10px] uppercase mb-1">Case Brief & Intelligence Context</div>
                  {selectedCase.description}
                </div>
              )}

              {/* Attached Evidence Records */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-300 font-bold uppercase tracking-wider">
                    ATTACHED CCTV EVIDENCE ({selectedCase.evidence_items?.length || 0})
                  </span>
                  <span className="text-[10px] text-slate-400">Traceable source metadata</span>
                </div>

                {selectedCase.evidence_items && selectedCase.evidence_items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCase.evidence_items.map((ev) => (
                      <div key={ev.id} className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-200 flex items-center space-x-2">
                            <Camera className="w-3.5 h-3.5 text-sky-400" />
                            <span>{ev.camera_location || ev.camera_id}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            PTS: {new Date(ev.timestamp_pts).toLocaleString()} • Plate: <strong className="text-amber-300">{ev.plate_number}</strong>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                          {ev.evidence_type}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 bg-slate-900/30 rounded-lg border border-dashed border-slate-800">
                    No CCTV evidence items attached yet. Evidence is automatically attached during journey analysis and vehicle tracking.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-64 rounded-xl bg-sentinel-panel border border-sentinel-border flex items-center justify-center text-slate-500">
              Select a case file to view timeline and evidence records
            </div>
          )}
        </div>
      </div>

      {/* Create Case Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-sentinel-panel border border-sentinel-border rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase">CREATE INVESTIGATION CASE</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">CASE TITLE *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Stolen Tata Harrier Transit Corridor Intercept"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-sky-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">TARGET VEHICLE REGISTRATION</label>
                  <input
                    type="text"
                    value={targetPlate}
                    onChange={(e) => setTargetPlate(e.target.value.toUpperCase())}
                    placeholder="GJ06AB1234"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-amber-300 font-bold focus:border-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">PRIORITY</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-sky-500 outline-none"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">INVESTIGATING OFFICER / BADGE *</label>
                <input
                  type="text"
                  required
                  value={officer}
                  onChange={(e) => setOfficer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">BRIEF & CASE NOTES</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of incident and investigation objectives"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-sky-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded font-bold"
                >
                  {loading ? 'Creating...' : 'Create Casefile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

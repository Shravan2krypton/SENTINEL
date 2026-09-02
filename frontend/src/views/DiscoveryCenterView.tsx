import React, { useState } from 'react';
import { api, DiscoveredCamera, DiscoveryResults } from '../lib/api';
import { Radar, Search, CheckCircle, ShieldCheck, Download, Server, Radio, Cpu } from 'lucide-react';

interface DiscoveryCenterViewProps {
  onCamerasImported: () => void;
}

export const DiscoveryCenterView: React.FC<DiscoveryCenterViewProps> = ({ onCamerasImported }) => {
  const [subnet, setSubnet] = useState('10.200.0.0/16');
  const [scanSentinel, setScanSentinel] = useState(true);
  const [scanOnvif, setScanOnvif] = useState(true);
  const [scanVms, setScanVms] = useState(true);
  const [scanNvr, setScanNvr] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<DiscoveryResults | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [policy, setPolicy] = useState('CONTINUOUS_ANPR');
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const handleStartDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScanning(true);
    setImportSuccess(null);
    try {
      const res = await api.startDiscovery({
        network_subnet: subnet,
        scan_sentinel_grid: scanSentinel,
        scan_onvif: scanOnvif,
        scan_vms_api: scanVms,
        scan_nvr: scanNvr
      });
      setResults(res);
      setSelectedCandidates(res.candidates.map((c: DiscoveredCamera) => c.candidate_id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleCandidate = (cid: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  const toggleAll = () => {
    if (!results) return;
    if (selectedCandidates.length === results.candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(results.candidates.map((c) => c.candidate_id));
    }
  };

  const handleImport = async () => {
    if (selectedCandidates.length === 0) return;
    setImporting(true);
    try {
      const res: any = await api.importDiscoveredCameras(selectedCandidates, policy);
      setImportSuccess(res.message);
      onCamerasImported();
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
        <div className="flex items-center space-x-3">
          <Radar className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase">SENTINEL DISCOVERY CENTER (P1)</h2>
            <p className="text-[11px] text-slate-400">Scoped network scanning across authorized Gujarat CCTV subnets, ONVIF Profile S/T devices, and VMS gateways.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px]">
          <span className="text-slate-400">SCAN SCOPE:</span>
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-emerald-400 font-bold">
            Authorized CCTV VLAN Only
          </span>
        </div>
      </div>

      {/* Discovery Form */}
      <form onSubmit={handleStartDiscovery} className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <label className="text-slate-400 block mb-1">TARGET AUTHORIZED CCTV SUBNET</label>
            <input
              type="text"
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-sky-500 outline-none"
            />
          </div>

          <div className="md:col-span-6 flex flex-wrap gap-4 pt-2">
            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input type="checkbox" checked={scanSentinel} onChange={(e) => setScanSentinel(e.target.checked)} className="rounded" />
              <span>Sentinel Grid</span>
            </label>
            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input type="checkbox" checked={scanOnvif} onChange={(e) => setScanOnvif(e.target.checked)} className="rounded" />
              <span>ONVIF (WS-Disc)</span>
            </label>
            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input type="checkbox" checked={scanVms} onChange={(e) => setScanVms(e.target.checked)} className="rounded" />
              <span>VMS API Adapters</span>
            </label>
            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input type="checkbox" checked={scanNvr} onChange={(e) => setScanNvr(e.target.checked)} className="rounded" />
              <span>NVR / RTSP</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isScanning}
              className="w-full py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded font-bold transition-all shadow-lg shadow-sky-950/40"
            >
              {isScanning ? 'SCANNING SUBNET...' : 'START DISCOVERY'}
            </button>
          </div>
        </div>
      </form>

      {/* Discovery Results Overview */}
      {results && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3 bg-sentinel-panel border border-sentinel-border rounded-lg text-center">
            <div className="text-[10px] text-slate-400">TOTAL FOUND</div>
            <div className="text-base font-bold text-white mt-0.5">{results.total_discovered}</div>
          </div>
          <div className="p-3 bg-sentinel-panel border border-sentinel-border rounded-lg text-center">
            <div className="text-[10px] text-slate-400">VMS SERVERS</div>
            <div className="text-base font-bold text-sky-400 mt-0.5">{results.vms_servers_found}</div>
          </div>
          <div className="p-3 bg-sentinel-panel border border-sentinel-border rounded-lg text-center">
            <div className="text-[10px] text-slate-400">NVRS</div>
            <div className="text-base font-bold text-purple-400 mt-0.5">{results.nvrs_found}</div>
          </div>
          <div className="p-3 bg-sentinel-panel border border-sentinel-border rounded-lg text-center">
            <div className="text-[10px] text-slate-400">ONVIF NODES</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">{results.onvif_cameras_found}</div>
          </div>
          <div className="p-3 bg-sentinel-panel border border-sentinel-border rounded-lg text-center">
            <div className="text-[10px] text-slate-400">REACHABLE</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">{results.reachable_sources}</div>
          </div>
          <div className="p-3 bg-sentinel-panel border border-sentinel-border rounded-lg text-center">
            <div className="text-[10px] text-slate-400">AUTHENTICATED</div>
            <div className="text-base font-bold text-amber-300 mt-0.5">{results.authenticated_sources}</div>
          </div>
          <div className="p-3 bg-sentinel-panel border border-sentinel-border rounded-lg text-center">
            <div className="text-[10px] text-slate-400">STREAM READY</div>
            <div className="text-base font-bold text-teal-400 mt-0.5">{results.stream_available}</div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {importSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{importSuccess}</span>
        </div>
      )}

      {/* Discovered Candidates Table */}
      {results && (
        <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-3">
              <span className="text-slate-300 font-bold uppercase">CANDIDATE CCTV SOURCES ({selectedCandidates.length} Selected)</span>
              <button onClick={toggleAll} className="text-[11px] text-sky-400 hover:underline">
                {selectedCandidates.length === results.candidates.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Import Controls & Policy */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 text-[11px]">
                <span className="text-slate-400">POLICY:</span>
                <select
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none"
                >
                  <option value="CONTINUOUS_ANPR">Continuous ANPR (Critical/Highways)</option>
                  <option value="ON_DEMAND">On-Demand Processing</option>
                  <option value="TEMPORARY_INVESTIGATION">Temporary Investigation</option>
                </select>
              </div>

              <button
                onClick={handleImport}
                disabled={importing || selectedCandidates.length === 0}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-bold flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-950/40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{importing ? 'IMPORTING...' : 'IMPORT SELECTED CAMERAS'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[11px] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3 w-8"></th>
                  <th className="pb-3">DEVICE NAME / LOCATION</th>
                  <th className="pb-3">PROTOCOL</th>
                  <th className="pb-3">IP / PORT</th>
                  <th className="pb-3">DISTRICT</th>
                  <th className="pb-3">CODEC / RES</th>
                  <th className="pb-3">STREAM URI</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {results.candidates.map((cand) => {
                  const isSelected = selectedCandidates.includes(cand.candidate_id);
                  return (
                    <tr
                      key={cand.candidate_id}
                      onClick={() => toggleCandidate(cand.candidate_id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-950/20' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded"
                        />
                      </td>
                      <td className="py-2.5 font-bold text-slate-200">
                        <div>{cand.device_name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{cand.location}</div>
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-400 text-[10px] font-bold">
                          {cand.source_type}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-300">{cand.ip_address}:{cand.port}</td>
                      <td className="py-2.5 text-amber-300">{cand.district}</td>
                      <td className="py-2.5 text-slate-400">{cand.codec} ({cand.resolution})</td>
                      <td className="py-2.5 text-slate-400 font-mono truncate max-w-[200px]">{cand.rtsp_url}</td>
                      <td className="py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                          {cand.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

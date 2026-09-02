import React, { useState } from 'react';
import { WatchlistEntry, api } from '../lib/api';
import { ShieldAlert, Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

interface WatchlistViewProps {
  watchlist: WatchlistEntry[];
  onRefresh: () => void;
  onSearchPlate: (plate: string) => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({ watchlist, onRefresh, onSearchPlate }) => {
  const [showModal, setShowModal] = useState(false);
  const [plate, setPlate] = useState('');
  const [category, setCategory] = useState('wanted');
  const [priority, setPriority] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim() || !description.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.createWatchlistEntry({
        plate_number: plate,
        category,
        priority,
        description,
        vehicle_make_model: makeModel || undefined
      });
      setShowModal(false);
      setPlate('');
      setDescription('');
      setMakeModel('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add watchlist target');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove target vehicle from active watchlist?')) return;
    try {
      await api.deleteWatchlistEntry(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-sentinel-panel border border-sentinel-border">
        <div className="flex items-center space-x-3">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase font-mono">TARGET WATCHLIST ENGINE</h2>
            <p className="text-[11px] text-slate-400">High-priority vehicle targets evaluated automatically against live ANPR confirmations.</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-rose-950/40 transition-all font-mono self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>ADD TARGET VEHICLE</span>
        </button>
      </div>

      {/* Watchlist Table */}
      <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="text-[11px] text-slate-400 border-b border-slate-800">
            <tr>
              <th className="pb-3">REGISTRATION</th>
              <th className="pb-3">CATEGORY</th>
              <th className="pb-3">PRIORITY</th>
              <th className="pb-3">DESCRIPTION / CASE NOTES</th>
              <th className="pb-3">MAKE / MODEL</th>
              <th className="pb-3">STATUS</th>
              <th className="pb-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-[11px]">
            {watchlist.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 font-bold text-amber-300">
                  <button
                    onClick={() => onSearchPlate(item.plate_number)}
                    className="hover:underline"
                  >
                    {item.plate_number}
                  </button>
                </td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 uppercase text-[10px]">
                    {item.category}
                  </span>
                </td>
                <td className="py-3">
                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                    item.priority === 'CRITICAL'
                      ? 'bg-rose-950 text-rose-300 border border-rose-600'
                      : item.priority === 'HIGH'
                      ? 'bg-amber-950 text-amber-300 border border-amber-600'
                      : 'bg-slate-900 text-slate-300 border border-slate-700'
                  }`}>
                    {item.priority}
                  </span>
                </td>
                <td className="py-3 text-slate-300 max-w-[280px]">{item.description}</td>
                <td className="py-3 text-slate-400">{item.vehicle_make_model || '—'}</td>
                <td className="py-3 text-emerald-400 font-bold">{item.status}</td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {watchlist.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-mono text-xs">
                  No active watchlist targets. Click 'Add Target Vehicle' to create a rule.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-sentinel-panel border border-sentinel-border rounded-xl p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase">ADD TARGET VEHICLE TO WATCHLIST</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 text-rose-300 rounded text-[11px]">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">REGISTRATION NUMBER *</label>
                <input
                  type="text"
                  required
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="e.g. GJ06AB1234"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-sky-500 outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">CATEGORY</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-sky-500 outline-none"
                  >
                    <option value="wanted">Wanted</option>
                    <option value="stolen">Stolen</option>
                    <option value="investigation">Investigation</option>
                    <option value="custom">Custom</option>
                  </select>
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
                <label className="text-slate-400 block mb-1">DESCRIPTION / REASON *</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specify case reference and reason for interception"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-sky-500 outline-none text-[11px]"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">VEHICLE MAKE / MODEL</label>
                <input
                  type="text"
                  value={makeModel}
                  onChange={(e) => setMakeModel(e.target.value)}
                  placeholder="e.g. Tata Harrier XZA+ (Silver)"
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold"
                >
                  {loading ? 'Adding...' : 'Register Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

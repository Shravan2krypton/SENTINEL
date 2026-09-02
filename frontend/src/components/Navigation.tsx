import React from 'react';
import { 
  LayoutDashboard, 
  Video, 
  Map as MapIcon, 
  Search, 
  ShieldAlert, 
  Bell, 
  FileText, 
  Activity, 
  History,
  Radio
} from 'lucide-react';

export type ViewType = 
  | 'dashboard' 
  | 'live' 
  | 'gis' 
  | 'vehicles' 
  | 'watchlist' 
  | 'alerts' 
  | 'investigations' 
  | 'health' 
  | 'audit';

interface NavigationProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  activeAlertCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setCurrentView, activeAlertCount }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitoring', icon: Video },
    { id: 'gis', label: 'Statewide GIS', icon: MapIcon },
    { id: 'vehicles', label: 'Vehicle Intelligence', icon: Search },
    { id: 'watchlist', label: 'Watchlist', icon: ShieldAlert },
    { id: 'alerts', label: 'Real-Time Alerts', icon: Bell, badge: activeAlertCount },
    { id: 'investigations', label: 'Case Dossier', icon: FileText },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'audit', label: 'Audit Logs', icon: History },
  ];

  return (
    <aside className="w-64 bg-sentinel-panel border-r border-sentinel-border flex flex-col h-screen shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-sentinel-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-sky-950 border border-sky-500/30 flex items-center justify-center">
            <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase text-white">SENTINEL</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">CCTV INTELLIGENCE GRID</p>
          </div>
        </div>
        <div className="mt-3 px-2 py-1 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400">JURISDICTION:</span>
          <span className="text-emerald-400 font-semibold">GUJARAT STATE</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewType)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Operator Session Info */}
      <div className="p-3 border-t border-sentinel-border bg-slate-950/40 text-[11px]">
        <div className="flex items-center justify-between text-slate-400 mb-1 font-mono">
          <span>OPERATOR:</span>
          <span className="text-slate-200 font-medium">ADMIN / COMMAND</span>
        </div>
        <div className="flex items-center justify-between text-slate-400 font-mono">
          <span>GRID INGEST:</span>
          <span className="text-emerald-400 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
            <span>ACTIVE</span>
          </span>
        </div>
      </div>
    </aside>
  );
};

import React, { useEffect, useState } from 'react';
import { api, sentinelWs, Camera, Alert, ANPRDetection, WatchlistEntry } from './lib/api';
import { Navigation, ViewType } from './components/Navigation';
import { DashboardView } from './views/DashboardView';
import { LiveMonitoringView } from './views/LiveMonitoringView';
import { GisMapView } from './views/GisMapView';
import { VehicleSearchView } from './views/VehicleSearchView';
import { WatchlistView } from './views/WatchlistView';
import { AlertsView } from './views/AlertsView';
import { InvestigationsView } from './views/InvestigationsView';
import { DiscoveryCenterView } from './views/DiscoveryCenterView';
import { CasesView } from './views/CasesView';
import { SystemHealthView } from './views/SystemHealthView';
import { AuditLogsView } from './views/AuditLogsView';
import { Bell, AlertTriangle, ShieldCheck, X } from 'lucide-react';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [detections, setDetections] = useState<ANPRDetection[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPlate, setSelectedPlate] = useState<string>('GJ06AB1234');
  const [latestAlertBanner, setLatestAlertBanner] = useState<any | null>(null);

  // Initial authentication and data loading
  useEffect(() => {
    const initApp = async () => {
      try {
        // Auto-authenticate as default admin if not authenticated
        if (!localStorage.getItem('sentinel_token')) {
          await api.login('admin', 'Sentinel@2026');
        }

        // Initial sync and load
        await loadAllData();

        // Connect WebSocket for real-time live events & alerts
        sentinelWs.connect();
      } catch (err) {
        console.error('Initial setup error:', err);
      }
    };

    initApp();

    // Subscribe to real-time events over WebSocket
    const unsubscribe = sentinelWs.subscribe((event) => {
      console.log('Real-Time Sentinel Event:', event);

      if (event.event_type === 'AlertCreated') {
        const newAlert = event.data;
        setAlerts((prev) => [newAlert, ...prev]);
        setLatestAlertBanner(newAlert);
      } else if (event.event_type === 'ANPRConfirmed') {
        const newDet = event.data;
        setDetections((prev) => [
          {
            id: newDet.detection_id,
            camera_id: event.camera_id,
            plate_raw: newDet.plate,
            plate_normalized: newDet.plate,
            confidence: newDet.confidence,
            timestamp_pts: newDet.pts,
            vehicle_class: newDet.vehicle_class,
            track_id: newDet.track_id,
            bbox: [0, 0, 0, 0],
            evidence_reference: newDet.evidence_url,
            location_name: newDet.location,
            district: newDet.district,
            created_at: new Date().toISOString()
          },
          ...prev
        ]);
      } else if (event.event_type === 'CameraOnline' || event.event_type === 'CameraOffline') {
        loadCameras();
      }
    });

    return () => {
      unsubscribe();
      sentinelWs.disconnect();
    };
  }, []);

  const loadCameras = async () => {
    try {
      const cams = await api.getCameras();
      setCameras(cams);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAllData = async () => {
    try {
      const [cams, alts, dets, wl] = await Promise.allSettled([
        api.getCameras(),
        api.getAlerts(),
        api.getRecentDetections(50),
        api.getWatchlist()
      ]);

      if (cams.status === 'fulfilled') setCameras(cams.value);
      if (alts.status === 'fulfilled') setAlerts(alts.value);
      if (dets.status === 'fulfilled') setDetections(dets.value);
      if (wl.status === 'fulfilled') setWatchlist(wl.value);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncSentinel = async () => {
    setIsSyncing(true);
    try {
      await api.syncSentinel();
      await loadAllData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSearchPlate = (plate: string) => {
    setSelectedPlate(plate);
    setCurrentView('vehicles');
  };

  const handleOpenDossier = (plate: string) => {
    setSelectedPlate(plate);
    setCurrentView('investigations');
  };

  const activeAlertCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="flex h-screen bg-sentinel-dark text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Navigation
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeAlertCount={activeAlertCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Real-Time Alert Banner */}
        {latestAlertBanner && (
          <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-mono shadow-2xl animate-bounce">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <strong className="font-black">CRITICAL WATCHLIST HIT:</strong> Target plate{' '}
                <button
                  onClick={() => handleSearchPlate(latestAlertBanner.plate_number)}
                  className="underline font-black text-amber-200 hover:text-white"
                >
                  {latestAlertBanner.plate_number}
                </button>{' '}
                detected at {latestAlertBanner.location_name || latestAlertBanner.camera_id} (
                {latestAlertBanner.district || 'Gujarat'})
              </div>
            </div>
            <button
              onClick={() => setLatestAlertBanner(null)}
              className="p-1 hover:bg-rose-700 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View Header Bar */}
        <header className="px-6 py-3 bg-sentinel-panel border-b border-sentinel-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono uppercase text-slate-400">OPERATIONAL VIEW:</span>
            <span className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              {currentView}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>GRID CONNECTED</span>
            </div>
            <div className="hidden sm:inline text-slate-500">•</div>
            <div className="hidden sm:inline text-slate-400">
              {new Date().toLocaleTimeString()} UTC+05:30
            </div>
          </div>
        </header>

        {/* View Component Body */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === 'dashboard' && (
            <DashboardView
              cameras={cameras}
              alerts={alerts}
              detections={detections}
              onSyncSentinel={handleSyncSentinel}
              isSyncing={isSyncing}
              onSelectCamera={(cam) => setCurrentView('live')}
              onSearchPlate={handleSearchPlate}
            />
          )}

          {currentView === 'live' && (
            <LiveMonitoringView cameras={cameras} />
          )}

          {currentView === 'gis' && (
            <GisMapView cameras={cameras} />
          )}

          {currentView === 'vehicles' && (
            <VehicleSearchView
              initialPlate={selectedPlate}
              onOpenDossier={handleOpenDossier}
            />
          )}

          {currentView === 'watchlist' && (
            <WatchlistView
              watchlist={watchlist}
              onRefresh={loadAllData}
              onSearchPlate={handleSearchPlate}
            />
          )}

          {currentView === 'alerts' && (
            <AlertsView
              alerts={alerts}
              onRefresh={loadAllData}
              onSearchPlate={handleSearchPlate}
            />
          )}

          {currentView === 'discovery' && (
            <DiscoveryCenterView onCamerasImported={loadCameras} />
          )}

          {currentView === 'cases' && (
            <CasesView
              onOpenDossier={handleOpenDossier}
              onSearchPlate={handleSearchPlate}
            />
          )}

          {currentView === 'investigations' && (
            <InvestigationsView initialPlate={selectedPlate} />
          )}

          {currentView === 'health' && (
            <SystemHealthView />
          )}

          {currentView === 'audit' && (
            <AuditLogsView />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

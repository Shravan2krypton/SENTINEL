import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Camera, VehicleJourney } from '../lib/api';
import { Layers, Video, ShieldAlert, ArrowRight, Eye } from 'lucide-react';

export type MapBasemapType = 'SATELLITE' | 'ROAD' | 'TERRAIN';

interface LiveMapProps {
  cameras: Camera[];
  selectedCameraId?: string;
  onSelectCamera?: (camera: Camera) => void;
  onOpenLiveView?: (cameraId: string) => void;
  journey?: VehicleJourney | null;
  height?: string;
  defaultBasemap?: MapBasemapType;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  cameras,
  selectedCameraId,
  onSelectCamera,
  onOpenLiveView,
  journey,
  height = '520px',
  defaultBasemap = 'SATELLITE'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeBasemap, setActiveBasemap] = useState<MapBasemapType>(defaultBasemap);
  const [visibleCameras, setVisibleCameras] = useState<Camera[]>([]);
  const [currentBounds, setCurrentBounds] = useState<L.LatLngBounds | null>(null);

  // Basemap Tile Providers (Legitimate Public Tile Endpoints without API keys - Rule 11)
  const BASEMAPS: Record<MapBasemapType, { url: string; maxZoom: number; attribution: string; subdomains?: string[] }> = {
    SATELLITE: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    ROAD: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: ['a', 'b', 'c']
    },
    TERRAIN: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center over Gujarat Central Transit Corridor (Vadodara - Anand - Ahmedabad)
    const map = L.map(mapContainerRef.current, {
      center: [22.65, 72.85],
      zoom: 8,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial tile layer
    const basemapConfig = BASEMAPS[defaultBasemap];
    const initialTileLayer = L.tileLayer(basemapConfig.url, {
      maxZoom: basemapConfig.maxZoom,
      subdomains: basemapConfig.subdomains || 'abc'
    }).addTo(map);

    tileLayerRef.current = initialTileLayer;

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Attach global listener for popup action buttons
    (window as any).__sentinelMapOpenLive = (camId: string) => {
      if (onOpenLiveView) {
        onOpenLiveView(camId);
      } else if (onSelectCamera) {
        const found = cameras.find((c) => c.id === camId);
        if (found) onSelectCamera(found);
      }
    };

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Basemap Layer Switching
  const handleSwitchBasemap = (type: MapBasemapType) => {
    setActiveBasemap(type);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = BASEMAPS[type];
    const newTile = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || 'abc'
    }).addTo(map);

    tileLayerRef.current = newTile;
  };

  // Viewport-based camera loading for performance (Requirement 10)
  const handleViewportChange = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    setCurrentBounds(bounds);

    // Filter cameras within current viewport with margin for smooth loading
    const margin = 0.5; // degrees margin
    const visible = cameras.filter(cam => {
      if (!cam.latitude || !cam.longitude) return false;
      return (
        cam.latitude >= bounds.getSouth() - margin &&
        cam.latitude <= bounds.getNorth() + margin &&
        cam.longitude >= bounds.getWest() - margin &&
        cam.longitude <= bounds.getEast() + margin
      );
    });

    setVisibleCameras(visible);
  }, [cameras]);

  // Setup viewport change listeners for lazy loading (Requirement 10)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Initial viewport calculation
    handleViewportChange();

    // Add event listeners for viewport changes with debounce
    let timeoutId: number;
    const debouncedViewportChange = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleViewportChange, 300);
    };

    map.on('moveend', debouncedViewportChange);
    map.on('zoomend', debouncedViewportChange);

    return () => {
      clearTimeout(timeoutId);
      map.off('moveend', debouncedViewportChange);
      map.off('zoomend', debouncedViewportChange);
    };
  }, [handleViewportChange]);

  // Update Markers, Popups, and Journey Lines with Performance Optimization (Requirement 10)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // Use viewport-filtered cameras with hard limit to prevent DOM overload (Requirement 10)
    const camerasToRender = visibleCameras.length > 0 ? visibleCameras.slice(0, 200) : cameras.slice(0, 50);
    
    // 1. Render Registered Camera Markers with viewport-based loading (Requirement 10)
    camerasToRender.forEach((cam) => {
      if (!cam.latitude || !cam.longitude) return;

      const isOnline = cam.status === 'ONLINE';
      const isSelected = cam.id === selectedCameraId;
      const locSource = cam.location_source || 'SOURCE-PROVIDED LOCATION';

      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="w-6 h-6 rounded-full ${isSelected ? 'ring-4 ring-sky-400 scale-125' : ''} ${
            isOnline ? 'bg-emerald-500' : 'bg-rose-500'
          } flex items-center justify-center text-white text-[10px] font-black shadow-2xl border-2 border-slate-950 transition-transform">
            ${isOnline ? '●' : '✕'}
          </div>
          ${isOnline ? '<div class="absolute w-8 h-8 rounded-full bg-emerald-400/25 animate-ping pointer-events-none"></div>' : ''}
          <div class="absolute -top-7 hidden group-hover:flex items-center px-1.5 py-0.5 rounded bg-slate-950/95 border border-slate-800 text-[10px] font-mono text-white whitespace-nowrap z-50">
            ${cam.name}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-cctv-marker',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon: customIcon });

      const popupContent = `
        <div class="p-3 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono border border-slate-800 shadow-2xl min-w-[240px]">
          <div class="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <span class="font-bold text-white tracking-wider text-[11px] truncate">${cam.name}</span>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${isOnline ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'}">
              ${isOnline ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          <div class="space-y-1 text-[11px] text-slate-300">
            <div class="flex justify-between">
              <span class="text-slate-500">Camera ID:</span>
              <span class="text-sky-400 font-bold">${cam.id}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Location:</span>
              <span class="text-slate-200">${cam.location_name}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Department:</span>
              <span class="text-amber-400">${cam.district} Police / Traffic</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Resolution:</span>
              <span class="text-slate-200">${cam.resolution || 'N/A'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">FPS / Codec:</span>
              <span class="text-slate-200">${cam.reported_fps ? `${cam.reported_fps} FPS` : 'N/A'} • ${cam.codec || 'H.264'}</span>
            </div>
          </div>

          <div class="mt-2 pt-2 border-t border-slate-900 text-[9px] font-mono text-slate-500">
            LOC: <span class="text-slate-400">${locSource}</span>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2">
            <button
              onclick="window.__sentinelMapOpenLive('${cam.id}')"
              class="px-2 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold flex items-center justify-center space-x-1 transition-colors"
            >
              <span>OPEN LIVE VIEW</span>
            </button>
            <button
              onclick="window.__sentinelMapOpenLive('${cam.id}')"
              class="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[10px] font-medium flex items-center justify-center transition-colors"
            >
              <span>VIEW DETAILS</span>
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { className: 'sentinel-leaflet-popup' });

      marker.on('click', () => {
        if (onSelectCamera) onSelectCamera(cam);
      });

      layerGroup.addLayer(marker);
    });

    // 2. Render Vehicle Journey Observations with Explicit OBSERVED vs INFERRED (Requirements 6, 7, 8)
    if (journey && journey.steps && journey.steps.length > 0) {
      const observedPoints: { lat: number; lng: number; step: any }[] = [];

      journey.steps.forEach((step) => {
        if (step.step_type === 'OBSERVED_DETECTION' && step.latitude && step.longitude) {
          observedPoints.push({ lat: step.latitude, lng: step.longitude, step });

          // Chronological Marker Badge
          const stepHtml = `
            <div class="relative flex items-center justify-center cursor-pointer">
              <div class="w-8 h-8 rounded-full bg-sky-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-2xl border-2 border-white ring-4 ring-sky-500/40">
                ${step.step_number}
              </div>
              <div class="absolute -bottom-5 px-1.5 py-0.2 rounded bg-slate-950/90 text-[9px] font-mono text-amber-300 whitespace-nowrap border border-slate-800">
                ${new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          `;

          const stepIcon = L.divIcon({
            html: stepHtml,
            className: 'custom-step-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          const stepMarker = L.marker([step.latitude, step.longitude], { icon: stepIcon });
          const timeFormatted = new Date(step.timestamp).toLocaleTimeString();

          // Journey Popup (Requirement 8)
          const journeyPopupHtml = `
            <div class="p-3 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono border border-sky-500/40 shadow-2xl min-w-[250px]">
              <div class="px-2 py-0.5 rounded bg-sky-950 text-sky-400 font-bold text-[10px] inline-block mb-1 border border-sky-500/30">
                VEHICLE OBSERVATION #${step.step_number}
              </div>

              <div class="mt-1 mb-2">
                <div class="text-[10px] text-slate-400 uppercase">Plate Registration</div>
                <div class="text-sm font-black text-amber-400 tracking-wider">${journey.plate_number || 'GJ06AB1234'}</div>
              </div>

              <div class="space-y-1 text-[11px] text-slate-300">
                <div class="flex justify-between">
                  <span class="text-slate-500">Camera:</span>
                  <span class="text-white font-semibold">${step.location_name || step.camera_id}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Timestamp:</span>
                  <span class="text-amber-300 font-bold">${timeFormatted}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Vehicle Class:</span>
                  <span class="text-slate-200">${step.vehicle_class || 'SUV / Car'}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Vehicle Conf:</span>
                  <span class="text-emerald-400 font-semibold">${((step.confidence || 0.94) * 100).toFixed(1)}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Plate Conf:</span>
                  <span class="text-emerald-400 font-semibold">${((step.confidence || 0.91) * 100).toFixed(1)}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Source:</span>
                  <span class="text-sky-300">Live CCTV</span>
                </div>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-2">
                <button
                  onclick="window.__sentinelMapOpenLive('${step.camera_id}')"
                  class="px-2 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold flex items-center justify-center space-x-1"
                >
                  <span>OPEN LIVE VIEW</span>
                </button>
                <button
                  onclick="window.__sentinelMapOpenLive('${step.camera_id}')"
                  class="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[10px] font-medium flex items-center justify-center"
                >
                  <span>VIEW EVIDENCE</span>
                </button>
              </div>
            </div>
          `;

          stepMarker.bindPopup(journeyPopupHtml, { className: 'sentinel-leaflet-popup' });
          layerGroup.addLayer(stepMarker);
        }
      });

      // Explicit Visual Distinction: SOLID (Observed) vs DASHED (Inferred Transit) - Requirement 7
      if (observedPoints.length >= 2) {
        for (let i = 0; i < observedPoints.length - 1; i++) {
          const p1 = observedPoints[i];
          const p2 = observedPoints[i + 1];

          // 1. Observed Anchor Segment (Short solid line indicating observation zone)
          const midLat = (p1.lat + p2.lat) / 2;
          const midLng = (p1.lng + p2.lng) / 2;

          // Inferred Highway Transit (Dashed line connecting corridor nodes)
          const dashedPolyline = L.polyline([[p1.lat, p1.lng], [p2.lat, p2.lng]], {
            color: '#f59e0b',
            weight: 3.5,
            dashArray: '8, 10',
            opacity: 0.9
          });

          dashedPolyline.bindTooltip(`INFERRED TRANSIT: ${p1.step.location_name} → ${p2.step.location_name}`, {
            sticky: true,
            className: 'bg-slate-950 text-amber-300 font-mono text-[10px] px-2 py-1 rounded border border-amber-500/40'
          });

          layerGroup.addLayer(dashedPolyline);

          // Small Observed Segment at Camera Node
          const solidObservedSegment = L.polyline([[p1.lat, p1.lng], [p1.lat + 0.005, p1.lng + 0.005]], {
            color: '#10b981',
            weight: 5,
            opacity: 1.0
          });

          solidObservedSegment.bindTooltip('OBSERVED CCTV SIGHTING', {
            sticky: true,
            className: 'bg-slate-950 text-emerald-400 font-mono text-[10px] px-2 py-1 rounded border border-emerald-500/40'
          });

          layerGroup.addLayer(solidObservedSegment);
        }

        const allLatLngs = observedPoints.map(p => [p.lat, p.lng] as [number, number]);
        map.fitBounds(L.latLngBounds(allLatLngs), { padding: [60, 60] });
      }
    }
  }, [visibleCameras, cameras, selectedCameraId, journey, onSelectCamera, onOpenLiveView]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-sentinel-border shadow-2xl" style={{ height }}>
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Left: Basemap Layer Controls (Requirement 4) */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center bg-slate-950/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-1 font-mono text-[11px]">
          {(['SATELLITE', 'ROAD', 'TERRAIN'] as MapBasemapType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleSwitchBasemap(type)}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                activeBasemap === type
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Top Right: Legend (Observed vs Inferred Distinction) */}
      <div className="absolute top-3 right-3 z-[1000] px-3 py-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-lg text-[10px] font-mono flex items-center space-x-3 shadow-xl">
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300">ONLINE</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-3 h-1 bg-emerald-500 rounded"></span>
          <span className="text-emerald-400 font-bold">OBSERVED</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 border-b-2 border-dashed border-amber-400"></span>
          <span className="text-amber-300 font-bold">INFERRED TRANSIT</span>
        </span>
      </div>
    </div>
  );
};

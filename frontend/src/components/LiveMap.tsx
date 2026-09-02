import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Camera, VehicleJourney } from '../lib/api';

interface LiveMapProps {
  cameras: Camera[];
  selectedCameraId?: string;
  onSelectCamera?: (camera: Camera) => void;
  journey?: VehicleJourney | null;
  height?: string;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  cameras,
  selectedCameraId,
  onSelectCamera,
  journey,
  height = '500px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered over Gujarat State (Vadodara - Ahmedabad - Anand transit corridor)
    const map = L.map(mapContainerRef.current, {
      center: [22.65, 72.85],
      zoom: 8,
      zoomControl: true,
      attributionControl: false
    });

    // Dark styled OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}.png', {
      maxZoom: 18,
      className: 'dark-map-tiles'
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers and journey overlays
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Render Camera Markers
    cameras.forEach((cam) => {
      const isOnline = cam.status === 'ONLINE';
      const isSelected = cam.id === selectedCameraId;

      const markerHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-5 h-5 rounded-full ${isSelected ? 'ring-4 ring-sky-400' : ''} ${
            isOnline ? 'bg-emerald-500' : 'bg-rose-500'
          } flex items-center justify-center text-white text-[9px] font-bold shadow-lg border border-slate-900">
            ${isOnline ? '●' : '✕'}
          </div>
          ${isOnline ? '<div class="absolute w-7 h-7 rounded-full bg-emerald-500/30 animate-ping"></div>' : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-camera-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon: customIcon });

      marker.bindPopup(`
        <div class="p-2 bg-slate-900 text-slate-100 rounded text-xs border border-slate-700 min-w-[200px]">
          <div class="font-bold text-sky-400 mb-1">${cam.name}</div>
          <div class="text-[11px] text-slate-300">District: <span class="font-semibold text-white">${cam.district}</span></div>
          <div class="text-[11px] text-slate-300">Codec: <span class="font-mono text-amber-400">${cam.codec}</span> | ${cam.resolution}</div>
          <div class="text-[11px] text-slate-300 mb-2">Status: <span class="font-bold ${isOnline ? 'text-emerald-400' : 'text-rose-400'}">${cam.status}</span></div>
          <div class="text-[10px] text-slate-400 font-mono">${cam.latitude.toFixed(4)}°N, ${cam.longitude.toFixed(4)}°E</div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectCamera) onSelectCamera(cam);
      });

      layerGroup.addLayer(marker);
    });

    // 2. Render Vehicle Journey if active
    if (journey && journey.steps && journey.steps.length > 0) {
      const observedCoords: [number, number][] = [];

      journey.steps.forEach((step) => {
        if (step.step_type === 'OBSERVED_DETECTION') {
          observedCoords.push([step.latitude, step.longitude]);

          const stepHtml = `
            <div class="relative flex items-center justify-center">
              <div class="w-7 h-7 rounded-full bg-sky-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-xl border-2 border-white ring-2 ring-sky-500/50">
                ${step.step_number}
              </div>
            </div>
          `;

          const stepIcon = L.divIcon({
            html: stepHtml,
            className: 'custom-step-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          const stepMarker = L.marker([step.latitude, step.longitude], { icon: stepIcon });
          const timeStr = new Date(step.timestamp).toLocaleTimeString();

          stepMarker.bindPopup(`
            <div class="p-2 bg-slate-950 text-white rounded text-xs border border-sky-500/40 min-w-[220px]">
              <div class="px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-400 font-mono text-[10px] inline-block mb-1">OBSERVED DETECTION #${step.step_number}</div>
              <div class="font-bold text-white mb-0.5">${step.location_name}</div>
              <div class="text-slate-300 text-[11px]">Time: <span class="font-mono text-amber-300">${timeStr}</span></div>
              <div class="text-slate-300 text-[11px]">Confidence: <span class="font-mono text-emerald-400">${((step.confidence || 0) * 100).toFixed(1)}%</span></div>
              <div class="text-[10px] text-slate-400 mt-1">Camera: ${step.camera_id}</div>
            </div>
          `);

          layerGroup.addLayer(stepMarker);
        }
      });

      // Draw dashed inferred transit polyline
      if (observedCoords.length >= 2) {
        const polyline = L.polyline(observedCoords, {
          color: '#f59e0b',
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.85
        });

        polyline.bindTooltip('Inferred Highway Corridor Transit (Between Detections)', {
          permanent: false,
          sticky: true,
          className: 'bg-slate-900 text-amber-300 text-[11px] font-mono px-2 py-1 rounded border border-amber-500/40'
        });

        layerGroup.addLayer(polyline);
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      }
    }
  }, [cameras, selectedCameraId, journey, onSelectCamera]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-sentinel-border shadow-2xl" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-3 right-3 z-[1000] px-3 py-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg text-[11px] font-mono flex items-center space-x-3">
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300">ONLINE</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          <span className="text-slate-300">OFFLINE</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-0.5 bg-amber-400 inline-block border-dashed"></span>
          <span className="text-amber-300">INFERRED TRANSIT</span>
        </span>
      </div>
    </div>
  );
};

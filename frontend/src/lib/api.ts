const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000';

export interface Camera {
  id: string;
  name: string;
  department_id?: string;
  location_name: string;
  district: string;
  latitude: number;
  longitude: number;
  codec: string;
  resolution: string;
  reported_fps: number;
  bitrate_kbps: number;
  rtsp_url: string;
  status: string;
  is_ai_enabled: boolean;
  capabilities?: Record<string, any>;
  last_heartbeat?: string;
}

export interface ANPRDetection {
  id: string;
  camera_id: string;
  camera_name?: string;
  location_name?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  plate_raw: string;
  plate_normalized: string;
  confidence: number;
  timestamp_pts: string;
  vehicle_class: string;
  track_id?: number;
  bbox: number[];
  evidence_reference?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  plate_number: string;
  watchlist_id?: string;
  camera_id: string;
  camera_name?: string;
  location_name?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  timestamp_pts: string;
  confidence: number;
  evidence_url?: string;
  status: string;
  assigned_user?: string;
  notes?: string;
  created_at: string;
}

export interface WatchlistEntry {
  id: string;
  plate_number: string;
  category: string;
  priority: string;
  description: string;
  vehicle_make_model?: string;
  owner_name?: string;
  case_number?: string;
  status: string;
  created_by: string;
  created_at: string;
}

export interface JourneyStep {
  step_number: number;
  step_type: 'OBSERVED_DETECTION' | 'INFERRED_TRANSIT';
  timestamp: string;
  camera_id?: string;
  camera_name?: string;
  location_name: string;
  district: string;
  latitude: number;
  longitude: number;
  confidence?: number;
  evidence_url?: string;
  vehicle_class?: string;
  distance_km?: number;
  duration_minutes?: number;
  estimated_speed_kmh?: number;
  corridor_name?: string;
  observation_notes?: string;
}

export interface VehicleJourney {
  plate_number: string;
  total_detections: number;
  start_time?: string;
  end_time?: string;
  districts_traversed: string[];
  total_estimated_distance_km: number;
  is_watchlist_hit: boolean;
  watchlist_category?: string;
  steps: JourneyStep[];
  observed_points: [number, number][];
  inferred_polyline: [number, number][];
}

class ApiService {
  private token: string | null = localStorage.getItem('sentinel_token');

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('sentinel_token', token);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('sentinel_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // Health & Metrics
  async getHealth() {
    return this.request('/health');
  }

  async getMetrics() {
    return this.request('/api/system/metrics');
  }

  // Sentinel Ingest & Cameras
  async getSentinelCatalogue() {
    return this.request('/api/ingest');
  }

  async syncSentinel() {
    return this.request('/api/cameras/sync-sentinel', { method: 'POST' });
  }

  async getCameras(district?: string, status?: string) {
    const params = new URLSearchParams();
    if (district) params.append('district', district);
    if (status) params.append('status', status);
    return this.request(`/api/cameras?${params.toString()}`);
  }

  async getCamera(id: string) {
    return this.request(`/api/cameras/${id}`);
  }

  // Detections
  async getRecentDetections(limit = 50) {
    return this.request(`/api/detections?limit=${limit}`);
  }

  // Vehicle Search & Journey
  async searchVehicle(plate: string) {
    return this.request(`/api/vehicles/${encodeURIComponent(plate)}/search`);
  }

  async getVehicleJourney(plate: string) {
    return this.request(`/api/vehicles/${encodeURIComponent(plate)}/journey`);
  }

  async getVahanDetails(plate: string) {
    return this.request(`/api/vehicles/${encodeURIComponent(plate)}/vahan`);
  }

  // Watchlist
  async getWatchlist() {
    return this.request('/api/watchlist');
  }

  async createWatchlistEntry(entry: any) {
    return this.request('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
  }

  async deleteWatchlistEntry(id: string) {
    return this.request(`/api/watchlist/${id}`, { method: 'DELETE' });
  }

  // Alerts
  async getAlerts(status?: string) {
    const q = status ? `?status=${status}` : '';
    return this.request(`/api/alerts${q}`);
  }

  async getAlertStats() {
    return this.request('/api/alerts/summary/stats');
  }

  async updateAlertStatus(alertId: string, status: string, notes?: string) {
    return this.request(`/api/alerts/${alertId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes })
    });
  }

  // Dossier
  async generateDossier(data: { plate_number: string; case_title: string; investigating_officer: string; case_notes?: string }) {
    return this.request('/api/investigations/dossier', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Auth
  async login(username: string, password: string) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (data.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  }

  // Audit
  async getAuditLogs(limit = 100) {
    return this.request(`/api/system/audit-logs?limit=${limit}`);
  }

  getLiveStreamUrl(cameraId: string) {
    return `${API_BASE}/api/streams/${cameraId}/live`;
  }
}

export const api = new ApiService();

// Real-Time WebSocket Client
export class SentinelWebSocket {
  private ws: WebSocket | null = null;
  private listeners: ((event: any) => void)[] = [];
  private reconnectTimer: any = null;

  connect() {
    if (this.ws) return;
    try {
      this.ws = new WebSocket(`${WS_BASE}/api/ws/alerts`);
      this.ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          this.listeners.forEach((cb) => cb(data));
        } catch {
          // ignore non-json keep-alive
        }
      };
      this.ws.onclose = () => {
        this.ws = null;
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };
      this.ws.onerror = () => {
        if (this.ws) this.ws.close();
      };
    } catch {
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    }
  }

  subscribe(callback: (event: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const sentinelWs = new SentinelWebSocket();

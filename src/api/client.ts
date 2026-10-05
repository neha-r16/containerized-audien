import type {
  HealthResponse,
  DashboardStats,
  SegmentData,
  MetricsResponse,
  UserData,
  RecommendResponse,
} from '@/types';
import { trainModel, getModel, predictUser, getHealth, isModelTrained } from '@/ml/engine';
import { generateDataset } from '@/data/dataset';

const API_BASE = 'http://localhost:8000';
const API_TIMEOUT = 3000;

let backendAvailable = false;
let backendChecked = false;
let clientModelReady = false;

export async function ensureModelReady() {
  if (!clientModelReady) {
    const data = generateDataset(1000);
    trainModel(data);
    clientModelReady = true;
  }
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeout = API_TIMEOUT): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkBackend(): Promise<boolean> {
  if (backendChecked) return backendAvailable;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`);
    const data = await res.json();
    backendAvailable = data.status === 'ok' && data.model_loaded === true;
  } catch {
    backendAvailable = false;
  }
  backendChecked = true;
  return backendAvailable;
}

export function getBackendMode(): 'backend' | 'client' {
  return backendAvailable ? 'backend' : 'client';
}

export async function getHealthStatus(): Promise<HealthResponse> {
  const isBackend = await checkBackend();
  if (isBackend) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/health`);
      return await res.json();
    } catch {
      // fall through
    }
  }
  await ensureModelReady();
  return getHealth();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const isBackend = await checkBackend();
  if (isBackend) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/dashboard-stats`);
      if (res.ok) return await res.json();
    } catch {
      // fall through
    }
  }
  await ensureModelReady();
  return getModel()!.dashboard;
}

export async function getSegments(): Promise<SegmentData[]> {
  const isBackend = await checkBackend();
  if (isBackend) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/segments`);
      if (res.ok) return await res.json();
    } catch {
      // fall through
    }
  }
  await ensureModelReady();
  return getModel()!.segments;
}

export async function getMetrics(): Promise<MetricsResponse> {
  const isBackend = await checkBackend();
  if (isBackend) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/metrics`);
      if (res.ok) return await res.json();
    } catch {
      // fall through
    }
  }
  await ensureModelReady();
  return getModel()!.metrics;
}

export async function getUsers(limit = 50): Promise<UserData[]> {
  const isBackend = await checkBackend();
  if (isBackend) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/users?limit=${limit}`);
      if (res.ok) return await res.json();
    } catch {
      // fall through
    }
  }
  await ensureModelReady();
  return getModel()!.data.slice(0, limit);
}

export interface RecommendInput {
  user_id: string;
  watch_time_hours: number;
  avg_session_mins: number;
  sessions_per_week: number;
  top_genre: string;
  genre_diversity: number;
  weekend_usage_pct: number;
  days_since_last_visit: number;
}

export async function recommend(input: RecommendInput): Promise<RecommendResponse> {
  const isBackend = await checkBackend();
  if (isBackend) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }, 5000);
      if (res.ok) return await res.json();
      if (res.status >= 400) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || `Server error (${res.status})`);
      }
    } catch (e: any) {
      if (e instanceof TypeError) {
        // network error -> fall back
      } else {
        throw e; // re-throw validation errors
      }
    }
  }
  // client-side fallback
  await ensureModelReady();
  return predictUser(input);
}

export function validateInput(input: RecommendInput): string[] {
  const errors: string[] = [];
  if (!input.user_id || input.user_id.trim() === '') errors.push('User ID is required');
  if (typeof input.watch_time_hours !== 'number' || isNaN(input.watch_time_hours))
    errors.push('Watch time must be a valid number');
  else if (input.watch_time_hours < 0) errors.push('Watch time cannot be negative');
  if (typeof input.avg_session_mins !== 'number' || isNaN(input.avg_session_mins))
    errors.push('Average session must be a valid number');
  else if (input.avg_session_mins < 0) errors.push('Average session cannot be negative');
  else if (input.avg_session_mins > 600) errors.push('Average session seems unrealistic (max 600 min)');
  if (typeof input.sessions_per_week !== 'number' || isNaN(input.sessions_per_week))
    errors.push('Sessions per week must be a valid number');
  else if (input.sessions_per_week < 0) errors.push('Sessions per week cannot be negative');
  if (typeof input.genre_diversity !== 'number' || isNaN(input.genre_diversity))
    errors.push('Genre diversity must be a valid number');
  else if (input.genre_diversity < 0) errors.push('Genre diversity cannot be negative');
  if (typeof input.weekend_usage_pct !== 'number' || isNaN(input.weekend_usage_pct))
    errors.push('Weekend usage must be a valid number');
  else if (input.weekend_usage_pct < 0 || input.weekend_usage_pct > 100)
    errors.push('Weekend usage must be between 0 and 100');
  if (typeof input.days_since_last_visit !== 'number' || isNaN(input.days_since_last_visit))
    errors.push('Days since last visit must be a valid number');
  else if (input.days_since_last_visit < 0) errors.push('Days since last visit cannot be negative');
  return errors;
}

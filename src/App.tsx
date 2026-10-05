import { useEffect, useState } from 'react';
import {
  Activity,
  Users,
  Layers,
  Clock,
  Gauge,
  Sparkles,
  TrendingUp,
  Film,
  Search,
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
  Target,
  Tv,
  BarChart3,
  Brain,
  Zap,
  AlertCircle,
} from 'lucide-react';
import type {
  DashboardStats,
  SegmentData,
  MetricsResponse,
  HealthResponse,
  RecommendResponse,
  UserData,
  AnalysisForm,
} from '@/types';
import { GENRES } from '@/types';
import {
  getHealthStatus,
  getDashboardStats,
  getSegments,
  getMetrics,
  getUsers,
  recommend,
  validateInput,
  getBackendMode,
  ensureModelReady,
} from '@/api/client';
import { BarChart, DonutChart, LineChart } from '@/components/Charts';

type Tab = 'dashboard' | 'segments' | 'analyzer' | 'analytics' | 'api';

const SEGMENT_COLORS = ['#22d3ee', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#f97316'];

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [mode, setMode] = useState<'backend' | 'client' | 'checking'>('checking');

  useEffect(() => {
    (async () => {
      setMode('checking');
      await ensureModelReady();
      const h = await getHealthStatus();
      setHealth(h);
      setMode(getBackendMode());
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header mode={mode} health={health} tab={tab} setTab={setTab} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6">
        {tab === 'dashboard' && <DashboardView />}
        {tab === 'segments' && <SegmentsView />}
        {tab === 'analyzer' && <AnalyzerView />}
        {tab === 'analytics' && <AnalyticsView />}
        {tab === 'api' && <ApiStatusView health={health} mode={mode} />}
      </main>
      <Footer />
    </div>
  );
}

function Header({
  mode,
  health,
  tab,
  setTab,
}: {
  mode: 'backend' | 'client' | 'checking';
  health: HealthResponse | null;
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge },
    { id: 'segments', label: 'Segments', icon: Layers },
    { id: 'analyzer', label: 'User Analyzer', icon: Search },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'api', label: 'API Status', icon: Server },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center glow">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-white tracking-tight">OTT Audience Intelligence</h1>
              <p className="text-[10px] md:text-xs text-slate-500 hidden sm:block">Behavioral Segmentation & Personalization</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <Brain className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-300">AI/ML Powered</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700">
              {mode === 'checking' ? (
                <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
              ) : mode === 'backend' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="text-xs text-slate-400 hidden sm:inline">
                {mode === 'checking' ? 'Connecting...' : mode === 'backend' ? 'API Live' : 'Client ML'}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto pb-2 -mb-px">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-800 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-slate-600">OTT Audience Intelligence — Hackathon Prototype</p>
        <p className="text-xs text-slate-600">StandardScaler + KMeans Clustering</p>
      </div>
    </footer>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  loading,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  unit?: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="card card-hover p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-20 bg-slate-800 rounded animate-pulse" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-white">
              {value}
              {unit && <span className="text-sm text-slate-500 ml-1 font-normal">{unit}</span>}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, seg] = await Promise.all([getDashboardStats(), getSegments()]);
      setStats(s);
      setSegments(seg);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">Dashboard Overview</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard icon={Users} label="Total Users" value={stats?.total_users ?? 0} color="bg-cyan-500/15 text-cyan-400" loading={loading} />
        <StatCard icon={Layers} label="Segments" value={stats?.num_segments ?? 0} color="bg-amber-500/15 text-amber-400" loading={loading} />
        <StatCard icon={Clock} label="Avg Watch Time" value={stats?.avg_watch_time ?? 0} unit="hrs" color="bg-emerald-500/15 text-emerald-400" loading={loading} />
        <StatCard icon={Activity} label="Avg Session" value={stats?.avg_session_duration ?? 0} unit="min" color="bg-pink-500/15 text-pink-400" loading={loading} />
        <StatCard icon={Gauge} label="Silhouette" value={stats?.best_silhouette ?? 0} color="bg-violet-500/15 text-violet-400" loading={loading} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Segment Distribution</h3>
          </div>
          {loading ? (
            <div className="h-48 bg-slate-800/50 rounded-lg animate-pulse" />
          ) : segments.length > 0 ? (
            <BarChart
              data={segments.map((s, i) => ({
                label: s.segment_name.split(' ').slice(0, 2).join(' '),
                value: s.user_count,
                color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
              }))}
              height={200}
            />
          ) : (
            <EmptyState />
          )}
        </div>

        <div className="card p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Segment Summary</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-slate-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : segments.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {segments.map((s, i) => (
                <div key={s.segment_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}22`, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}>
                    {s.segment_id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{s.segment_name}</p>
                    <p className="text-xs text-slate-500">{s.user_count} users · {s.top_genre}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.engagement_level === 'High' ? 'bg-emerald-500/15 text-emerald-400' : s.engagement_level === 'Medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400'}`}>
                    {s.engagement_level}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function SegmentsView() {
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const s = await getSegments();
      setSegments(s);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card p-5 h-64 animate-pulse" style={{ background: 'rgba(15,23,42,0.5)' }} />
        ))}
      </div>
    );
  }

  if (segments.length === 0) return <EmptyState message="No segments found" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">Audience Segments</h2>
        <span className="text-xs text-slate-500">({segments.length} clusters)</span>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((s, i) => (
          <div
            key={s.segment_id}
            className="card card-hover p-5 animate-fade-in relative overflow-hidden"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}22`, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}>
                C{s.segment_id}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.engagement_level === 'High' ? 'bg-emerald-500/15 text-emerald-400' : s.engagement_level === 'Medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400'}`}>
                {s.engagement_level} Engagement
              </span>
            </div>

            <h3 className="text-base font-bold text-white mb-1">{s.segment_name}</h3>
            <p className="text-xs text-slate-400 mb-4 line-clamp-2">{s.description}</p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Metric label="Users" value={s.user_count} />
              <Metric label="Avg Watch" value={`${s.avg_watch_time}h`} />
              <Metric label="Avg Session" value={`${s.avg_session_duration}m`} />
              <Metric label="Sessions/Wk" value={s.avg_sessions_per_week} />
              <Metric label="Diversity" value={s.avg_genre_diversity} />
              <Metric label="Top Genre" value={s.top_genre} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-800/40 rounded-lg px-2.5 py-1.5">
      <p className="text-slate-500 text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-slate-200 font-medium">{value}</p>
    </div>
  );
}

function AnalyzerView() {
  const [form, setForm] = useState<AnalysisForm>({
    user_id: 'U0001',
    watch_time_hours: '32.5',
    avg_session_mins: '85',
    sessions_per_week: '8',
    top_genre: 'Action',
    genre_diversity: '2',
    weekend_usage_pct: '70',
    days_since_last_visit: '1',
  });
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const fields: { key: keyof AnalysisForm; label: string; type?: 'number' | 'text' | 'select' }[] = [
    { key: 'user_id', label: 'User ID', type: 'text' },
    { key: 'watch_time_hours', label: 'Watch Time (hrs)', type: 'number' },
    { key: 'avg_session_mins', label: 'Avg Session (min)', type: 'number' },
    { key: 'sessions_per_week', label: 'Sessions / Week', type: 'number' },
    { key: 'top_genre', label: 'Top Genre', type: 'select' },
    { key: 'genre_diversity', label: 'Genre Diversity', type: 'number' },
    { key: 'weekend_usage_pct', label: 'Weekend Usage (%)', type: 'number' },
    { key: 'days_since_last_visit', label: 'Days Since Visit', type: 'number' },
  ];

  const handleAnalyze = async () => {
    setError(null);
    setFieldErrors([]);

    const numericInput = {
      user_id: form.user_id,
      watch_time_hours: parseFloat(form.watch_time_hours),
      avg_session_mins: parseFloat(form.avg_session_mins),
      sessions_per_week: parseFloat(form.sessions_per_week),
      top_genre: form.top_genre,
      genre_diversity: parseFloat(form.genre_diversity),
      weekend_usage_pct: parseFloat(form.weekend_usage_pct),
      days_since_last_visit: parseFloat(form.days_since_last_visit),
    };

    const errors = validateInput(numericInput);
    if (errors.length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await recommend(numericInput);
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Analysis failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (preset: 'action' | 'casual' | 'explorer' | 'low') => {
    const presets: Record<string, AnalysisForm> = {
      action: { user_id: 'U0001', watch_time_hours: '55', avg_session_mins: '90', sessions_per_week: '8', top_genre: 'Action', genre_diversity: '2', weekend_usage_pct: '70', days_since_last_visit: '1' },
      casual: { user_id: 'U0050', watch_time_hours: '12', avg_session_mins: '25', sessions_per_week: '3', top_genre: 'Comedy', genre_diversity: '3', weekend_usage_pct: '45', days_since_last_visit: '12' },
      explorer: { user_id: 'U0100', watch_time_hours: '30', avg_session_mins: '50', sessions_per_week: '5', top_genre: 'Documentary', genre_diversity: '6', weekend_usage_pct: '55', days_since_last_visit: '4' },
      low: { user_id: 'U0200', watch_time_hours: '4', avg_session_mins: '15', sessions_per_week: '1', top_genre: 'Drama', genre_diversity: '2', weekend_usage_pct: '30', days_since_last_visit: '28' },
    };
    setForm(presets[preset]);
    setResult(null);
    setError(null);
    setFieldErrors([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">User Analyzer</h2>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Input Parameters</h3>
            <div className="flex gap-1.5">
              <button onClick={() => loadSample('action')} className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">Action</button>
              <button onClick={() => loadSample('casual')} className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">Casual</button>
              <button onClick={() => loadSample('explorer')} className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">Explorer</button>
              <button onClick={() => loadSample('low')} className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">Low</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key} className={f.key === 'user_id' ? 'col-span-2' : ''}>
                <label className="block text-xs text-slate-500 mb-1 font-medium">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    <option value="">— Missing —</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                    placeholder={f.label}
                  />
                )}
              </div>
            ))}
          </div>

          {fieldErrors.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-xs font-medium text-red-400">Validation Error</p>
              </div>
              <ul className="text-xs text-red-300 list-disc list-inside space-y-0.5">
                {fieldErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-4 w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                Analyze Audience
              </>
            )}
          </button>
        </div>

        <div className="card p-5 animate-fade-in min-h-[400px]">
          <h3 className="text-sm font-semibold text-white mb-4">Analysis Result</h3>

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm font-medium text-red-400">Error</p>
              </div>
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {loading && !result && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
              <p className="text-sm text-slate-400">Running KMeans prediction...</p>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center">
                <Search className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-sm text-slate-500">Enter user data and click "Analyze Audience" to see results</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Predicted Segment</p>
                  <p className="text-lg font-bold text-white">{result.segment_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">User {result.user_id} → Cluster {result.segment_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Distance</p>
                  <p className="text-xl font-bold text-cyan-400">{result.distance_to_centroid}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Segment Description</p>
                <p className="text-sm text-slate-300 leading-relaxed">{result.description}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Personalized Recommendations</p>
                <div className="space-y-1.5">
                  {result.recommendations.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors animate-slide-in" style={{ animationDelay: `${i * 80}ms` }}>
                      <Film className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-sm text-slate-200">{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Key Behavioral Characteristics</p>
                <div className="grid grid-cols-2 gap-2">
                  {result.characteristics.map((c, i) => (
                    <div key={i} className="bg-slate-800/40 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-slate-500 uppercase">{c.label}</p>
                      <p className="text-sm text-slate-200 font-medium">{c.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsView() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [m, s, u] = await Promise.all([getMetrics(), getSegments(), getUsers(200)]);
      setMetrics(m);
      setSegments(s);
      setUsers(u);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5 h-64 animate-pulse" style={{ background: 'rgba(15,23,42,0.5)' }} />
        ))}
      </div>
    );
  }

  if (!metrics || !segments.length) return <EmptyState message="No analytics data available" />;

  // genre distribution from users
  const genreCounts: Record<string, number> = {};
  users.forEach((u) => {
    const g = u.top_genre || 'Unknown';
    genreCounts[g] = (genreCounts[g] || 0) + 1;
  });
  const genreData = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">Analytics</h2>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-4">Cluster Distribution</h3>
          <DonutChart
            data={segments.map((s, i) => ({
              label: s.segment_name.split(' ').slice(0, 2).join(' '),
              value: s.user_count,
              color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
            }))}
          />
        </div>

        <div className="card p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-4">Watch Time by Segment</h3>
          <BarChart
            data={segments.map((s, i) => ({
              label: `C${s.segment_id}`,
              value: s.avg_watch_time,
              color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
            }))}
            height={200}
            valueFormatter={(v) => `${v}h`}
          />
        </div>

        <div className="card p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-4">Session Duration by Segment</h3>
          <BarChart
            data={segments.map((s, i) => ({
              label: `C${s.segment_id}`,
              value: s.avg_session_duration,
              color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
            }))}
            height={200}
            valueFormatter={(v) => `${v}m`}
          />
        </div>

        <div className="card p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-4">Genre Distribution</h3>
          <DonutChart data={genreData} />
        </div>
      </div>

      <div className="card p-5 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Silhouette Score by K Value</h3>
          <span className="ml-auto text-xs text-slate-500">
            Best K: <span className="text-cyan-400 font-bold">{metrics.best_k}</span> · Score: <span className="text-emerald-400 font-bold">{metrics.best_silhouette}</span>
          </span>
        </div>
        <div className="flex justify-center">
          <LineChart data={metrics.silhouette_scores.map((s) => ({ x: s.k, y: s.score }))} />
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {metrics.silhouette_scores.map((s) => (
            <div key={s.k} className="text-center bg-slate-800/40 rounded-lg py-2">
              <p className="text-xs text-slate-500">K={s.k}</p>
              <p className={`text-sm font-bold ${s.k === metrics.best_k ? 'text-cyan-400' : 'text-slate-300'}`}>{s.score}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 animate-fade-in">
        <h3 className="text-sm font-semibold text-white mb-3">Model Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-slate-800/40 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-500">Model Type</p>
            <p className="text-white font-medium">{metrics.model_type}</p>
          </div>
          <div className="bg-slate-800/40 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-500">Features</p>
            <p className="text-white font-medium">{metrics.n_features}</p>
          </div>
          <div className="bg-slate-800/40 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-500">Inertia</p>
            <p className="text-white font-medium">{metrics.inertia}</p>
          </div>
          <div className="bg-slate-800/40 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-500">Best K</p>
            <p className="text-white font-medium">{metrics.best_k}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApiStatusView({ health, mode }: { health: HealthResponse | null; mode: 'backend' | 'client' | 'checking' }) {
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    getUsers(10).then(setUsers);
  }, []);

  const statusItems = [
    { label: 'API Status', value: health?.status ?? 'unknown', ok: health?.status === 'ok', icon: Server },
    { label: 'Model Loaded', value: health?.model_loaded ? 'Yes' : 'No', ok: health?.model_loaded === true, icon: Brain },
    { label: 'Dataset Loaded', value: health?.dataset_loaded ? 'Yes' : 'No', ok: health?.dataset_loaded === true, icon: Film },
    { label: 'Compute Mode', value: mode === 'backend' ? 'Python FastAPI' : mode === 'client' ? 'Client-Side ML' : 'Checking...', ok: mode !== 'checking', icon: Zap },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Server className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">API Status</h2>
      </div>

      <div className="card p-5 animate-fade-in">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {statusItems.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-slate-800/40 rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.ok ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <div className="flex items-center gap-1.5">
                    {s.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                    <p className="text-sm font-medium text-white capitalize">{s.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-5 animate-fade-in">
        <h3 className="text-sm font-semibold text-white mb-3">Sample Users from Dataset</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="text-left py-2 px-2">User ID</th>
                <th className="text-right py-2 px-2">Watch (h)</th>
                <th className="text-right py-2 px-2">Session (m)</th>
                <th className="text-right py-2 px-2">Sess/Wk</th>
                <th className="text-left py-2 px-2">Genre</th>
                <th className="text-right py-2 px-2">Div</th>
                <th className="text-right py-2 px-2">Wknd %</th>
                <th className="text-right py-2 px-2">Days</th>
                <th className="text-left py-2 px-2">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 px-2 text-slate-300 font-mono">{u.user_id}</td>
                  <td className="py-2 px-2 text-right text-slate-300">{u.watch_time_hours}</td>
                  <td className="py-2 px-2 text-right text-slate-300">{u.avg_session_mins}</td>
                  <td className="py-2 px-2 text-right text-slate-300">{u.sessions_per_week}</td>
                  <td className="py-2 px-2 text-slate-300">{u.top_genre}</td>
                  <td className="py-2 px-2 text-right text-slate-300">{u.genre_diversity}</td>
                  <td className="py-2 px-2 text-right text-slate-300">{u.weekend_usage_pct}</td>
                  <td className="py-2 px-2 text-right text-slate-300">{u.days_since_last_visit}</td>
                  <td className="py-2 px-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${u.engagement_level === 'High' ? 'bg-emerald-500/15 text-emerald-400' : u.engagement_level === 'Medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400'}`}>
                      {u.engagement_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5 animate-fade-in">
        <h3 className="text-sm font-semibold text-white mb-3">API Endpoints</h3>
        <div className="space-y-2">
          {[
            { method: 'GET', path: '/health', desc: 'Service health check' },
            { method: 'POST', path: '/recommend', desc: 'Predict segment & get recommendations' },
            { method: 'GET', path: '/segments', desc: 'List all audience segments' },
            { method: 'GET', path: '/metrics', desc: 'Model metrics and silhouette scores' },
            { method: 'GET', path: '/users', desc: 'List sample users from dataset' },
            { method: 'GET', path: '/dashboard-stats', desc: 'Aggregate dashboard statistics' },
          ].map((e, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 transition-colors">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${e.method === 'GET' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                {e.method}
              </span>
              <code className="text-sm text-slate-300 font-mono">{e.path}</code>
              <span className="text-xs text-slate-500 ml-auto">{e.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-slate-600" />
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default App;

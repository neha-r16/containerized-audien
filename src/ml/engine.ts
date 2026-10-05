import type { UserData, SegmentData, RecommendResponse, MetricsResponse, DashboardStats, HealthResponse } from '@/types';
import { GENRES } from '@/types';

interface Scaler {
  mean: number[];
  std: number[];
}

interface KMeansResult {
  centroids: number[][];
  labels: number[];
  inertia: number;
}

const FEATURES: (keyof UserData)[] = [
  'watch_time_hours',
  'avg_session_mins',
  'sessions_per_week',
  'genre_diversity',
  'weekend_usage_pct',
  'days_since_last_visit',
];

const GENRE_MAP: Record<string, number> = {};
GENRES.forEach((g, i) => (GENRE_MAP[g] = i));
GENRE_MAP[''] = -1; // missing
GENRE_MAP['Unknown'] = -1; // unknown — imputed later

function cleanDataset(raw: UserData[]): { cleaned: UserData[]; dropped: number } {
  const seen = new Set<string>();
  const cleaned: UserData[] = [];
  let dropped = 0;

  for (const u of raw) {
    if (!u.user_id || seen.has(u.user_id)) {
      dropped++;
      continue;
    }
    if (
      typeof u.watch_time_hours !== 'number' ||
      typeof u.avg_session_mins !== 'number' ||
      typeof u.sessions_per_week !== 'number'
    ) {
      dropped++;
      continue;
    }
    if (u.watch_time_hours < 0 || u.avg_session_mins < 0) {
      dropped++;
      continue;
    }
    seen.add(u.user_id);
    const copy: UserData = { ...u };
    // handle missing/unknown genre -> impute with most common later, for now use 'Drama'
    if (!copy.top_genre || !(GENRE_MAP[copy.top_genre] >= 0 || GENRE_MAP[copy.top_genre] === -1)) {
      copy.top_genre = 'Drama';
    } else if (copy.top_genre === '') {
      copy.top_genre = 'Drama';
    } else if (copy.top_genre === 'Unknown') {
      copy.top_genre = 'Drama';
    }
    // clamp
    copy.weekend_usage_pct = Math.max(0, Math.min(100, copy.weekend_usage_pct));
    copy.days_since_last_visit = Math.max(0, copy.days_since_last_visit);
    cleaned.push(copy);
  }
  return { cleaned, dropped };
}

function extractFeatureMatrix(data: UserData[], genreEncoder: (g: string) => number): number[][] {
  return data.map((u) => {
    const numeric = FEATURES.map((f) => Number(u[f]));
    numeric.push(genreEncoder(u.top_genre) / (GENRES.length - 1)); // normalized genre
    return numeric;
  });
}

function fitScaler(X: number[][]): Scaler {
  const n = X.length;
  const d = X[0].length;
  const mean = new Array(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) mean[j] += row[j];
  for (let j = 0; j < d; j++) mean[j] /= n;
  const std = new Array(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) std[j] += (row[j] - mean[j]) ** 2;
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j] / n);
  for (let j = 0; j < d; j++) std[j] = std[j] < 1e-8 ? 1 : std[j];
  return { mean, std };
}

function applyScaler(X: number[][], s: Scaler): number[][] {
  return X.map((row) => row.map((v, j) => (v - s.mean[j]) / s.std[j]));
}

function euclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

function kmeans(X: number[][], k: number, maxIter = 200, seed = 42): KMeansResult {
  const n = X.length;
  const d = X[0].length;

  // k-means++ init
  const rng = mulberry32(seed);
  const centroids: number[][] = [];
  centroids.push(X[Math.floor(rng() * n)].slice());

  for (let c = 1; c < k; c++) {
    const dists = X.map((x) => Math.min(...centroids.map((cen) => euclidean(x, cen))) ** 2);
  const sum = dists.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  let idx = 0;
  for (let i = 0; i < n; i++) {
    r -= dists[i];
    if (r <= 0) {
      idx = i;
      break;
    }
  }
  centroids.push(X[idx].slice());
  }

  let labels = new Array(n).fill(0);
  let inertia = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    let newInertia = 0;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const dist = euclidean(X[i], centroids[c]);
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }
      if (labels[i] !== best) changed = true;
      labels[i] = best;
      newInertia += bestDist * bestDist;
    }
    inertia = newInertia;

    // update
    const sums = Array.from({ length: k }, () => new Array(d).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      counts[labels[i]]++;
      for (let j = 0; j < d; j++) sums[labels[i]][j] += X[i][j];
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) {
        centroids[c] = X[Math.floor(rng() * n)].slice();
        continue;
      }
      for (let j = 0; j < d; j++) centroids[c][j] = sums[c][j] / counts[c];
    }
    if (!changed) break;
  }
  return { centroids, labels, inertia };
}

function silhouetteScore(X: number[][], labels: number[], sampleSize = 500): number {
  const n = X.length;
  if (n < 2) return 0;
  const unique = [...new Set(labels)];
  if (unique.length < 2) return 0;

  // sample for speed
  const indices =
    n > sampleSize
      ? (() => {
          const rng = mulberry32(99);
          const idxs = new Set<number>();
          while (idxs.size < sampleSize) idxs.add(Math.floor(rng() * n));
          return [...idxs];
        })()
      : [...Array(n).keys()];

  let total = 0;
  for (const i of indices) {
    const same = labels
      .map((l, j) => (l === labels[i] && j !== i ? j : -1))
      .filter((j) => j >= 0);
    if (same.length === 0) continue;
    const a = same.reduce((s, j) => s + euclidean(X[i], X[j]), 0) / same.length;
    let b = Infinity;
    for (const c of unique) {
      if (c === labels[i]) continue;
      const others = labels.map((l, j) => (l === c ? j : -1)).filter((j) => j >= 0);
      if (others.length === 0) continue;
      const avg = others.reduce((s, j) => s + euclidean(X[i], X[j]), 0) / others.length;
      b = Math.min(b, avg);
    }
    const s = (b - a) / Math.max(a, b);
    total += s;
  }
  return total / indices.length;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// segment naming from cluster characteristics
function nameSegment(stats: {
  avgWatch: number;
  avgSess: number;
  avgFreq: number;
  avgDiversity: number;
  avgRecency: number;
  topGenre: string;
  engagement: string;
}): { name: string; description: string } {
  const { avgWatch, avgSess, avgDiversity, avgRecency, topGenre, engagement } = stats;

  let name = '';
  let description = '';

  if (engagement === 'High' && avgDiversity >= 6) {
    name = 'Highly Engaged Multi-Genre Viewers';
    description = `Highly active viewers who explore ${avgDiversity.toFixed(0)}+ genres with strong ${topGenre} preference. They watch frequently and broadly.`;
  } else if (engagement === 'High' && avgSess >= 60) {
    name = `High-Engagement ${topGenre} Viewers`;
    description = `Power users with long viewing sessions and strong ${topGenre} affinity. Highly consistent weekly engagement.`;
  } else if (engagement === 'Low' || (avgWatch < 10 && avgRecency > 15)) {
    name = 'Low-Activity Viewers';
    description = `Infrequent users with low watch time and ${avgRecency.toFixed(0)}+ days since last visit. At risk of churn — re-engagement recommended.`;
  } else if (avgSess < 35 && avgDiversity >= 3) {
    name = 'Casual Short-Session Viewers';
    description = `Casual viewers who prefer short sessions (~${avgSess.toFixed(0)} min). They browse multiple genres but don't binge.`;
  } else if (avgDiversity >= 5) {
    name = 'Genre Explorers';
    description = `Curious viewers exploring ${avgDiversity.toFixed(0)}+ genres. Moderate engagement but high content variety.`;
  } else if (engagement === 'Medium' && avgSess >= 45) {
    name = `Regular ${topGenre} Viewers`;
    description = `Steady viewers with consistent ${topGenre} consumption and moderate session length.`;
  } else {
    name = `${engagement}-Engagement ${topGenre} Viewers`;
    description = `Viewers with ${engagement.toLowerCase()} engagement and a preference for ${topGenre} content.`;
  }

  return { name, description };
}

const RECOMMENDATION_CATALOG: Record<string, string[]> = {
  'High-Engagement Action Viewers': ['Action Movies', 'Thriller Movies', 'Trending Action Content', 'Premium Action Series'],
  'High-Engagement Thriller Viewers': ['Thriller Movies', 'Mystery Series', 'Trending Thrillers', 'Crime Dramas'],
  'High-Engagement Sci-Fi Viewers': ['Sci-Fi Blockbusters', 'Future-Tech Documentaries', 'Trending Sci-Fi Series', 'Space Adventure Movies'],
  'High-Engagement Drama Viewers': ['Award-Winning Dramas', 'Trending Drama Series', 'Critically Acclaimed Films', 'Character-Driven Stories'],
  'High-Engagement Documentary Viewers': ['Top Documentaries', 'Trending True Stories', 'Nature & Science', 'Investigative Series'],
  'Highly Engaged Multi-Genre Viewers': ['Curated Genre Mix', 'Trending Across Genres', "Editor's Picks Collection", 'Award-Winning Selections'],
  'Casual Short-Session Viewers': ['Short Films', 'Trending Clips', 'Popular Quick-Watch Content', 'Bite-Sized Comedy'],
  'Genre Explorers': ['Recommended Genre Mix', 'Trending Content', 'Adjacent Genres', 'Discovery Collection'],
  'Low-Activity Viewers': ['Popular Movies', 'Trending Shows', 'Easy-to-Discover Content', 'Re-Engagement Picks'],
  'Regular Action Viewers': ['Action Movies', 'Trending Action', 'Popular Action Series', 'New Action Releases'],
  'Regular Drama Viewers': ['Drama Series', 'Trending Dramas', 'Popular Drama Movies', 'Critically Acclaimed Drama'],
  'Regular Comedy Viewers': ['Comedy Movies', 'Trending Comedy', 'Popular Comedy Series', 'Feel-Good Picks'],
  'Regular Thriller Viewers': ['Thriller Movies', 'Trending Thrillers', 'Mystery Series', 'Crime Content'],
  'Regular Documentary Viewers': ['Documentaries', 'Trending True Stories', 'Nature Series', 'Educational Content'],
  'Regular Sci-Fi Viewers': ['Sci-Fi Movies', 'Trending Sci-Fi', 'Popular Sci-Fi Series', 'Future-Tech Shows'],
  'Regular Romance Viewers': ['Romance Movies', 'Trending Romance', 'Popular Rom-Coms', 'Feel-Good Series'],
  'Regular Animation Viewers': ['Animation Movies', 'Trending Animation', 'Popular Animated Series', 'Family-Friendly Picks'],
  'Medium-Engagement Action Viewers': ['Action Movies', 'Trending Action', 'Popular Action Series', 'Action Classics'],
  'Medium-Engagement Drama Viewers': ['Drama Series', 'Trending Dramas', 'Critically Acclaimed Films', 'Character Stories'],
  'Medium-Engagement Comedy Viewers': ['Comedy Movies', 'Trending Comedy', 'Popular Comedy Series', 'Feel-Good Content'],
  'Medium-Engagement Thriller Viewers': ['Thriller Movies', 'Trending Thrillers', 'Mystery Series', 'Crime Dramas'],
  'Medium-Engagement Documentary Viewers': ['Documentaries', 'Trending True Stories', 'Nature & Science', 'Investigative Series'],
  'Medium-Engagement Sci-Fi Viewers': ['Sci-Fi Movies', 'Trending Sci-Fi', 'Popular Sci-Fi Series', 'Space Adventures'],
  'Medium-Engagement Romance Viewers': ['Romance Movies', 'Trending Romance', 'Popular Rom-Coms', 'Love Stories'],
  'Medium-Engagement Animation Viewers': ['Animation Movies', 'Trending Animation', 'Popular Animated Series', 'Family Picks'],
};

function getRecommendations(segmentName: string, topGenre: string): string[] {
  if (RECOMMENDATION_CATALOG[segmentName]) return RECOMMENDATION_CATALOG[segmentName];
  // fallback: construct based on genre
  return [
    `${topGenre} Movies`,
    `Trending ${topGenre}`,
    `Popular ${topGenre} Series`,
    'Discovery Collection',
  ];
}

export interface TrainedModel {
  scaler: Scaler;
  centroids: number[][];
  k: number;
  labels: number[];
  segments: SegmentData[];
  metrics: MetricsResponse;
  dashboard: DashboardStats;
  data: UserData[];
  trained: boolean;
}

let cachedModel: TrainedModel | null = null;

export function trainModel(rawData: UserData[]): TrainedModel {
  const { cleaned } = cleanDataset(rawData);

  const genreEncoder = (g: string) => (GENRE_MAP[g] !== undefined && GENRE_MAP[g] >= 0 ? GENRE_MAP[g] : 3); // fallback to Drama index
  const Xraw = extractFeatureMatrix(cleaned, genreEncoder);
  const scaler = fitScaler(Xraw);
  const X = applyScaler(Xraw, scaler);

  // test k from 2 to 6
  const silhouetteScores: { k: number; score: number }[] = [];
  let bestK = 2;
  let bestScore = -1;
  let bestResult: KMeansResult | null = null;
  let bestScaler = scaler;

  for (let k = 2; k <= 6; k++) {
    const result = kmeans(X, k, 200, 42 + k);
    const score = silhouetteScore(X, result.labels);
    silhouetteScores.push({ k, score });
    if (score > bestScore) {
      bestScore = score;
      bestK = k;
      bestResult = result;
    }
  }

  if (!bestResult) {
    bestResult = kmeans(X, 2, 200, 42);
    bestK = 2;
    bestScore = silhouetteScore(X, bestResult.labels);
  }

  // build segment stats
  const segments: SegmentData[] = [];
  for (let c = 0; c < bestK; c++) {
    const members = cleaned.filter((_, i) => bestResult!.labels[i] === c);
    if (members.length === 0) continue;
    const avgWatch = members.reduce((s, u) => s + u.watch_time_hours, 0) / members.length;
    const avgSess = members.reduce((s, u) => s + u.avg_session_mins, 0) / members.length;
    const avgFreq = members.reduce((s, u) => s + u.sessions_per_week, 0) / members.length;
    const avgDiv = members.reduce((s, u) => s + u.genre_diversity, 0) / members.length;
    const avgWeekend = members.reduce((s, u) => s + u.weekend_usage_pct, 0) / members.length;
    const avgRecency = members.reduce((s, u) => s + u.days_since_last_visit, 0) / members.length;

    // top genre
    const genreCounts: Record<string, number> = {};
    members.forEach((u) => {
      genreCounts[u.top_genre] = (genreCounts[u.top_genre] || 0) + 1;
    });
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Drama';

    // engagement
    const engScore = avgWatch * 0.3 + avgSess * 0.3 + avgFreq * 5;
    const engagement = engScore > 50 ? 'High' : engScore > 25 ? 'Medium' : 'Low';

    const { name, description } = nameSegment({
      avgWatch,
      avgSess,
      avgFreq,
      avgDiversity: avgDiv,
      avgRecency,
      topGenre,
      engagement,
    });

    segments.push({
      segment_id: c,
      segment_name: name,
      description,
      user_count: members.length,
      avg_watch_time: Math.round(avgWatch * 10) / 10,
      avg_session_duration: Math.round(avgSess),
      avg_sessions_per_week: Math.round(avgFreq * 10) / 10,
      avg_genre_diversity: Math.round(avgDiv * 10) / 10,
      avg_weekend_usage: Math.round(avgWeekend),
      avg_days_since_last_visit: Math.round(avgRecency),
      top_genre: topGenre,
      engagement_level: engagement,
    });
  }

  const totalUsers = cleaned.length;
  const avgWatchAll = cleaned.reduce((s, u) => s + u.watch_time_hours, 0) / totalUsers;
  const avgSessAll = cleaned.reduce((s, u) => s + u.avg_session_mins, 0) / totalUsers;

  const dashboard: DashboardStats = {
    total_users: totalUsers,
    num_segments: segments.length,
    avg_watch_time: Math.round(avgWatchAll * 10) / 10,
    avg_session_duration: Math.round(avgSessAll),
    best_silhouette: Math.round(bestScore * 1000) / 1000,
  };

  const clusterDist = segments.map((s) => ({
    segment_id: s.segment_id,
    segment_name: s.segment_name,
    count: s.user_count,
  }));

  const metrics: MetricsResponse = {
    best_k: bestK,
    best_silhouette: Math.round(bestScore * 1000) / 1000,
    silhouette_scores: silhouetteScores.map((s) => ({ k: s.k, score: Math.round(s.score * 1000) / 1000 })),
    cluster_distribution: clusterDist,
    inertia: Math.round(bestResult.inertia * 100) / 100,
    n_features: X[0].length,
    model_type: 'StandardScaler + KMeans',
  };

  cachedModel = {
    scaler: bestScaler,
    centroids: bestResult.centroids,
    k: bestK,
    labels: bestResult.labels,
    segments,
    metrics,
    dashboard,
    data: cleaned,
    trained: true,
  };

  return cachedModel;
}

export function getModel(): TrainedModel | null {
  return cachedModel;
}

export function isModelTrained(): boolean {
  return cachedModel !== null;
}

export function predictUser(input: Omit<UserData, 'engagement_level'>): RecommendResponse {
  if (!cachedModel) throw new Error('Model not trained');

  const genreEncoder = (g: string) => (GENRE_MAP[g] !== undefined && GENRE_MAP[g] >= 0 ? GENRE_MAP[g] : 3);
  const genre = !input.top_genre || input.top_genre === 'Unknown' ? 'Drama' : input.top_genre;

  const features = [
    Number(input.watch_time_hours),
    Number(input.avg_session_mins),
    Number(input.sessions_per_week),
    Number(input.genre_diversity),
    Number(input.weekend_usage_pct),
    Number(input.days_since_last_visit),
    genreEncoder(genre) / (GENRES.length - 1),
  ];

  const scaled = features.map((v, j) => (v - cachedModel!.scaler.mean[j]) / cachedModel!.scaler.std[j]);

  let bestCluster = 0;
  let bestDist = Infinity;
  for (let c = 0; c < cachedModel.centroids.length; c++) {
    const dist = euclidean(scaled, cachedModel.centroids[c]);
    if (dist < bestDist) {
      bestDist = dist;
      bestCluster = c;
    }
  }

  const segment = cachedModel.segments.find((s) => s.segment_id === bestCluster);
  if (!segment) throw new Error('Segment not found');

  const recommendations = getRecommendations(segment.segment_name, segment.top_genre);

  const characteristics = [
    { label: 'Watch Time', value: `${input.watch_time_hours} hrs` },
    { label: 'Avg Session', value: `${input.avg_session_mins} min` },
    { label: 'Sessions/Week', value: `${input.sessions_per_week}` },
    { label: 'Genre Diversity', value: `${input.genre_diversity} genres` },
    { label: 'Weekend Usage', value: `${input.weekend_usage_pct}%` },
    { label: 'Days Since Visit', value: `${input.days_since_last_visit}` },
  ];

  return {
    user_id: input.user_id,
    segment_id: bestCluster,
    segment_name: segment.segment_name,
    description: segment.description,
    recommendations,
    distance_to_centroid: Math.round(bestDist * 100) / 100,
    characteristics,
  };
}

export function getHealth(): HealthResponse {
  return {
    status: 'ok',
    model_loaded: cachedModel !== null,
    dataset_loaded: cachedModel !== null,
  };
}

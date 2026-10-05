import { GENRES, type UserData } from '@/types';

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function gaussian(rng: () => number, mean: number, std: number): number {
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

const ARCHETYPES = [
  { label: 'High-Engagement Action Viewers', watch: [50, 10], sess: [85, 15], freq: [8, 2], diversity: [2, 1], weekend: [70, 15], recency: [1, 1], genres: ['Action', 'Thriller', 'Sci-Fi'] as const },
  { label: 'Casual Short-Session Viewers', watch: [12, 4], sess: [25, 8], freq: [3, 1.5], diversity: [3, 1], weekend: [45, 15], recency: [12, 7], genres: ['Comedy', 'Romance', 'Animation'] as const },
  { label: 'Genre Explorers', watch: [30, 6], sess: [50, 12], freq: [5, 1.5], diversity: [6, 1.2], weekend: [55, 12], recency: [4, 3], genres: ['Documentary', 'Drama', 'Sci-Fi', 'Animation'] as const },
  { label: 'Low-Activity Viewers', watch: [5, 2.5], sess: [18, 6], freq: [1.5, 0.8], diversity: [2, 1], weekend: [30, 15], recency: [25, 10], genres: ['Drama', 'Comedy'] as const },
  { label: 'Highly Engaged Multi-Genre Viewers', watch: [45, 8], sess: [70, 12], freq: [7, 1.5], diversity: [7, 0.8], weekend: [65, 12], recency: [2, 1.5], genres: ['Drama', 'Action', 'Documentary', 'Sci-Fi'] as const },
];

function engagementFromStats(watch: number, sess: number, freq: number): string {
  const score = watch * 0.3 + sess * 0.3 + freq * 5;
  if (score > 50) return 'High';
  if (score > 25) return 'Medium';
  return 'Low';
}

export function generateDataset(n: number = 1000, seed: number = 42): UserData[] {
  const rng = mulberry32(seed);
  const users: UserData[] = [];
  // distribute across archetypes
  const perArch = Math.floor(n / ARCHETYPES.length);
  const remainder = n - perArch * ARCHETYPES.length;

  let counter = 1;
  for (let a = 0; a < ARCHETYPES.length; a++) {
    const count = a < remainder ? perArch + 1 : perArch;
    const arch = ARCHETYPES[a];
    for (let i = 0; i < count; i++) {
      const watch = clamp(gaussian(rng, arch.watch[0], arch.watch[1]), 0.5, 120);
      const sess = clamp(gaussian(rng, arch.sess[0], arch.sess[1]), 5, 180);
      const freq = clamp(gaussian(rng, arch.freq[0], arch.freq[1]), 0.5, 14);
      const diversity = Math.round(clamp(gaussian(rng, arch.diversity[0], arch.diversity[1]), 1, 8));
      const weekend = clamp(gaussian(rng, arch.weekend[0], arch.weekend[1]), 5, 95);
      const recency = Math.round(clamp(gaussian(rng, arch.recency[0], arch.recency[1]), 0, 60));
      const genre = pick(rng, arch.genres.length ? arch.genres : GENRES);

      // inject some missing/edge cases ~3%
      let realGenre = genre;
      if (rng() < 0.02) realGenre = '';
      if (rng() < 0.01) realGenre = 'Unknown';

      users.push({
        user_id: `U${String(counter).padStart(4, '0')}`,
        watch_time_hours: Math.round(watch * 10) / 10,
        avg_session_mins: Math.round(sess),
        sessions_per_week: Math.round(freq * 10) / 10,
        top_genre: realGenre,
        genre_diversity: diversity,
        weekend_usage_pct: Math.round(weekend),
        days_since_last_visit: recency,
        engagement_level: engagementFromStats(watch, sess, freq),
      });
      counter++;
    }
  }
  // shuffle
  for (let i = users.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [users[i], users[j]] = [users[j], users[i]];
  }
  return users;
}

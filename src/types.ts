export interface UserData {
  user_id: string;
  watch_time_hours: number;
  avg_session_mins: number;
  sessions_per_week: number;
  top_genre: string;
  genre_diversity: number;
  weekend_usage_pct: number;
  days_since_last_visit: number;
  engagement_level: string;
}

export interface SegmentData {
  segment_id: number;
  segment_name: string;
  description: string;
  user_count: number;
  avg_watch_time: number;
  avg_session_duration: number;
  avg_sessions_per_week: number;
  avg_genre_diversity: number;
  avg_weekend_usage: number;
  avg_days_since_last_visit: number;
  top_genre: string;
  engagement_level: string;
}

export interface RecommendResponse {
  user_id: string;
  segment_id: number;
  segment_name: string;
  description: string;
  recommendations: string[];
  distance_to_centroid: number;
  characteristics: { label: string; value: string }[];
}

export interface DashboardStats {
  total_users: number;
  num_segments: number;
  avg_watch_time: number;
  avg_session_duration: number;
  best_silhouette: number;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  dataset_loaded: boolean;
}

export interface MetricsResponse {
  best_k: number;
  best_silhouette: number;
  silhouette_scores: { k: number; score: number }[];
  cluster_distribution: { segment_id: number; segment_name: string; count: number }[];
  inertia: number;
  n_features: number;
  model_type: string;
}

export interface AnalysisForm {
  user_id: string;
  watch_time_hours: string;
  avg_session_mins: string;
  sessions_per_week: string;
  top_genre: string;
  genre_diversity: string;
  weekend_usage_pct: string;
  days_since_last_visit: string;
}

export const GENRES = ['Action', 'Drama', 'Comedy', 'Thriller', 'Documentary', 'Sci-Fi', 'Romance', 'Animation'] as const;
export type Genre = typeof GENRES[number];

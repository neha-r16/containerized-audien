# Hackathon Report — OTT Audience Intelligence

## Problem Statement

An OTT platform needs to automatically analyze user viewing behavior, group similar users into meaningful behavioral segments using unsupervised machine learning, and provide personalized content recommendations for each segment.

## Solution

We built a complete containerized service with:
- **ML pipeline** using StandardScaler + KMeans clustering
- **FastAPI backend** serving real-time segment predictions
- **React dashboard** with 5 analytical views
- **Docker Compose** orchestration with trainer, API, evaluator, and frontend services

## ML Approach

### Dataset
A synthetic demo dataset of 1000 realistic OTT user records with 9 columns matching the required schema. Data is generated using a seeded random generator with 5 behavioral archetypes (high-engagement action, casual short-session, genre explorers, low-activity, highly engaged multi-genre) plus ~3% edge cases (missing/unknown genres).

### Preprocessing
1. **Validation:** All required columns checked; missing columns cause training to fail with a clear error.
2. **Deduplication:** Duplicate `user_id` rows removed.
3. **Missing values:** Missing/unknown genres imputed with the most common valid genre; numeric NaNs filled with median.
4. **Encoding:** Categorical `top_genre` encoded with LabelEncoder and normalized to [0,1].
5. **Scaling:** 6 numeric behavioral features + genre feature scaled with StandardScaler.

### Clustering
- KMeans trained for K=2,3,4,5,6
- Silhouette score calculated for each K (sampled 500 points for speed)
- Best K selected by highest silhouette score
- Final model persisted using joblib

### Segment Naming
Segment names are **derived from actual cluster characteristics** — not hard-coded. The naming logic examines:
- Average watch time, session duration, frequency
- Genre diversity
- Days since last visit
- Top genre in the cluster
- Computed engagement level (High/Medium/Low)

This produces names like "High-Engagement Action Viewers", "Casual Short-Session Viewers", "Genre Explorers", "Low-Activity Viewers", and "Highly Engaged Multi-Genre Viewers" when the data supports those patterns.

### Recommendations
Rule-based recommendation catalog maps segment names to 3-5 content recommendations. Unknown segment names get genre-based fallback recommendations.

## Validation
- Negative watch time, session duration, sessions/week, genre diversity, days since visit → rejected (422)
- Weekend usage outside [0,100] → rejected
- Missing user_id → rejected
- Missing/unknown genre → handled gracefully (imputed to most common genre)
- No stack traces exposed to users — all errors return clean JSON messages

## Evaluation Results

The evaluator service tests:
1. **API health success** — `/health` returns `{"status":"ok","model_loaded":true}`
2. **Silhouette score** — retrieved from `/metrics`
3. **Cluster counts** — verified from `/segments`
4. **Recommendation success** — 5 representative users sent to `/recommend`, all return valid segments + recommendations
5. **Invalid input handling** — 5 invalid payloads (negative values, out-of-range, missing fields, unknown genre) tested

Results are written to `metrics.json` in the evaluator output volume.

## Frontend Dashboard

A professional dark analytics dashboard with:
- 5 tabs: Dashboard, Segments, User Analyzer, Analytics, API Status
- "AI/ML Powered Audience Segmentation" badge
- Responsive layout (mobile + desktop)
- Loading indicators, empty states, error messages
- Smooth lightweight animations (fade-in, slide-in, hover transitions)
- Custom SVG charts (bar, donut, line) — no external chart library
- The **Analyze Audience** button sends real data to the backend KMeans model — no fake responses

## Fallback Architecture

The frontend includes a complete client-side ML engine (pure TypeScript StandardScaler + KMeans + silhouette score). If the Python API is unavailable, the dashboard automatically uses client-side inference. This ensures the demo always works, even outside Docker.

## Docker Orchestration

```
docker compose up --build
```

| Service | Role | Dependency |
|---------|------|------------|
| trainer | Trains model, saves to /models volume | None |
| api | Loads persisted model, serves REST API | trainer completes successfully |
| evaluator | Tests API, writes metrics.json | api healthcheck passes |
| frontend | Serves React dashboard via nginx | api healthcheck passes |

## Key Design Decisions

1. **No LLM/AI service used** — pure scikit-learn KMeans as specified
2. **Model persistence** — trained once by trainer, loaded by API, never retrained per request
3. **Shared ML code** — `shared/ml_pipeline.py` used by both trainer and API to avoid duplication
4. **Client-side fallback** — ensures demo works even without Docker backend
5. **Synthetic data clearly labeled** — never claimed as real-world data

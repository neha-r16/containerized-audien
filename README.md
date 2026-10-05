# OTT Audience Intelligence

A containerized audience segmentation and personalization service for OTT platforms. Automatically analyzes user viewing behavior, groups similar users into meaningful behavioral segments using unsupervised machine learning (KMeans), and provides personalized content recommendations.

> **Note:** This is a 3-hour student hackathon prototype. The dataset is a clearly-labeled **synthetic demo dataset** of 1000 realistic user records — it is NOT real-world data.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Trainer    │────▶│     API     │◀────│  Evaluator   │
│  (Python)    │     │  (FastAPI)  │     │  (Python)    │
│  KMeans ML   │     │  REST API   │     │  Tests+Metrics│
└─────────────┘     └─────────────┘     └──────────────┘
      │                    │
      ▼                    ▼
  /models volume      /data volume
  (persisted model)   (CSV dataset)
                           │
                    ┌──────┴──────┐
                    │  Frontend   │
                    │  (React +   │
                    │  Vite + TW) │
                    └─────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | Python FastAPI |
| ML | Pandas, NumPy, Scikit-learn (StandardScaler + KMeans) |
| Charts | Custom lightweight SVG charts |
| Storage | Local CSV + persisted model files (joblib) |
| Deployment | Docker + Docker Compose |

## Quick Start

### One-Command Demo

```bash
docker compose up --build
```

After startup:
- **Dashboard:** http://localhost:3000
- **API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React analytics dashboard |
| API | 8000 | FastAPI REST endpoints |
| Trainer | — | One-shot: trains and saves model |
| Evaluator | — | One-shot: tests API and writes metrics.json |

## ML Pipeline

1. Load the 1000-user OTT dataset (generated if not provided)
2. Validate columns and data types
3. Handle missing values and duplicates
4. Encode categorical genre (LabelEncoder)
5. Scale numerical features (StandardScaler)
6. Train KMeans for K=2..6
7. Calculate silhouette score for each K
8. Select best K by silhouette score
9. Train final KMeans model
10. Save preprocessing pipeline + model to disk
11. Generate human-readable segment names from cluster characteristics

**The model is never retrained during an API request.** The API loads the persisted model at startup.

## API Endpoints

### `GET /health`
```json
{"status": "ok", "model_loaded": true, "dataset_loaded": true}
```

### `POST /recommend`
```bash
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "U0001",
    "watch_time_hours": 32.5,
    "avg_session_mins": 85,
    "sessions_per_week": 8,
    "top_genre": "Action",
    "genre_diversity": 2,
    "weekend_usage_pct": 70,
    "days_since_last_visit": 1
  }'
```

Response:
```json
{
  "user_id": "U0001",
  "segment_id": 2,
  "segment_name": "High-Engagement Action Viewers",
  "description": "Power users with long viewing sessions...",
  "recommendations": ["Action Movies", "Thriller Movies", "Trending Action Content", "Premium Action Series"],
  "distance_to_centroid": 0.42,
  "characteristics": [...]
}
```

### `GET /segments`
Returns all audience segments with statistics.

### `GET /metrics`
Returns model metrics: best K, silhouette scores, cluster distribution, inertia.

### `GET /users?limit=50`
Returns sample users from the dataset.

### `GET /dashboard-stats`
Returns aggregate statistics for the dashboard.

## Frontend Dashboard

The **OTT Audience Intelligence** dashboard has 5 sections:

1. **Dashboard** — Total users, segments, avg watch time, avg session, best silhouette score
2. **Audience Segments** — Segment cards with name, user count, avg metrics, top genre, engagement
3. **User Analyzer** — Form to input user data and get real ML predictions + recommendations
4. **Analytics** — Cluster distribution, watch time by segment, session duration, genre distribution, silhouette by K
5. **API Status** — Service health, model loaded status, dataset loaded status, sample users

## Fallback Mode

The frontend includes a **client-side ML engine** (pure TypeScript implementation of StandardScaler + KMeans + silhouette score). If the Python backend is not available, the dashboard automatically falls back to client-side inference so the demo always works.

## Project Structure

```
.
├── docker-compose.yml          # Root compose: trainer + api + evaluator + frontend
├── Dockerfile                  # Frontend Docker image
├── nginx.conf                  # Nginx config for frontend
├── src/                        # React frontend
│   ├── App.tsx                 # Main dashboard application
│   ├── api/client.ts           # API client with backend fallback
│   ├── ml/engine.ts            # Client-side ML engine (fallback)
│   ├── data/dataset.ts         # Demo dataset generator (1000 users)
│   ├── components/Charts.tsx   # SVG chart components
│   └── types.ts                # TypeScript types
├── backend/
│   ├── docker-compose.yml      # Backend-only compose
│   ├── shared/
│   │   ├── ml_pipeline.py      # Shared ML pipeline (train, predict, name segments)
│   │   └── requirements.txt
│   ├── trainer/
│   │   ├── train.py            # Trainer entry point
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── api/
│   │   ├── main.py             # FastAPI app
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── evaluator/
│       ├── evaluate.py         # Evaluator entry point
│       ├── Dockerfile
│       └── requirements.txt
├── sample_requests.sh          # Example API requests
├── README.md
└── REPORT.md
```

## Development

### Frontend (local)
```bash
npm install
npm run dev
```

### Backend (local)
```bash
cd backend
pip install -r shared/requirements.txt -r trainer/requirements.txt -r api/requirements.txt
PYTHONPATH=./backend python trainer/train.py
PYTHONPATH=./backend uvicorn api.main:app --port 8000
```

## License

Hackathon prototype — free to use for educational purposes.

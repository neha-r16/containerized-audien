"""FastAPI service: loads persisted model and serves segmentation/recommendation endpoints."""

import os
import sys
import pandas as pd
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.ml_pipeline import load_model, predict, DATASET_PATH, MODELS_DIR, KNOWN_GENRES

app = FastAPI(title="OTT Audience Intelligence API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model at startup (never retrain during a request)
_model_artifact = None
_dataset_df = None


def get_model():
    global _model_artifact
    if _model_artifact is None:
        _model_artifact = load_model(MODELS_DIR)
    return _model_artifact


def get_dataset():
    global _dataset_df
    if _dataset_df is None:
        if os.path.exists(DATASET_PATH):
            _dataset_df = pd.read_csv(DATASET_PATH)
        else:
            _dataset_df = pd.DataFrame()
    return _dataset_df


class RecommendInput(BaseModel):
    user_id: str
    watch_time_hours: float
    avg_session_mins: float
    sessions_per_week: float
    top_genre: Optional[str] = ""
    genre_diversity: float
    weekend_usage_pct: float
    days_since_last_visit: float

    @field_validator("watch_time_hours")
    @classmethod
    def check_watch_time(cls, v):
        if v < 0:
            raise ValueError("watch_time_hours cannot be negative")
        return v

    @field_validator("avg_session_mins")
    @classmethod
    def check_session(cls, v):
        if v < 0:
            raise ValueError("avg_session_mins cannot be negative")
        if v > 600:
            raise ValueError("avg_session_mins seems unrealistic (max 600 min)")
        return v

    @field_validator("sessions_per_week")
    @classmethod
    def check_freq(cls, v):
        if v < 0:
            raise ValueError("sessions_per_week cannot be negative")
        return v

    @field_validator("genre_diversity")
    @classmethod
    def check_diversity(cls, v):
        if v < 0:
            raise ValueError("genre_diversity cannot be negative")
        return v

    @field_validator("weekend_usage_pct")
    @classmethod
    def check_weekend(cls, v):
        if v < 0 or v > 100:
            raise ValueError("weekend_usage_pct must be between 0 and 100")
        return v

    @field_validator("days_since_last_visit")
    @classmethod
    def check_recency(cls, v):
        if v < 0:
            raise ValueError("days_since_last_visit cannot be negative")
        return v


@app.get("/health")
def health():
    model = get_model()
    ds = get_dataset()
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "dataset_loaded": len(ds) > 0,
    }


@app.post("/recommend")
def recommend(input: RecommendInput):
    model = get_model()
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run the trainer service first.")

    try:
        result = predict(model, input.model_dump())
        return result
    except Exception:
        raise HTTPException(status_code=500, detail="Prediction failed. Please check your input values.")


@app.get("/segments")
def segments():
    model = get_model()
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")
    return model["segments"]


@app.get("/metrics")
def metrics():
    model = get_model()
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")
    return model["metrics"]


@app.get("/users")
def users(limit: int = 50):
    ds = get_dataset()
    if len(ds) == 0:
        raise HTTPException(status_code=503, detail="Dataset not loaded.")
    limit = min(limit, 200)
    return ds.head(limit).to_dict(orient="records")


@app.get("/dashboard-stats")
def dashboard_stats():
    model = get_model()
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")
    return model["dashboard"]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

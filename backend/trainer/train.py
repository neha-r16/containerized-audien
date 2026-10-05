"""Trainer service: generates/cleans dataset, trains KMeans, saves model to /models."""

import os
import sys
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.ml_pipeline import (
    generate_demo_dataset,
    validate_and_clean,
    train_pipeline,
    save_model,
    DATASET_PATH,
    DATA_DIR,
    MODELS_DIR,
)


def main():
    print("=" * 60)
    print("  OTT Audience Segmentation — Trainer Service")
    print("=" * 60)

    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Step 1: Load or generate dataset
    if os.path.exists(DATASET_PATH):
        print(f"[1/7] Loading existing dataset from {DATASET_PATH}")
        df = pd.read_csv(DATASET_PATH)
    else:
        print("[1/7] No dataset found — generating 1000-record DEMO dataset")
        print("      (This is clearly labeled synthetic demo data, NOT real-world data)")
        df = generate_demo_dataset(n=1000, seed=42)
        df.to_csv(DATASET_PATH, index=False)
        print(f"      Saved demo dataset to {DATASET_PATH}")

    print(f"      Dataset shape: {df.shape}")
    print(f"      Columns: {list(df.columns)}")

    # Step 2: Validate
    print("[2/7] Validating columns and data types...")
    required = [
        "user_id", "watch_time_hours", "avg_session_mins", "sessions_per_week",
        "top_genre", "genre_diversity", "weekend_usage_pct", "days_since_last_visit",
        "engagement_level",
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(f"  ERROR: Missing columns: {missing}")
        sys.exit(1)
    print("      All required columns present.")

    # Step 3: Handle missing values and duplicates
    print("[3/7] Handling missing values and duplicates...")
    before = len(df)
    df_clean = validate_and_clean(df)
    after = len(df_clean)
    print(f"      Removed {before - after} duplicate rows. Imputed missing genres/numerics.")

    # Step 4-6: Encode, scale, train
    print("[4/7] Encoding categorical genre (LabelEncoder)...")
    print("[5/7] Scaling numerical features (StandardScaler)...")
    print("[6/7] Training KMeans for K=2..6, selecting best by silhouette score...")

    artifact = train_pipeline(df)

    print(f"      Best K = {artifact['metrics']['best_k']}")
    print(f"      Best Silhouette = {artifact['metrics']['best_silhouette']}")
    print(f"      Inertia = {artifact['metrics']['inertia']}")
    print(f"      Segments found: {len(artifact['segments'])}")
    for s in artifact["segments"]:
        print(f"        C{s['segment_id']}: {s['segment_name']} ({s['user_count']} users, {s['engagement_level']} engagement)")

    # Step 7: Save
    print("[7/7] Saving model artifacts to", MODELS_DIR)
    save_model(artifact)
    print("      Saved: scaler.pkl, kmeans.pkl, genre_encoder.pkl, metadata.json")

    print()
    print("Training complete. Model is ready for the API service.")
    print("=" * 60)


if __name__ == "__main__":
    main()

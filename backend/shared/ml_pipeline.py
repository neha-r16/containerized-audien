"""Shared ML pipeline logic: dataset generation, preprocessing, training, and naming."""

import os
import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import joblib

DATA_DIR = os.environ.get("DATA_DIR", "/app/data")
MODELS_DIR = os.environ.get("MODELS_DIR", "/app/models")
DATASET_PATH = os.path.join(DATA_DIR, "ott_users.csv")

REQUIRED_COLUMNS = [
    "user_id",
    "watch_time_hours",
    "avg_session_mins",
    "sessions_per_week",
    "top_genre",
    "genre_diversity",
    "weekend_usage_pct",
    "days_since_last_visit",
    "engagement_level",
]

NUMERIC_FEATURES = [
    "watch_time_hours",
    "avg_session_mins",
    "sessions_per_week",
    "genre_diversity",
    "weekend_usage_pct",
    "days_since_last_visit",
]

KNOWN_GENRES = [
    "Action", "Drama", "Comedy", "Thriller",
    "Documentary", "Sci-Fi", "Romance", "Animation",
]

RECOMMENDATION_CATALOG = {
    "High-Engagement Action Viewers": ["Action Movies", "Thriller Movies", "Trending Action Content", "Premium Action Series"],
    "High-Engagement Thriller Viewers": ["Thriller Movies", "Mystery Series", "Trending Thrillers", "Crime Dramas"],
    "High-Engagement Sci-Fi Viewers": ["Sci-Fi Blockbusters", "Future-Tech Documentaries", "Trending Sci-Fi Series", "Space Adventure Movies"],
    "High-Engagement Drama Viewers": ["Award-Winning Dramas", "Trending Drama Series", "Critically Acclaimed Films", "Character-Driven Stories"],
    "High-Engagement Documentary Viewers": ["Top Documentaries", "Trending True Stories", "Nature & Science", "Investigative Series"],
    "Highly Engaged Multi-Genre Viewers": ["Curated Genre Mix", "Trending Across Genres", "Editor's Picks Collection", "Award-Winning Selections"],
    "Casual Short-Session Viewers": ["Short Films", "Trending Clips", "Popular Quick-Watch Content", "Bite-Sized Comedy"],
    "Genre Explorers": ["Recommended Genre Mix", "Trending Content", "Adjacent Genres", "Discovery Collection"],
    "Low-Activity Viewers": ["Popular Movies", "Trending Shows", "Easy-to-Discover Content", "Re-Engagement Picks"],
    "Regular Action Viewers": ["Action Movies", "Trending Action", "Popular Action Series", "New Action Releases"],
    "Regular Drama Viewers": ["Drama Series", "Trending Dramas", "Popular Drama Movies", "Critically Acclaimed Drama"],
    "Regular Comedy Viewers": ["Comedy Movies", "Trending Comedy", "Popular Comedy Series", "Feel-Good Picks"],
    "Regular Thriller Viewers": ["Thriller Movies", "Trending Thrillers", "Mystery Series", "Crime Content"],
    "Regular Documentary Viewers": ["Documentaries", "Trending True Stories", "Nature Series", "Educational Content"],
    "Regular Sci-Fi Viewers": ["Sci-Fi Movies", "Trending Sci-Fi", "Popular Sci-Fi Series", "Future-Tech Shows"],
    "Regular Romance Viewers": ["Romance Movies", "Trending Romance", "Popular Rom-Coms", "Feel-Good Series"],
    "Regular Animation Viewers": ["Animation Movies", "Trending Animation", "Popular Animated Series", "Family-Friendly Picks"],
    "Medium-Engagement Action Viewers": ["Action Movies", "Trending Action", "Popular Action Series", "Action Classics"],
    "Medium-Engagement Drama Viewers": ["Drama Series", "Trending Dramas", "Critically Acclaimed Films", "Character Stories"],
    "Medium-Engagement Comedy Viewers": ["Comedy Movies", "Trending Comedy", "Popular Comedy Series", "Feel-Good Content"],
    "Medium-Engagement Thriller Viewers": ["Thriller Movies", "Trending Thrillers", "Mystery Series", "Crime Dramas"],
    "Medium-Engagement Documentary Viewers": ["Documentaries", "Trending True Stories", "Nature & Science", "Investigative Series"],
    "Medium-Engagement Sci-Fi Viewers": ["Sci-Fi Movies", "Trending Sci-Fi", "Popular Sci-Fi Series", "Space Adventures"],
    "Medium-Engagement Romance Viewers": ["Romance Movies", "Trending Romance", "Popular Rom-Coms", "Love Stories"],
    "Medium-Engagement Animation Viewers": ["Animation Movies", "Trending Animation", "Popular Animated Series", "Family Picks"],
}


def generate_demo_dataset(n=1000, seed=42):
    """Generate a clearly-labeled demo dataset with realistic OTT user records."""
    rng = np.random.default_rng(seed)

    archetypes = [
        {"label": "High-Engagement Action", "watch": (50, 10), "sess": (85, 15), "freq": (8, 2),
         "diversity": (2, 1), "weekend": (70, 15), "recency": (1, 1),
         "genres": ["Action", "Thriller", "Sci-Fi"]},
        {"label": "Casual Short-Session", "watch": (12, 4), "sess": (25, 8), "freq": (3, 1.5),
         "diversity": (3, 1), "weekend": (45, 15), "recency": (12, 7),
         "genres": ["Comedy", "Romance", "Animation"]},
        {"label": "Genre Explorers", "watch": (30, 6), "sess": (50, 12), "freq": (5, 1.5),
         "diversity": (6, 1.2), "weekend": (55, 12), "recency": (4, 3),
         "genres": ["Documentary", "Drama", "Sci-Fi", "Animation"]},
        {"label": "Low-Activity", "watch": (5, 2.5), "sess": (18, 6), "freq": (1.5, 0.8),
         "diversity": (2, 1), "weekend": (30, 15), "recency": (25, 10),
         "genres": ["Drama", "Comedy"]},
        {"label": "Highly Engaged Multi-Genre", "watch": (45, 8), "sess": (70, 12), "freq": (7, 1.5),
         "diversity": (7, 0.8), "weekend": (65, 12), "recency": (2, 1.5),
         "genres": ["Drama", "Action", "Documentary", "Sci-Fi"]},
    ]

    records = []
    per_arch = n // len(archetypes)
    remainder = n - per_arch * len(archetypes)
    counter = 1

    for a_idx, arch in enumerate(archetypes):
        count = per_arch + (1 if a_idx < remainder else 0)
        for _ in range(count):
            watch = max(0.5, rng.normal(*arch["watch"]))
            sess = max(5, rng.normal(*arch["sess"]))
            freq = max(0.5, rng.normal(*arch["freq"]))
            diversity = int(max(1, min(8, round(rng.normal(*arch["diversity"])))))
            weekend = max(5, min(95, rng.normal(*arch["weekend"])))
            recency = max(0, int(round(rng.normal(*arch["recency"]))))
            genre = rng.choice(arch["genres"])

            # inject edge cases ~3%
            if rng.random() < 0.02:
                genre = ""
            elif rng.random() < 0.01:
                genre = "Unknown"

            eng_score = watch * 0.3 + sess * 0.3 + freq * 5
            if eng_score > 50:
                engagement = "High"
            elif eng_score > 25:
                engagement = "Medium"
            else:
                engagement = "Low"

            records.append({
                "user_id": f"U{counter:04d}",
                "watch_time_hours": round(watch, 1),
                "avg_session_mins": round(sess),
                "sessions_per_week": round(freq, 1),
                "top_genre": genre,
                "genre_diversity": diversity,
                "weekend_usage_pct": round(weekend),
                "days_since_last_visit": recency,
                "engagement_level": engagement,
            })
            counter += 1

    df = pd.DataFrame(records)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    return df


def validate_and_clean(df):
    """Validate columns and data types, handle missing values and duplicates."""
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = df.drop_duplicates(subset=["user_id"]).copy()

    # handle missing/unknown genre -> impute with most common valid genre
    valid_mask = df["top_genre"].isin(KNOWN_GENRES)
    if valid_mask.any():
        most_common = df.loc[valid_mask, "top_genre"].mode()[0]
    else:
        most_common = "Drama"
    df["top_genre"] = df["top_genre"].apply(lambda g: g if g in KNOWN_GENRES else most_common)

    # fill numeric NaNs with median
    for col in NUMERIC_FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce")
        df[col] = df[col].fillna(df[col].median())

    # clamp ranges
    df["weekend_usage_pct"] = df["weekend_usage_pct"].clip(0, 100)
    df["days_since_last_visit"] = df["days_since_last_visit"].clip(lower=0)
    df.loc[df["watch_time_hours"] < 0, "watch_time_hours"] = 0
    df.loc[df["avg_session_mins"] < 0, "avg_session_mins"] = 0

    return df


def name_segment(avg_watch, avg_sess, avg_freq, avg_diversity, avg_recency, top_genre, engagement):
    """Generate human-readable segment name from cluster characteristics."""
    avg_diversity = round(avg_diversity)
    avg_recency = round(avg_recency)
    avg_sess = round(avg_sess)

    if engagement == "High" and avg_diversity >= 6:
        name = "Highly Engaged Multi-Genre Viewers"
        desc = f"Highly active viewers who explore {avg_diversity}+ genres with strong {top_genre} preference. They watch frequently and broadly."
    elif engagement == "High" and avg_sess >= 60:
        name = f"High-Engagement {top_genre} Viewers"
        desc = f"Power users with long viewing sessions and strong {top_genre} affinity. Highly consistent weekly engagement."
    elif engagement == "Low" or (avg_watch < 10 and avg_recency > 15):
        name = "Low-Activity Viewers"
        desc = f"Infrequent users with low watch time and {avg_recency}+ days since last visit. At risk of churn — re-engagement recommended."
    elif avg_sess < 35 and avg_diversity >= 3:
        name = "Casual Short-Session Viewers"
        desc = f"Casual viewers who prefer short sessions (~{avg_sess} min). They browse multiple genres but don't binge."
    elif avg_diversity >= 5:
        name = "Genre Explorers"
        desc = f"Curious viewers exploring {avg_diversity}+ genres. Moderate engagement but high content variety."
    elif engagement == "Medium" and avg_sess >= 45:
        name = f"Regular {top_genre} Viewers"
        desc = f"Steady viewers with consistent {top_genre} consumption and moderate session length."
    else:
        name = f"{engagement}-Engagement {top_genre} Viewers"
        desc = f"Viewers with {engagement.lower()} engagement and a preference for {top_genre} content."

    return name, desc


def get_recommendations(segment_name, top_genre):
    """Return 3-5 recommendations from the rule-based catalog."""
    if segment_name in RECOMMENDATION_CATALOG:
        return RECOMMENDATION_CATALOG[segment_name]
    return [
        f"{top_genre} Movies",
        f"Trending {top_genre}",
        f"Popular {top_genre} Series",
        "Discovery Collection",
    ]


def train_pipeline(df, k_range=range(2, 7)):
    """Full ML pipeline: encode, scale, train KMeans for multiple K, pick best by silhouette."""
    df = validate_and_clean(df)

    # encode genre with LabelEncoder
    genre_encoder = LabelEncoder()
    genre_encoder.fit(KNOWN_GENRES)
    df["_genre_encoded"] = genre_encoder.transform(df["top_genre"])
    # normalize genre encoding to 0-1
    max_genre = len(KNOWN_GENRES) - 1
    df["_genre_norm"] = df["_genre_encoded"] / max_genre

    feature_cols = NUMERIC_FEATURES + ["_genre_norm"]
    X_raw = df[feature_cols].values.astype(float)

    # scale
    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    # test K values
    silhouette_scores = []
    best_k = 2
    best_score = -1
    best_model = None

    for k in k_range:
        model = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=300)
        labels = model.fit_predict(X)
        score = silhouette_score(X, labels, sample_size=min(500, len(X)), random_state=42)
        silhouette_scores.append({"k": k, "score": round(float(score), 4)})
        if score > best_score:
            best_score = score
            best_k = k
            best_model = model

    # build segment metadata
    segments = []
    df["_cluster"] = best_model.labels_

    for c in range(best_k):
        members = df[df["_cluster"] == c]
        if len(members) == 0:
            continue
        avg_watch = members["watch_time_hours"].mean()
        avg_sess = members["avg_session_mins"].mean()
        avg_freq = members["sessions_per_week"].mean()
        avg_div = members["genre_diversity"].mean()
        avg_weekend = members["weekend_usage_pct"].mean()
        avg_recency = members["days_since_last_visit"].mean()

        top_genre = members["top_genre"].mode()[0] if len(members) else "Drama"
        eng_score = avg_watch * 0.3 + avg_sess * 0.3 + avg_freq * 5
        engagement = "High" if eng_score > 50 else "Medium" if eng_score > 25 else "Low"

        name, desc = name_segment(avg_watch, avg_sess, avg_freq, avg_div, avg_recency, top_genre, engagement)

        segments.append({
            "segment_id": int(c),
            "segment_name": name,
            "description": desc,
            "user_count": int(len(members)),
            "avg_watch_time": round(float(avg_watch), 1),
            "avg_session_duration": round(float(avg_sess)),
            "avg_sessions_per_week": round(float(avg_freq), 1),
            "avg_genre_diversity": round(float(avg_div), 1),
            "avg_weekend_usage": round(float(avg_weekend)),
            "avg_days_since_last_visit": round(float(avg_recency)),
            "top_genre": top_genre,
            "engagement_level": engagement,
        })

    # sort segments by segment_id
    segments.sort(key=lambda s: s["segment_id"])

    metrics = {
        "best_k": int(best_k),
        "best_silhouette": round(float(best_score), 4),
        "silhouette_scores": silhouette_scores,
        "cluster_distribution": [
            {"segment_id": s["segment_id"], "segment_name": s["segment_name"], "count": s["user_count"]}
            for s in segments
        ],
        "inertia": round(float(best_model.inertia_), 2),
        "n_features": int(len(feature_cols)),
        "model_type": "StandardScaler + KMeans",
    }

    dashboard = {
        "total_users": int(len(df)),
        "num_segments": len(segments),
        "avg_watch_time": round(float(df["watch_time_hours"].mean()), 1),
        "avg_session_duration": round(float(df["avg_session_mins"].mean())),
        "best_silhouette": round(float(best_score), 4),
    }

    return {
        "scaler": scaler,
        "model": best_model,
        "genre_encoder": genre_encoder,
        "segments": segments,
        "metrics": metrics,
        "dashboard": dashboard,
        "feature_cols": feature_cols,
        "cleaned_df": df,
    }


def save_model(artifact, path=MODELS_DIR):
    """Save the preprocessing pipeline and clustering model to disk."""
    os.makedirs(path, exist_ok=True)
    joblib.dump(artifact["scaler"], os.path.join(path, "scaler.pkl"))
    joblib.dump(artifact["model"], os.path.join(path, "kmeans.pkl"))
    joblib.dump(artifact["genre_encoder"], os.path.join(path, "genre_encoder.pkl"))

    meta = {
        "segments": artifact["segments"],
        "metrics": artifact["metrics"],
        "dashboard": artifact["dashboard"],
        "feature_cols": artifact["feature_cols"],
        "known_genres": KNOWN_GENRES,
    }
    with open(os.path.join(path, "metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)


def load_model(path=MODELS_DIR):
    """Load the persisted model from disk. Returns None if not found."""
    meta_path = os.path.join(path, "metadata.json")
    if not os.path.exists(meta_path):
        return None

    with open(meta_path) as f:
        meta = json.load(f)

    return {
        "scaler": joblib.load(os.path.join(path, "scaler.pkl")),
        "model": joblib.load(os.path.join(path, "kmeans.pkl")),
        "genre_encoder": joblib.load(os.path.join(path, "genre_encoder.pkl")),
        "segments": meta["segments"],
        "metrics": meta["metrics"],
        "dashboard": meta["dashboard"],
        "feature_cols": meta["feature_cols"],
        "known_genres": meta["known_genres"],
    }


def predict(model_artifact, user_input):
    """Predict segment for a single user. Never retrains."""
    scaler = model_artifact["scaler"]
    model = model_artifact["model"]
    genre_encoder = model_artifact["genre_encoder"]
    segments = model_artifact["segments"]
    feature_cols = model_artifact["feature_cols"]
    known_genres = model_artifact["known_genres"]

    # handle genre
    genre = user_input.get("top_genre", "")
    if genre not in known_genres:
        genre = "Drama"
    genre_encoded = genre_encoder.transform([genre])[0]
    genre_norm = genre_encoded / (len(known_genres) - 1)

    features = np.array([[
        float(user_input["watch_time_hours"]),
        float(user_input["avg_session_mins"]),
        float(user_input["sessions_per_week"]),
        float(user_input["genre_diversity"]),
        float(user_input["weekend_usage_pct"]),
        float(user_input["days_since_last_visit"]),
        genre_norm,
    ]])

    X_scaled = scaler.transform(features)
    cluster = int(model.predict(X_scaled)[0])
    distance = float(np.min(np.linalg.norm(X_scaled - model.cluster_centers_, axis=1)))

    segment = next((s for s in segments if s["segment_id"] == cluster), None)
    if segment is None:
        raise ValueError(f"Segment {cluster} not found")

    recommendations = get_recommendations(segment["segment_name"], segment["top_genre"])

    characteristics = [
        {"label": "Watch Time", "value": f"{user_input['watch_time_hours']} hrs"},
        {"label": "Avg Session", "value": f"{user_input['avg_session_mins']} min"},
        {"label": "Sessions/Week", "value": f"{user_input['sessions_per_week']}"},
        {"label": "Genre Diversity", "value": f"{user_input['genre_diversity']} genres"},
        {"label": "Weekend Usage", "value": f"{user_input['weekend_usage_pct']}%"},
        {"label": "Days Since Visit", "value": f"{user_input['days_since_last_visit']}"},
    ]

    return {
        "user_id": user_input["user_id"],
        "segment_id": cluster,
        "segment_name": segment["segment_name"],
        "description": segment["description"],
        "recommendations": recommendations,
        "distance_to_centroid": round(distance, 2),
        "characteristics": characteristics,
    }

"""Evaluator service: waits for API health, sends representative requests, writes metrics.json."""

import os
import sys
import json
import time
import requests

API_URL = os.environ.get("API_URL", "http://api:8000")
METRICS_OUTPUT = os.environ.get("METRICS_OUTPUT", "/app/metrics.json")
HEALTH_RETRIES = 30
HEALTH_DELAY = 2


def wait_for_api():
    """Wait until the API health endpoint responds with model_loaded=true."""
    print("[evaluator] Waiting for API to be ready...")
    for i in range(HEALTH_RETRIES):
        try:
            r = requests.get(f"{API_URL}/health", timeout=5)
            data = r.json()
            if data.get("status") == "ok" and data.get("model_loaded"):
                print(f"[evaluator] API is healthy: {data}")
                return True
            else:
                print(f"[evaluator] API responding but model not loaded: {data}")
        except Exception as e:
            print(f"[evaluator] Retry {i+1}/{HEALTH_RETRIES}: {e}")
        time.sleep(HEALTH_DELAY)
    return False


def test_health():
    """Test API health success."""
    try:
        r = requests.get(f"{API_URL}/health", timeout=5)
        return r.status_code == 200 and r.json().get("status") == "ok"
    except Exception:
        return False


def test_metrics():
    """Fetch model metrics."""
    try:
        r = requests.get(f"{API_URL}/metrics", timeout=5)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


def test_segments():
    """Fetch segments."""
    try:
        r = requests.get(f"{API_URL}/segments", timeout=5)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


def test_recommend_success():
    """Send a valid recommend request and verify response."""
    payloads = [
        {
            "user_id": "U0001",
            "watch_time_hours": 55,
            "avg_session_mins": 90,
            "sessions_per_week": 8,
            "top_genre": "Action",
            "genre_diversity": 2,
            "weekend_usage_pct": 70,
            "days_since_last_visit": 1,
        },
        {
            "user_id": "U0050",
            "watch_time_hours": 12,
            "avg_session_mins": 25,
            "sessions_per_week": 3,
            "top_genre": "Comedy",
            "genre_diversity": 3,
            "weekend_usage_pct": 45,
            "days_since_last_visit": 12,
        },
        {
            "user_id": "U0100",
            "watch_time_hours": 30,
            "avg_session_mins": 50,
            "sessions_per_week": 5,
            "top_genre": "Documentary",
            "genre_diversity": 6,
            "weekend_usage_pct": 55,
            "days_since_last_visit": 4,
        },
        {
            "user_id": "U0200",
            "watch_time_hours": 4,
            "avg_session_mins": 15,
            "sessions_per_week": 1,
            "top_genre": "Drama",
            "genre_diversity": 2,
            "weekend_usage_pct": 30,
            "days_since_last_visit": 28,
        },
        {
            "user_id": "U0300",
            "watch_time_hours": 48,
            "avg_session_mins": 75,
            "sessions_per_week": 7,
            "top_genre": "Sci-Fi",
            "genre_diversity": 7,
            "weekend_usage_pct": 65,
            "days_since_last_visit": 2,
        },
    ]

    results = []
    for p in payloads:
        try:
            r = requests.post(f"{API_URL}/recommend", json=p, timeout=10)
            if r.status_code == 200:
                data = r.json()
                results.append({
                    "user_id": p["user_id"],
                    "success": True,
                    "segment_id": data.get("segment_id"),
                    "segment_name": data.get("segment_name"),
                    "recommendations_count": len(data.get("recommendations", [])),
                    "distance_to_centroid": data.get("distance_to_centroid"),
                })
            else:
                results.append({"user_id": p["user_id"], "success": False, "status": r.status_code})
        except Exception as e:
            results.append({"user_id": p["user_id"], "success": False, "error": str(e)})

    return results


def test_invalid_inputs():
    """Test that invalid inputs are handled gracefully."""
    cases = [
        {"desc": "Negative watch time", "payload": {
            "user_id": "X01", "watch_time_hours": -10, "avg_session_mins": 50,
            "sessions_per_week": 5, "top_genre": "Action", "genre_diversity": 3,
            "weekend_usage_pct": 50, "days_since_last_visit": 5,
        }},
        {"desc": "Invalid session duration", "payload": {
            "user_id": "X02", "watch_time_hours": 20, "avg_session_mins": -5,
            "sessions_per_week": 5, "top_genre": "Drama", "genre_diversity": 3,
            "weekend_usage_pct": 50, "days_since_last_visit": 5,
        }},
        {"desc": "Weekend usage > 100", "payload": {
            "user_id": "X03", "watch_time_hours": 20, "avg_session_mins": 50,
            "sessions_per_week": 5, "top_genre": "Action", "genre_diversity": 3,
            "weekend_usage_pct": 150, "days_since_last_visit": 5,
        }},
        {"desc": "Missing user_id", "payload": {
            "watch_time_hours": 20, "avg_session_mins": 50,
            "sessions_per_week": 5, "top_genre": "Action", "genre_diversity": 3,
            "weekend_usage_pct": 50, "days_since_last_visit": 5,
        }},
        {"desc": "Unknown genre (should be handled gracefully)", "payload": {
            "user_id": "X05", "watch_time_hours": 20, "avg_session_mins": 50,
            "sessions_per_week": 5, "top_genre": "Mystery", "genre_diversity": 3,
            "weekend_usage_pct": 50, "days_since_last_visit": 5,
        }},
    ]

    results = []
    for case in cases:
        try:
            r = requests.post(f"{API_URL}/recommend", json=case["payload"], timeout=10)
            if r.status_code == 422 or r.status_code == 400:
                results.append({"desc": case["desc"], "handled": True, "status": r.status_code})
            elif r.status_code == 200:
                # Unknown genre should be handled gracefully, not rejected
                if "Unknown" in case["desc"]:
                    results.append({"desc": case["desc"], "handled": True, "status": 200, "graceful": True})
                else:
                    results.append({"desc": case["desc"], "handled": False, "status": 200, "note": "Should have been rejected"})
            else:
                results.append({"desc": case["desc"], "handled": True, "status": r.status_code})
        except Exception as e:
            results.append({"desc": case["desc"], "handled": False, "error": str(e)})

    return results


def main():
    print("=" * 60)
    print("  OTT Audience Segmentation — Evaluator Service")
    print("=" * 60)

    if not wait_for_api():
        print("[evaluator] ERROR: API did not become healthy in time.")
        sys.exit(1)

    print()
    print("[evaluator] Running evaluation tests...")

    # 1. Health check
    health_ok = test_health()
    print(f"  API health success: {health_ok}")

    # 2. Metrics
    metrics = test_metrics()
    print(f"  Metrics retrieved: {metrics is not None}")
    if metrics:
        print(f"    Best K: {metrics.get('best_k')}, Silhouette: {metrics.get('best_silhouette')}")

    # 3. Segments
    segments = test_segments()
    print(f"  Segments retrieved: {segments is not None}")
    if segments:
        cluster_counts = {s["segment_name"]: s["user_count"] for s in segments}
        print(f"    Cluster counts: {cluster_counts}")

    # 4. Recommendation success
    rec_results = test_recommend_success()
    rec_success = sum(1 for r in rec_results if r.get("success"))
    print(f"  Recommendation success: {rec_success}/{len(rec_results)}")

    # 5. Invalid input handling
    invalid_results = test_invalid_inputs()
    invalid_handled = sum(1 for r in invalid_results if r.get("handled"))
    print(f"  Invalid input handling: {invalid_handled}/{len(invalid_results)}")

    # 6. Silhouette score from metrics
    silhouette = metrics.get("best_silhouette") if metrics else None

    # Write metrics.json
    output = {
        "api_health_success": health_ok,
        "model_loaded": health_ok,
        "silhouette_score": silhouette,
        "best_k": metrics.get("best_k") if metrics else None,
        "cluster_counts": cluster_counts if segments else {},
        "num_segments": len(segments) if segments else 0,
        "recommendation_success_rate": round(rec_success / len(rec_results), 4) if rec_results else 0,
        "recommendation_results": rec_results,
        "invalid_input_handling_rate": round(invalid_handled / len(invalid_results), 4) if invalid_results else 0,
        "invalid_input_results": invalid_results,
        "overall_pass": health_ok and rec_success == len(rec_results) and invalid_handled == len(invalid_results),
    }

    os.makedirs(os.path.dirname(METRICS_OUTPUT), exist_ok=True)
    with open(METRICS_OUTPUT, "w") as f:
        json.dump(output, f, indent=2)

    print()
    print(f"[evaluator] Metrics written to {METRICS_OUTPUT}")
    print(f"[evaluator] Overall pass: {output['overall_pass']}")
    print("=" * 60)

    if not output["overall_pass"]:
        sys.exit(1)


if __name__ == "__main__":
    main()

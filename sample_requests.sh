#!/bin/bash
# Sample API requests for OTT Audience Intelligence
# Run after: docker compose up --build

BASE_URL="http://localhost:8000"

echo "=========================================="
echo "  OTT Audience Intelligence — API Demos"
echo "=========================================="
echo ""

echo "1. GET /health"
echo "   Checking service health..."
curl -s "$BASE_URL/health" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/health"
echo ""
echo ""

echo "2. POST /recommend — High-Engagement Action Viewer"
curl -s -X POST "$BASE_URL/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "U0001",
    "watch_time_hours": 55,
    "avg_session_mins": 90,
    "sessions_per_week": 8,
    "top_genre": "Action",
    "genre_diversity": 2,
    "weekend_usage_pct": 70,
    "days_since_last_visit": 1
  }' | python3 -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL/recommend" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"U0001","watch_time_hours":55,"avg_session_mins":90,"sessions_per_week":8,"top_genre":"Action","genre_diversity":2,"weekend_usage_pct":70,"days_since_last_visit":1}'
echo ""
echo ""

echo "3. POST /recommend — Casual Short-Session Viewer"
curl -s -X POST "$BASE_URL/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "U0050",
    "watch_time_hours": 12,
    "avg_session_mins": 25,
    "sessions_per_week": 3,
    "top_genre": "Comedy",
    "genre_diversity": 3,
    "weekend_usage_pct": 45,
    "days_since_last_visit": 12
  }' | python3 -m json.tool 2>/dev/null || echo "(raw output shown above)"
echo ""
echo ""

echo "4. POST /recommend — Genre Explorer"
curl -s -X POST "$BASE_URL/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "U0100",
    "watch_time_hours": 30,
    "avg_session_mins": 50,
    "sessions_per_week": 5,
    "top_genre": "Documentary",
    "genre_diversity": 6,
    "weekend_usage_pct": 55,
    "days_since_last_visit": 4
  }' | python3 -m json.tool 2>/dev/null || echo "(raw output shown above)"
echo ""
echo ""

echo "5. POST /recommend — Low-Activity Viewer"
curl -s -X POST "$BASE_URL/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "U0200",
    "watch_time_hours": 4,
    "avg_session_mins": 15,
    "sessions_per_week": 1,
    "top_genre": "Drama",
    "genre_diversity": 2,
    "weekend_usage_pct": 30,
    "days_since_last_visit": 28
  }' | python3 -m json.tool 2>/dev/null || echo "(raw output shown above)"
echo ""
echo ""

echo "6. POST /recommend — Invalid input (negative watch time, should be rejected)"
curl -s -X POST "$BASE_URL/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "X001",
    "watch_time_hours": -10,
    "avg_session_mins": 50,
    "sessions_per_week": 5,
    "top_genre": "Action",
    "genre_diversity": 3,
    "weekend_usage_pct": 50,
    "days_since_last_visit": 5
  }' | python3 -m json.tool 2>/dev/null || echo "(rejected as expected)"
echo ""
echo ""

echo "7. POST /recommend — Unknown genre (should be handled gracefully)"
curl -s -X POST "$BASE_URL/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "X002",
    "watch_time_hours": 25,
    "avg_session_mins": 55,
    "sessions_per_week": 4,
    "top_genre": "Mystery",
    "genre_diversity": 4,
    "weekend_usage_pct": 50,
    "days_since_last_visit": 6
  }' | python3 -m json.tool 2>/dev/null || echo "(handled gracefully)"
echo ""
echo ""

echo "8. GET /segments"
curl -s "$BASE_URL/segments" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/segments"
echo ""
echo ""

echo "9. GET /metrics"
curl -s "$BASE_URL/metrics" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/metrics"
echo ""
echo ""

echo "10. GET /dashboard-stats"
curl -s "$BASE_URL/dashboard-stats" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/dashboard-stats"
echo ""
echo ""

echo "=========================================="
echo "  Done. Dashboard: http://localhost:3000"
echo "=========================================="

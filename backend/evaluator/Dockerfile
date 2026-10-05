FROM python:3.11-slim

WORKDIR /app

COPY evaluator/requirements.txt ./evaluator/requirements.txt
RUN pip install --no-cache-dir -r evaluator/requirements.txt

COPY shared/ /app/shared/
COPY evaluator/ /app/evaluator/

ENV PYTHONPATH=/app
ENV API_URL=http://api:8000
ENV METRICS_OUTPUT=/app/metrics.json

CMD ["python", "evaluator/evaluate.py"]

FROM python:3.11-slim

WORKDIR /app

COPY shared/requirements.txt ./shared/requirements.txt
COPY api/requirements.txt ./api/requirements.txt
RUN pip install --no-cache-dir -r shared/requirements.txt -r api/requirements.txt

COPY shared/ /app/shared/
COPY api/ /app/api/

ENV DATA_DIR=/app/data
ENV MODELS_DIR=/app/models
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

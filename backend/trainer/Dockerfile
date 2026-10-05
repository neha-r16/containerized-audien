FROM python:3.11-slim

WORKDIR /app

COPY shared/requirements.txt ./shared/requirements.txt
COPY trainer/requirements.txt ./trainer/requirements.txt
RUN pip install --no-cache-dir -r shared/requirements.txt -r trainer/requirements.txt

COPY shared/ /app/shared/
COPY trainer/ /app/trainer/

ENV DATA_DIR=/app/data
ENV MODELS_DIR=/app/models
ENV PYTHONPATH=/app

RUN mkdir -p /app/data /app/models

CMD ["python", "trainer/train.py"]
